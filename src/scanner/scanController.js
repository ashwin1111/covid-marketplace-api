var express = require('express');
var scan = express.Router();

var bodyParser = require('body-parser');
scan.use(bodyParser.urlencoded({
    extended: false
}));
scan.use(bodyParser.json());


var bcrypt = require('bcryptjs');

var randomize = require('randomatic');

const pool = require('../db/postgres');

scan.get('/get_scanner_markets' ,async function (req, res){
    if ( !req.query.on_date){
        return res.status(403).send({
            msg: "Bad payload"
        });
    }
    const client = await pool().connect();
    await client.query(`select  market_place_id,
                                market_palce_name, 
                                market_place_address 
                        from market_place_all_details 
                        where $1 = ANY (string_to_array(on_dates,',')) AND active_check='1';`,[req.query.on_date] ,async function (err, result) {
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
                    TimeSlots: result.rows
                });
            }
        }
    });
    client.release();
});

scan.post('/market_entry_exit' ,async function (req, res){
    if ( !req.body.booking_id){
        return res.status(403).send({
            msg: "Bad payload"
        });
    }
    const client = await pool().connect();
    await client.query(`select exit_time from active_market_place_details where booking_id =$1;`,[req.body.booking_id] ,async function (err, result) {
        if (err) {
            console.log('err in retreaving marketplaces', err);
            return res.status(500).send({
                msg: 'Internal error / Bad payload'
            })
        } else {
            if (!result.rows[0]) {
                var id = await randomize('a0', 6);
                var activeid = 'ampdid' + id;
                client.query(`INSERT into active_market_place_details(active_market_place_details_id,booking_id,active_customer_id,active_market_palce_id,active_time_slot_id,entry_time,created_at)
                select $1,booking_id,booking_customer_id,booking_market_place_id,booking_time_slot_id,now() as entry,now() as created_at from bookings where booking_id =$2;`,[activeid,req.body.booking_id], async function (err, result) {
                    if (err) {
                        console.log('err in count updates', err);
                        return res.status(500).send({
                            msg: 'Internal error / Bad payload'
                        })
                    } else {
                        client.query(`select active_market_palce_id,count(*) from active_market_place_details where active_market_palce_id=(select booking_market_place_id from bookings where booking_id=$1) AND exit_time is NULL group by active_market_palce_id;`,[req.body.booking_id] , async function (err, result) {
                            if (err) {
                                console.log('err in count updates', err);
                                return res.status(500).send({
                                    msg: 'Internal error / Bad payload'
                                })
                            } else {
                                // console.log("check",result);
                                if (result.rowCount!=0){
                                    return res.status(200).send({
                                        market_customer_count: result.rows[0].count,
                                        msg: "Customer Entry confirmed"
                                    });
                                }
                                
                            }
                        });
                        // console.log("check",result);
                    }
                });
            } else {
                if(result.rows[0].exit_time==null){
                    client.query(`Update active_market_place_details SET exit_time = now() where booking_id='bidp6yliv';`,[req.body.booking_id] , async function (err, result) {
                        if (err) {
                            console.log('err in count updates', err);
                            return res.status(500).send({
                                msg: 'Internal error / Bad payload'
                            })
                        } else {
                            // console.log("check",result);
                            client.query(`select active_market_palce_id,count(*) from active_market_place_details where active_market_palce_id=(select booking_market_place_id from bookings where booking_id=$1) AND exit_time is NULL group by active_market_palce_id;`,[req.body.booking_id] , async function (err, result) {
                                if (err) {
                                    console.log('err in count updates', err);
                                    return res.status(500).send({
                                        msg: 'Internal error / Bad payload'
                                    })
                                } else {
                                    // console.log("check",result);
                                    if (result.rowCount!=0){
                                        return res.status(200).send({
                                            market_customer_count: result.rows[0].count,
                                            msg: "Customer Exit confirmed"
                                        });
                                    }
                                    
                                }
                            });
                            
                        }
                    });
                }
                else{
                    console.log('err in count updates', err);
                    return res.status(500).send({
                        msg: 'Customer Already visited this market-place'
                    })
                }
                
            }
        }
    });
    client.release();
});


module.exports = scan;
