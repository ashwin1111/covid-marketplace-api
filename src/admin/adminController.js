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

module.exports = admin;