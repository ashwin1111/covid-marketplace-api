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
            id = 'cid' + id;
            client.query(`INSERT INTO customer_cred (customer_id, customer_name, customer_email, customer_password, created_at, customer_phone, customer_aadhar_num) 
            VALUES ($1, $2, $3, $4, now(), $5, $6)`, [id, req.body.name, req.body.email, pwd, req.body.phno, req.body.aadhar], function (err, result) {
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
    
                var token = jwt.sign({
                    id: result.rows[0].customer_id,
                    email: result.rows[0].customer_email
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
});

module.exports = router;