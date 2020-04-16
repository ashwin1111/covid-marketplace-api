var express = require('express');
var admin = express.Router();

var bodyParser = require('body-parser');
admin.use(bodyParser.urlencoded({
    extended: false
}));
admin.use(bodyParser.json());


var jwt = require('jsonwebtoken');

var bcrypt = require('bcryptjs');

var randomize = require('randomatic');

const pool = require('../db/postgres');

var jwtToken = require('./ad_jwtToken');

admin.post('/AdminLogin', async function (req, res) {
    if (!req.body.userid || !req.body.password ) {
        return res.status(403).send({
            msg: "Bad payload"
        });
    }
    const client = await pool().connect();
    await client.query('SELECT * FROM admin_cred WHERE admin_id = $1', [req.body.userid], async function (err, result) {
        if (err) {
            console.log('err in login', err);
            return res.status(500).send({
                msg: 'Internal error / Bad payload'
            })
        } else {
            if (!result.rows[0]) {
                return res.status(404).send({
                    auth: false,
                    token: null,
                    msg: "No user found with the given creds"
                })
            } else {
                var encryptedPassword = result.rows[0].admin_password;
                var passwordIsValid = bcrypt.compareSync(req.body.password, encryptedPassword);
                if (!passwordIsValid) return res.status(404).send({
                    auth: false,
                    token: null,
                    msg: 'Invalid creds'
                });
    
                var token = jwt.sign({
                    id: result.rows[0].admin_id,
                    name: result.rows[0].admin_name
                }, process.env.jwtSecret, {
                    expiresIn: 172800
                });
    
                return res.status(200).send({
                    auth: true,
                    token: token,
                    msg: 'Login success :)'
                });
            }
        }
    });
    client.release();
    // var id = await randomize('a0', 6);
    // id = 'aid' + id;
    // console.log(id,await bcrypt.hashSync("covid-market-19", 8));

});

admin.get('/get_time_slots',jwtToken ,async function (req, res){
    const client = await pool().connect();
    await client.query("select time_slot_id,time_slot_range from time_slot;", async function (err, result) {
        if (err) {
            console.log('err in retreaving marketplaces', err);
            return res.status(500).send({
                msg: 'Internal error / Bad payload'
            })
        } else {
            if (!result.rows[0]) {
                return res.status(404).send({
                    msg: "No TimeSlots details found."
                })
            } else {
                return res.status(200).send({
                    TimeSlots: result.rows
                });
            }
        }
    });
    client.release();
});

admin.get('/ALL_MarketPlace_List',jwtToken ,async function (req, res){
    if ( !req.query.on_date){
        return res.status(403).send({
            msg: "Bad payload"
        });
    }
    else{
        const client = await pool().connect();
        await client.query(`SELECT mpad.market_place_id,mpad.market_palce_name,mpad.market_place_address,
                                (SELECT json_agg(json_build_object('id',t.time_slot_id,'time_slot_range', t.time_slot_range)) as time_slot 
                                    from time_slot as t 
                                    where t.time_slot_id IN (select regexp_split_to_table(time_slot_ids, E',') 
                                                            from market_place_all_details as m 
                                                            where m.market_place_id=mpad.market_place_id)) as time_data,mpad.customer_max_count,mpad.active_check
                            from market_place_all_details as mpad  where $1 = ANY (string_to_array(mpad.on_dates,','));`,[req.query.on_date], async function (err, result) {
            if (err) {
                console.log('err in retreaving marketplaces', err);
                return res.status(500).send({
                    msg: 'Internal error / Bad payload'
                })
            } else {
                if (!result.rows[0]) {
                    return res.status(404).send({
                        msg: "No MarketPalces Till now Added."
                    })
                } else {
                    return res.status(200).send({
                        TotalMarketPlaceList: result.rows
                    });
                }
            }
        });
    }
    client.release();
});

admin.post('/AddMarketPlaces', jwtToken, async function (req, res) {
    if (!req.body.market_palce_name || !req.body.market_place_address || !req.body.time_slot_ids || !req.body.customer_max_count || !req.body.active_check || !req.body.dates) {
        return res.status(403).send({
            msg: "Bad payload"
        });
    }
    // console.log(req.token.id);
    var id = await randomize('a0', 6);
    mid = 'mpadid' + id;
    const client = await pool().connect();
    await client.query("INSERT INTO market_place_all_details (market_place_id,market_palce_name,market_place_address,time_slot_ids,customer_max_count,active_check,created_at,on_dates) values($1,$2,$3,$4,$5,$6,now(),$7);", [mid,req.body.market_palce_name,req.body.market_place_address,req.body.time_slot_ids,req.body.customer_max_count,req.body.active_check,req.body.dates], async function (err, result) {
        if (err) {
            console.log('err in adding marketplace', err);
            return res.status(500).send({
                msg: 'Internal error / Bad payload'
            })
        } else {
            var time_ids = req.body.time_slot_ids;
            var id_arr = time_ids.split(',');
            var dates = req.body.dates;
            var date_arr = dates.split(',');
            var send = [];
            for (var i=0;i<(id_arr.length*date_arr.length);i++){
                var id = await randomize('a0', 6);
                id = 'cuid' + id;
                send.push(id);
                // console.log(i+1,id);
            }
            client.query(`SELECT inside.*,regexp_split_to_table(mo.time_slot_ids, E',') as time_slot_id 
            from market_place_all_details as mo,(Select m.market_place_id,regexp_split_to_table(m.on_dates, E',') as date,'0' as c,now() 
                                                from market_place_all_details as m 
                                                where m.market_place_id =$1) as inside
            where mo.market_place_id=$1;`, [mid], async function (err, result) {
                if (err){
                    console.log('err in select date x time', err);
                    return res.status(500).send({
                        msg: 'Internal error / Bad payload'
                    })
                }
                else{
                    if(result.rowCount==(id_arr.length*date_arr.length)){
                        for(var h=0;h<result.rowCount;h++){
                            client.query(`INSERT INTO count_updates (count_update_id,market_place_id,on_date,count_on_slot,created_at,time_slot_id) values($1,$2,$3,$4,$5,$6)`, [send[h],result.rows[h].market_place_id,result.rows[h].date,result.rows[h].c,result.rows[h].now,result.rows[h].time_slot_id], async function (err, result) {
                                if (err) {
                                    console.log('err in count updates', err);
                                    return res.status(500).send({
                                        msg: 'Internal error / Bad payload'
                                    })
                                } else {
                                    console.log("check",result);
                                    if (result.rowCount!=0){
                                        return res.status(200).send({
                                            msg: "Market-Place Added Successfully :)"
                                        });
                                    }
                                    
                                }
                            });
                        }
                    }
                }
            // console.log("send",send);
        });
        }
    });
    client.release();
});


module.exports = admin;