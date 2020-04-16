var express = require('express');
var stat = express.Router();

var bodyParser = require('body-parser');
stat.use(bodyParser.urlencoded({
    extended: false
}));
stat.use(bodyParser.json());

const pool = require('../db/postgres');

stat.get('/get_date_counts', async function (req, res) {
    if (!req.query.on_date) {
        return res.status(403).send({
            msg: "Bad payload"
        });
    }

    const client = await pool().connect();
    await client.query(`Select  m.market_place_id,
                            m.market_palce_name,
                            m.market_place_address,
                            (Select json_agg(json_build_object('id',f.time_slot_id,'time_slot_range', f.time_slot_range))
                            from time_slot as f where f.time_slot_id in (SELECT regexp_split_to_table(m.time_slot_ids, E','))) as time_slot_data,
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
                                                    where $1 = ANY (string_to_array(on_dates,','))) ;`, [req.query.on_date], async function (err, result) {
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

module.exports = stat;