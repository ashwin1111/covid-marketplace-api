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

// user.get('/suma',async function (req, res){
//     for (var i=0;i<10;i++){
//         var id = await randomize('a0', 6);
//         id = 'cuid' + id;
//         console.log(id);
//     }
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
    const client = await pool().connect();
    await client.query("Select (m.customer_max_count-cu.count_on_slot) as possible_count from market_place_all_details as m left join count_updates as cu On m.market_place_id=cu.market_place_id where m.market_place_id=$1 AND cu.time_slot_id=$2;",[req.body.market_place_id,req.body.time_slot_id], function (err, result) {
        if (err) {
            console.log('err in retreaving possibility', err);
            return res.status(500).send({
                msg: 'Internal error / Bad payload'
            })
        } else {
            if (!result.rows[0]) {
                return res.status(404).send({
                    msg: "No Market-Place details found with the active status"
                })
            } else {
                if(result.rows[0].possible_count>0){
                    var id = await randomize('a0', 6);
                    id = 'cid' + id;
                    client.query(`INSERT INTO customer_cred (customer_id, customer_name, customer_email, customer_password, created_at, customer_phone, customer_aadhar_num, verified) 
                    VALUES ($1, $2, $3, $4, now(), $5, $6, '0')`, [id, req.body.name, req.body.email, pwd, req.body.phno, req.body.aadhar], function (err, result) {
                        if (err) {
                            console.log('err in registering user', err);
                            return res.status(500).send({
                                msg: 'Internal error / Bad payload'
                            })
                        } else {
                            // TODO: discuss add when necessary
                            // sendEmail(req.body.name, id, req.body.email);
                            return res.status(200).send({
                                msg: 'User registered successfully'
                            });
                        }
                    });
                    return res.status(200).send({
                        count: result.rows
                    });
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
});

module.exports = user;