var express = require('express');
var stat = express.Router();

var bodyParser = require('body-parser');
stat.use(bodyParser.urlencoded({
    extended: false
}));
stat.use(bodyParser.json());

const pool = require('../db/postgres');


stat.get('/get_date_counts' ,async function (req, res){
    if ( !req.query.on_date){
        return res.status(403).send({
            msg: "Bad payload"
        });
    }
    const client = await pool().connect();
    await client.query(`Select  m.market_place_id,
                            m.market_palce_name,
                            m.market_place_address,
                            (Select json_agg(json_build_object('id',f.time_slot_id,'time_slot_range', f.time_slot_range,'remaining_booking_count',m.customer_max_count-cu.count_on_slot))
                            from time_slot as f left join count_updates as cu ON cu.time_slot_id = f.time_slot_id where f.time_slot_id in (SELECT regexp_split_to_table(m.time_slot_ids, E',')) AND cu.market_place_id=m.market_place_id) as time_slot_data,
                            m.customer_max_count,
                            (select count(*) 
                            from active_market_place_details as a 
                            where a.active_market_palce_id=m.market_place_id AND a.exit_time is not null) as visited_people,
                            (select count(*) 
                            from active_market_place_details as a 
                            where a.active_market_palce_id=m.market_place_id AND a.exit_time is null) as present_people,
                            $1 as date  
                        from market_place_all_details as m 
                        where m.market_license_number IN (SELECT market_license_number 
                                                    from market_place_all_details 
                                                    where $1 = ANY (string_to_array(on_dates,','))) ;`,[req.query.on_date] ,async function (err, result) {
        if (err) {
            console.log('err in retreaving marketplaces', err);
            return res.status(500).send({
                msg: 'Internal error / Bad payload'
            })
        } else {
            if (!result.rows[0]) {
                return res.status(200).send({
                    msg: "No Market details found for Today"
                })
            } else {
                return res.status(200).send({
                    DateWise_data: result.rows
                });
            }
        }
    });
    client.release();
});


stat.get('/get_daily_counts' ,async function (req, res){
    if ( !req.query.on_date){
        return res.status(403).send({
            msg: "Bad payload"
        });
    }
    var startDate = new Date("2020-04-16"); //YYYY-MM-DD
    var endDate = new Date(req.query.on_date); //YYYY-MM-DD

    var getDateArray = function(start, end) {
        var arr = new Array();
        var dt = new Date(start);
        while (dt <= end) {
            var date=new Date(dt);
            var d = date.getDate();
            var m = date.getMonth() + 1;
            var y = date.getFullYear();

            var dateString =  y + '-' + (m <= 9 ? '0' + m : m) + '-' +(d <= 9 ? '0' + d : d);

            arr.push(dateString);
            dt.setDate(dt.getDate() + 1);
        }
        return arr;
    }
    var dateArr = getDateArray(startDate, endDate);
    console.log(dateArr.toString());
    const client = await pool().connect();
    await client.query(`select  count(b.*) as booked_count,
                                (select count(*) 
                                from active_market_place_details 
                                where booking_id IN     (select booking_id 
                                                        from bookings 
                                                        where on_date =b.on_date)) as visited_count,
                                b.on_date 
                        from bookings as b 
                        where b.on_date in (select regexp_split_to_table($1,E',')) 
                        group by b.on_date;`,[dateArr.toString()] ,async function (err, result) {
        if (err) {
            console.log('err in retreaving booking counts', err);
            return res.status(500).send({
                msg: 'Internal error / Bad payload'
            })
        } else {
            if (!result.rows[0]) {
                return res.status(200).send({
                    msg: "No Bookings till now"
                })
            } else {
                db_date=[]
                for (var i=0;i<result.rowCount;i++){
                    // console.log(result.rows[i].on_date,"e",dateArr.indexOf(result.rows[i].on_date));
                    db_date.push(result.rows[i].on_date);
                }
                console.log(db_date);
                var missing_date= dateArr.filter(x => db_date.indexOf(x) === -1);
                console.log("miss",missing_date);
                // var total_data = [];
                // total_data.push(result.rows);
                for (var h=0;h<missing_date.length;h++){
                    var form={
                        booked_count: "0",
                        visited_count: "0",
                        on_date: missing_date[h].toString()
                    };
                    result.rows.push(form);
                }
                return res.status(200).send({
                    Daily_data: result.rows
                });
            }
        }
    });
    client.release();
});




module.exports = stat;