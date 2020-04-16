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
    if ( !req.body.booking_id || !req.body.market_place_id || !req.body.date || !req.body.do_it){
        return res.status(403).send({
            msg: "Bad payload"
        });
    }
    const client = await pool().connect();
    await client.query(`select * from bookings where booking_id=$1 AND booking_market_place_id=$2;`,[req.body.booking_id,req.body.market_place_id] , async function (err, result) {
        if (err) {
            console.log('err in count updates', err);
            return res.status(500).send({
                msg: 'Internal error / Bad payload'
            })
        } else {
            // console.log("check",result);
            if (result.rowCount!=0){
                if(result.rows[0].on_date==req.body.date){
                    await client.query(`select exit_time from active_market_place_details where booking_id =$1;`,[req.body.booking_id] ,async function (err, result) {
                        if (err) {
                            console.log('err in retreaving marketplaces', err);
                            return res.status(500).send({
                                msg: 'Internal error / Bad payload'
                            })
                        } else {
                            if (!result.rows[0]) {
                                if(req.body.do_it=='in') {
                                var id = await randomize('a0', 6);
                                var activeid = 'ampdid' + id;
                                await client.query(`INSERT into active_market_place_details(active_market_place_details_id,booking_id,active_customer_id,active_market_palce_id,active_time_slot_id,entry_time,created_at)
                                select $1,booking_id,booking_customer_id,booking_market_place_id,booking_time_slot_id,now() as entry,now() as created_at from bookings where booking_id =$2;`,[activeid,req.body.booking_id], async function (err, result) {
                                    if (err) {
                                        console.log('err in count updates', err);
                                        return res.status(500).send({
                                            msg: 'Internal error / Bad payload'
                                        })
                                    } else {
                                       await client.query(`select count(*) from active_market_place_details where active_market_palce_id=(select booking_market_place_id from bookings where booking_id=$1) AND exit_time is NULL;`,[req.body.booking_id] , async function (err, result) {
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
                                }
                                else{
                                    console.log('err in invalid do_it', err);
                                    return res.status(500).send({
                                        msg: 'This customer is not even entered the market-place before.. please click the button correctly'
                                    });
                                }
                            } else {
                                if(result.rows[0].exit_time==null){
                                    if(req.body.do_it=='out'){
                                    await client.query(`Update active_market_place_details SET exit_time = now() where booking_id=$1;`,[req.body.booking_id] , async function (err, result) {
                                        if (err) {
                                            console.log('err in count updates', err);
                                            return res.status(500).send({
                                                msg: 'Internal error / Bad payload'
                                            })
                                        } else {
                                            // console.log("check1",result).rows; 
                                            await client.query(`select count(*) from active_market_place_details where active_market_palce_id=(select booking_market_place_id from bookings where booking_id=$1) AND exit_time is NULL;`,[req.body.booking_id] , async function (err, result) {
                                                if (err) {
                                                    console.log('err in count updates', err);
                                                    return res.status(500).send({
                                                        msg: 'Internal error / Bad payload'
                                                    })
                                                } else {
                                                    console.log("check",result.rows);
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
                                        console.log('err in invalid do_it', err);
                                        return res.status(500).send({
                                            msg: 'This customer is waiting for the exit.. please click the button correctly'
                                        });
                                    }
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
                }
                else{
                    return res.status(200).send({
                        msg: "Customer's booking is not valid for today, valid only on "+ result.rows[0].on_date
                    });
                }
            }
            else{
                console.log('err in booking_id and maket_id', err);
            return res.status(500).send({
                msg: 'Given details or wrong :('
            })
            }
            
        }
    });
    
    client.release();
});


module.exports = scan;
