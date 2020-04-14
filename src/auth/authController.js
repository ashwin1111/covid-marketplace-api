
var express = require('express');
var router = express.Router();

var bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({
    extended: false
}));
router.use(bodyParser.json());

var jwt = require('jsonwebtoken');

var bcrypt = require('bcryptjs');

var validator = require('email-validator');

const dotenv = require('dotenv')
dotenv.config()

var randomize = require('randomatic');

const pool = require('../db/postgres');
var sendOtp = require('./otp');

router.post('/register', async function (req, res) {
    // TODO: check whether all are mandatory
    if (!req.body.name || !req.body.email || !req.body.password || !req.body.phno || !req.body.aadhar) {
        return res.status(403).send({
            msg: "Bad payload"
        });
    }

    if (!validator.validate(req.body.email)) {
        return res.status(404).send({
            auth: false,
            token: null,
            msg: "Email badly formatted"
        });
    }

    const client = await pool().connect();
    await client.query('SELECT customer_id FROM customer_cred WHERE customer_email=$1', [req.body.email], async function (err, result) {
        if (result.rows[0]) {
            return res.status(200).send({
                auth: false,
                token: null,
                msg: "Email already exists"
            });
        } else {
            var pwd = await bcrypt.hashSync(req.body.password, 8);
            var id = await randomize('a0', 6);
            var otp = await randomize('0', 6);
            id = 'cid' + id;
            client.query(`INSERT INTO customer_cred (customer_id, customer_name, customer_email, customer_password, created_at, customer_phone, customer_aadhar_num, verified, otp, expiry_time) 
            VALUES ($1, $2, $3, $4, now(), $5, $6, $7, $8, now() + INTERVAL '3 minute')`, [id, req.body.name, req.body.email, pwd, req.body.phno, req.body.aadhar, 'otp_pending', otp], function (err, result) {
                if (err) {
                    console.log('err in registering user', err);
                    return res.status(500).send({
                        msg: 'Internal error / Bad payload'
                    })
                } else {
                    // TODO: discuss add when necessary
                    // sendEmail(req.body.name, id, req.body.email);
                    let msg = '\nHi ' + req.body.name + ', please enter this 6 digit OTP ' + otp + ' in the application to get your account verified\n';
                    sendOtp(req.body.phno, msg);
                    return res.status(200).send({
                        msg: 'User registered successfully'
                    });
                }
            });
        }
    });
    client.release();
});

router.post('/login', async function (req, res) {
    if (req.body.email === '' || req.body.password === '') {
        return res.status(403).send({
            auth: false,
            token: null,
            msg: "Bad payload"
        });
    }

    const client = await pool().connect()
    await client.query('SELECT * FROM customer_cred WHERE customer_email = $1 or customer_phone = $1', [req.body.email], function (err, result) {
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
                var encryptedPassword = result.rows[0].customer_password;
                var passwordIsValid = bcrypt.compareSync(req.body.password, encryptedPassword);
                if (!passwordIsValid) return res.status(404).send({
                    auth: false,
                    token: null,
                    msg: 'Invalid creds'
                });

                if (result.rows[0].verified === 'verified') {
                    var token = jwt.sign({
                        id: result.rows[0].customer_id,
                        email: result.rows[0].customer_email
                    }, process.env.jwtSecret, {
                        expiresIn: 604800
                    });

                    var data = {
                        name: result.rows[0].customer_name,
                        phno: result.rows[0].customer_phone,
                        aadhar: result.rows[0].customer_aadhar_num
                    };

                    return res.status(200).send({
                        auth: true,
                        token: token,
                        msg: 'Login success :)',
                        data: data
                    });
                } else {
                    return res.status(404).send({
                        auth: false,
                        token: null,
                        msg: 'Account not verified'
                    });
                }
            }
        }
    });
    client.release();
});

// TODO: check on prod due to change in timezones
router.post('/verify', async function (req, res) {
    try {
        const phnno = req.body.phno;
        const otp = req.body.otp;
        const client = await pool().connect();
        await client.query('select * from customer_cred where customer_phone = $1 and otp = $2', [phnno, otp], async function (err, result) {
            if (err) {
                console.log('err in checking otp', err);
                return res.status(404).send({
                    msg: 'Internal error'
                });
            }

            if (result.rows[0]) {
                if (new Date(result.rows[0].expiry_time).toUTCString() > new Date().toUTCString()) {
                    console.log('not expired');
                    await client.query('update customer_cred set verified = $1 where customer_id = $2', ['verified', result.rows[0].customer_id], async function (err, result) {
                        if (err) {
                            console.log('err in updating user to verified', err);
                            return res.status(404).send({
                                msg: 'Internal error'
                            });
                        }
                        return res.status(200).send({
                            msg: 'User verified'
                        });
                    })
                } else {
                    console.log('otp expired');
                    return res.status(404).send({
                        msg: 'OTP expired'
                    });
                }
            } else {
                return res.status(404).send({
                    msg: 'Invalid OTP'
                });
            }
        });
        client.release();
    } catch (e) {
        throw (e)
    }
});

router.post('/resend_otp', async (req, res) => {
    async function incrementCount(phno) {
        const client = await pool().connect();
        await client.query(`update customer_cred set expiry_time = now() + INTERVAL '3 minute' where customer_phone = $1`, [phno], function (err, result) {
            if (err) {
                console.log(err);
            }
        });
        await client.query(`insert into resend_otp (phone_num, otp_requested_at) values ($1, now())`, [phno], function (err, result) {
            if (err) {
                console.log(err);
            }
        });
        client.release();
    }

    if (!req.body.phno) {
        return res.status(403).send({
            msg: "Bad Payload"
        });
    }

    const client = await pool().connect();
    await client.query('select * from customer_cred where customer_phone = $1 and verified = $2', [req.body.phno, 'otp_pending'], async function (err, result) {
        if (result.rows[0]) {
            await client.query('select phone_num, count(*) from resend_otp where phone_num=$1 group by phone_num', [req.body.phno], async function (err, result1) {
                if (result1.rows[0] && parseInt(result1.rows[0].count) > 5) {
                    return res.status(403).send({
                        msg: "Limit exceeded"
                    });
                } else {
                    let msg = '\nHi ' + req.body.name + ', please enter this 6 digit OTP ' + result.rows[0].otp + ' in the application to get your account verified\n';
                    sendOtp(req.body.phno, msg);
                    incrementCount(req.body.phno);
                    return res.status(403).send({
                        msg: "OTP sent successfully"
                    });
                }
            });
        }
    });
    client.release();

});

module.exports = router;