var express = require('express');
var user = express.Router();

var bodyParser = require('body-parser');
user.use(bodyParser.urlencoded({
    extended: false
}));
user.use(bodyParser.json());


var jwt = require('jsonwebtoken');

var bcrypt = require('bcryptjs');

var randomize = require('randomatic');

const pool = require('../db/postgres');

// user.get('/suma',async function (req, res){
//     for (var i=0;i<2;i++){
//         var id = await randomize('a0', 6);
//         id = 'mpadid' + id;
//         console.log(id);
//     }
// });

user.get('/MarketPlaces', async function (req, res) {
    const client = await pool().connect();
    await client.query("SELECT mpad.market_place_id,mpad.market_palce_name,mpad.market_place_address,(SELECT string_agg(t.time_slot_range, ',') as time_slot_ranges from time_slot as t where t.time_slot_id IN (select regexp_split_to_table(time_slot_ids, E',') from market_place_all_details as m where m.market_place_id=mpad.market_place_id)) from market_place_all_details as mpad where mpad.active_check=$1;", ['1'], function (err, result) {
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
                    msg: "No Market-Place details found with the active status"
                })
            } else {
                console.log("1");
                var json=[]
                for(var j=0;j<result.rowCount;j++){
                    console.log(j,"1");
                    json.push(
                    {
                        MarketPlaceId: result.rows[j].market_place_id,
                        MarkwePlaceName:result.rows[j].market_palce_name,
                        MarketPlaceAddress: result.rows[j].market_place_address,
                        MarketPlaceTimeSlotRange:result.rows[j].time_slot_ranges
                    })
                }
                return res.status(200).send(json);
                // console.log(result.rowCount);
            }
        }
    });
    client.release();

});

module.exports = user;