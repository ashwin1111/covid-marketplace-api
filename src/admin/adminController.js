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

admin.post('/AdminLogin', async function (req, res) {
    if (!req.body.userid || !req.body.password ) {
        return res.status(403).send({
            msg: "Bad payload"
        });
    }
    const client = await pool().connect();
    await client.query('SELECT * FROM admin_cred WHERE admin_id = $1', [req.body.userid], function (err, result) {
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
                    email: result.rows[0].admin_name
                }, process.env.jwtSecret, {
                    expiresIn: 604800
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

admin.get('/get_time_slots',async function (req, res){
    const client = await pool().connect();
    await client.query("select time_slot_id,time_slot_range from time_slot;", function (err, result) {
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

// user.post('/AddMarketPlaces', jwtToken, async function (req, res) {
//     if (!req.body.market_palce_name || !req.body.market_place_address || !req.body.time_slot_ids || !req.body.customer_max_count || !req.body.active_check) {
//         return res.status(403).send({
//             msg: "Bad payload"
//         });
//     }
//     const client = await pool().connect();
//     await client.query("SELECT mpad.market_place_id,mpad.market_palce_name,mpad.market_place_address,(SELECT json_agg(json_build_object('id',t.time_slot_id,'time_slot_range', t.time_slot_range)) as time_slot_data from time_slot as t left join (select distinct regexp_split_to_table(m.time_slot_ids, E',') as time_id, m.market_place_id as market_place_id, m.customer_max_count as max_cus_count from market_place_all_details as m where m.market_place_id=mpad.market_place_id ) as st On st.time_id = t.time_slot_id left join count_updates as cu on cu.market_place_id=st.market_place_id AND cu.time_slot_id=st.time_id AND cu.count_on_slot < st.max_cus_count where st.time_id is NOT NULL AND cu.count_on_slot is NOT NULL) from market_place_all_details as mpad where mpad.active_check=$1;", ['1'], function (err, result) {
//         if (err) {
//             console.log('err in retreaving marketplaces', err);
//             return res.status(500).send({
//                 msg: 'Internal error / Bad payload'
//             })
//         } else {
//             if (!result.rows[0]) {
//                 return res.status(404).send({
//                     msg: "No Market-Place details found with the active status"
//                 })
//             } else {
//                 return res.status(200).send({
//                     marketPlaces: result.rows
//                 });
//             }
//         }
//     });
//     client.release();
// });


module.exports = admin;