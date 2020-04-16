var express = require('express');
var user = express.Router();

var bodyParser = require('body-parser');
user.use(bodyParser.urlencoded({
    extended: false
}));
user.use(bodyParser.json());

var randomize = require('randomatic');

const pool = require('../db/postgres');

var jwtToken = require('../auth/jwtToken');
var generateQr = require('./qrGenerator');

// user.get('/suma',async function (req, res){
//     console.log("enter1");
//     var ids = 'mpidvhclme,mpidkv1mfa';
//     var id_arr = ids.split(',');
//     var dates = '2020-12-02,2020-12-03,2020-12-04,2020-12-05';
//     var date_arr = dates.split(',');
//     var send = [];
//     for (var i=0;i<id_arr.length*date_arr.length;i++){
//         var id = await randomize('a0', 6);
//         id = 'cuid' + id;
//         send.push(id);
//         console.log(i+1,id);
//     }
//     console.log(send.toString());
// });

user.get('/MarketPlaces', jwtToken, async function (req, res) {
    if ( !req.query.on_date){
        return res.status(403).send({
            msg: "Bad payload"
        });
    }
    const client = await pool().connect();
    await client.query(`SELECT  mpad.market_place_id,
                                mpad.market_palce_name,
                                mpad.market_place_address,
                                $2 as on_date,
                                (Select json_agg(json_build_object('id',f.time_slot_id,'time_slot_range', f.time_slot_range))
                                from (SELECT Distinct t.time_slot_id, t.time_slot_range,st.max_cus_count,cu.count_on_slot,cu.on_date
                                        from time_slot as t 
                                        left join   (select distinct regexp_split_to_table(m.time_slot_ids, E',') as time_id
                                                                ,m.market_place_id as market_place_id
                                                                ,m.customer_max_count as max_cus_count 
                                                from market_place_all_details as m 
                                                where m.market_place_id=mpad.market_place_id ) as st On st.time_id = t.time_slot_id 
                                        left join count_updates as cu on cu.market_place_id=st.market_place_id AND cu.time_slot_id=st.time_id AND cu.count_on_slot < st.max_cus_count 
                                        where st.time_id is NOT NULL AND cu.count_on_slot is NOT NULL) as f
                                        where f.on_date=$2)
                        from market_place_all_details as mpad 
                        where mpad.active_check=$1 and $2 = ANY (string_to_array(mpad.on_dates,','))`, ['1',req.query.on_date],async  function (err, result) {
        if (err) {
            console.log('err in retreaving marketplaces', err);
            return res.status(500).send({
                msg: 'Internal error / Bad payload'
            })
        } else {
            if (!result.rows[0]) {
                return res.status(200).send({
                    msg: "No Market-Place details found with the active status for that date"
                });
            } else {
                return res.status(200).send({
                    marketPlaces: result.rows
                });
            }
        }
    });
    client.release();
});

user.post('/book_slot', jwtToken, async function (req, res) {
    console.log(req.token.id);
    if (!req.body.market_place_id || !req.body.time_slot_id || !req.token.id || !req.body.on_date) {
        return res.status(403).send({
            msg: "Bad payload"
        });
    }
    var today = new Date();
    var today_date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    console.log(req.body.market_place_id,req.token.id,req.body.time_slot_id,today_date,req.body.on_date);
    const client = await pool().connect();
    await client.query("Select tab1.one as pre_booked,tab2.possible_count as remaining_slot from (select count(*) as one from bookings where booking_market_place_id=$1 AND booking_customer_id=$2 AND booking_time_slot_id=$3 AND on_date = $4) as tab1,(Select (m.customer_max_count-cu.count_on_slot) as possible_count from market_place_all_details as m left join count_updates as cu On m.market_place_id=cu.market_place_id where m.market_place_id=$1 AND cu.time_slot_id= $3 and cu.on_date=$4) as tab2;",[req.body.market_place_id,req.token.id,req.body.time_slot_id,req.body.on_date], async function (err, result) {
        if (err) {
            console.log('err in retreaving possibility', err);
            return res.status(500).send({
                msg: 'Internal error / Bad payload'
            })
        } else {
            // console.log(result.rows);
            if (!result.rows[0]) {
                return res.status(404).send({
                    msg: "Given Data is invalid"
                })
            } else {
                if(result.rows[0].remaining_slot > 0){
                    if (result.rows[0].pre_booked==0){
                        var id = await randomize('a0', 6);
                        id = 'bid' + id;
                        qr_code = id;
                        var digital = await randomize('0', 6);
                        client.query(`INSERT INTO bookings(booking_id,booking_customer_id,booking_market_place_id,booking_time_slot_id,qr_code,digit_code,active_check,created_at,on_date) values($1,$2,$3,$4,$5,$6,'1',now(),$7);`, [id, req.token.id, req.body.market_place_id, req.body.time_slot_id, qr_code,digital,req.body.on_date], async function (err, result) {
                            if (err) {
                                console.log('err in booking slot', err);
                                return res.status(500).send({
                                    msg: 'Internal error / Bad payload'
                                })
                            } else {
                                // TODO: discuss add when necessary
                                // sendEmail(req.body.name, id, req.body.email);
                                client.query(`Update count_updates SET count_on_slot = count_on_slot + 1 where market_place_id=$1 AND time_slot_id=$2 AND on_date=$3 AND count_on_slot < (select customer_max_count from market_place_all_details where market_place_id=$1 AND $3 = ANY (string_to_array(on_dates,',')));`, [req.body.market_place_id, req.body.time_slot_id,req.body.on_date], async function (err, result) {
                                    if(err){
                                        console.log('err in update count booking slot', err);
                                        return res.status(500).send({
                                            msg: 'Internal error / Bad payload'
                                        })
                                    }
                                    else{
                                    var qrData = {
                                        booking_id: id,
                                        customer_id: req.token.id,
                                        market_palce_id: req.body.market_place_id,
                                        aadhar: req.body.aadhar,
                                        time_slot: req.body.time_slot,
                                        on_date: req.body.on_date
                                    };
                                    await generateQr(id, digital, JSON.stringify(qrData), res);
                                }
                                });
                            }
                        });
                    }
                    else{
                        return res.status(200).send({
                            booking: false,
                            msg: 'Sorry you Already booked this slot for today :)'
                        });
                    }
                    // return res.status(200).send({
                    //     count: result.rows
                    // });
                }
                else{
                    return res.status(200).send({
                        booking: false,
                        msg: 'Time slot has Full please choose any other time slot :)'
                    });
                }
            }
        }
    });
    client.release();
});

user.get('/booking_history', jwtToken, async function (req, res) {
    const client = await pool().connect();
    await client.query(`select b.booking_id,
    market.market_data,
    b.booking_time_slot_id,
    (select time_slot_range from time_slot where time_slot_id=b.booking_time_slot_id),
    'https://testtest.s3.us-east-2.amazonaws.com/'|| qr_code  as file_name,
    b.digit_code,
    b.on_date,
    b.created_at
    from bookings as b
    left join (select market_place_id,json_build_object('name',market_palce_name,'address',market_place_address) as market_data ,on_dates from market_place_all_details)as market on market.market_place_id=b.booking_market_place_id 
    where b.booking_customer_id=$1 and b.active_check='1';`, [req.token.id], async function (err, result) {
        if (err) {
            console.log('err in retreaving marketplaces', err);
            return res.status(500).send({
                msg: 'Internal error / Bad payload'
            })
        } else {
            if (!result.rows[0]) {
                return res.status(404).send({
                    msg: "No Market-Place details found with the active status"
                })
            } else {
                return res.status(200).send({
                    marketPlaces: result.rows
                });
            }
        }
    });
    client.release();
});

module.exports = user;