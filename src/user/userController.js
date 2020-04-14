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
//     var ids = 'mpidvhclme,mpidd2g6f8,mpidblijzd,mpidkv1mfa';
//     var id_arr = ids.split(',');
//     var send = [];
//     for (var i=0;i<id_arr.length;i++){
//         var id = await randomize('a0', 6);
//         id = 'cuid' + id;
//         send.push(id);
//         console.log(i+1,id);
//     }
//     console.log(send.toString());
// });

user.get('/MarketPlaces', jwtToken, async function (req, res) {
    const client = await pool().connect();
    await client.query("SELECT mpad.market_place_id,mpad.market_palce_name,mpad.market_place_address,(SELECT json_agg(json_build_object('id',t.time_slot_id,'time_slot_range', t.time_slot_range)) as time_slot_data from time_slot as t left join (select distinct regexp_split_to_table(m.time_slot_ids, E',') as time_id, m.market_place_id as market_place_id, m.customer_max_count as max_cus_count from market_place_all_details as m where m.market_place_id=mpad.market_place_id ) as st On st.time_id = t.time_slot_id left join count_updates as cu on cu.market_place_id=st.market_place_id AND cu.time_slot_id=st.time_id AND cu.count_on_slot < st.max_cus_count where st.time_id is NOT NULL AND cu.count_on_slot is NOT NULL) from market_place_all_details as mpad where mpad.active_check=$1;", ['1'], function (err, result) {
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

user.post('/book_slot', jwtToken, async function (req, res) {
    // console.log(req.token.id);
    if (!req.body.market_place_id || !req.body.time_slot_id || !req.token.id) {
        return res.status(403).send({
            msg: "Bad payload"
        });
    }
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const client = await pool().connect();
    await client.query("Select tab1.one as pre_booked,tab2.possible_count as remaining_slot from (select count(*) as one from bookings where booking_market_place_id=$1 AND booking_customer_id=$2 AND booking_time_slot_id=$3 AND created_at::date = $4) as tab1,(Select (m.customer_max_count-cu.count_on_slot) as possible_count from market_place_all_details as m left join count_updates as cu On m.market_place_id=cu.market_place_id where m.market_place_id=$1 AND cu.time_slot_id= $3) as tab2;",[req.body.market_place_id,req.token.id,req.body.time_slot_id,date], async function (err, result) {
        if (err) {
            console.log('err in retreaving possibility', err);
            return res.status(500).send({
                msg: 'Internal error / Bad payload'
            })
        } else {
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
                        client.query(`INSERT INTO bookings(booking_id,booking_customer_id,booking_market_place_id,booking_time_slot_id,qr_code,digital_code,active_check,created_at) values($1,$2,$3,$4,$5,$6,'1',now());`, [id, req.token.id, req.body.market_place_id, req.body.time_slot_id, qr_code,digital], async function (err, result) {
                            if (err) {
                                console.log('err in booking slot', err);
                                return res.status(500).send({
                                    msg: 'Internal error / Bad payload'
                                })
                            } else {
                                // TODO: discuss add when necessary
                                // sendEmail(req.body.name, id, req.body.email);
                                client.query(`Update count_updates SET count_on_slot = count_on_slot + 1 where market_place_id=$1 AND time_slot_id=$2 AND count_on_slot < (select customer_max_count from market_place_all_details where market_place_id=$1);`, [req.body.market_place_id, req.body.time_slot_id], async function (err, result) {
                                    var qrData = {
                                        booking_id: id,
                                        customer_id: req.token.id,
                                        market_palce_id: req.body.market_place_id,
                                        aadhar: req.body.aadhar,
                                        time_slot: req.body.time_slot
                                    };
                                    await generateQr(id, digital, JSON.stringify(qrData), res);
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
        client.release();
    });
});

module.exports = user;