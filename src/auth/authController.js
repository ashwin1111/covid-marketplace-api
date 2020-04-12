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

const uuidv4 = require('uuid/v4');

const dotenv = require('dotenv')
dotenv.config()

var jwtToken = require('./jwtToken');
// var sendEmail = require('./verifyEmail');
// var forgotPassword = require('./forgotPasswordEmail');

const pool = require('../db/postgres');

router.post('/register', async function (req, res) {
    if (req.body.name === '' || req.body.email === '' || req.body.password === '') {
        return res.status(403).send({
            auth: false,
            token: null,
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
    await client.query('SELECT id FROM url_shortner_users WHERE "email"=$1', [req.body.email], async function (err, result) {
        if (result.rows[0]) {
            return res.status(403).send({
                auth: false,
                token: null,
                msg: "Email already exists"
            });
        } else {
            var id = await uuidv4();
            var pwd = await bcrypt.hashSync(req.body.password, 8);
            client.query('INSERT INTO url_shortner_users (id, name, email, "password", created_at) VALUES ($1, $2, $3, $4, now())', [id, req.body.name, req.body.email, pwd], function (err, result) {
                if (err) {
                    console.log('err in registering user', err);
                    return res.status(500).send({
                        auth: false,
                        token: null,
                        msg: 'Internal error / Bad payload'
                    })
                } else {
                    // TODO: discuss add when necessary
                    // sendEmail(req.body.name, id, req.body.email);
                    return res.status(200).send({
                        auth: true,
                        token: null,
                        msg: 'User registered successfully'
                    });
                }
            });
        }
    });
    client.release();
});

router.post('/login', async function (req, res) {
    if (req.body.name === '' || req.body.email === '' || req.body.password === '') {
        return res.status(403).send({
            auth: false,
            token: null,
            msg: "Bad payload"
        });
    }
    const client = await pool().connect()
    await client.query('SELECT * FROM url_shortner_users WHERE "email"=$1', [req.body.email], function (err, result) {
        if (!result.rows[0]) {
            return res.status(404).send({
                auth: false,
                token: null,
                msg: "No user found with the given email / password"
            })
        } else {
            var encryptedPassword = result.rows[0].password;
            var passwordIsValid = bcrypt.compareSync(req.body.password, encryptedPassword);
            if (!passwordIsValid) return res.status(404).send({
                auth: false,
                token: null,
                msg: 'Email / Password is wrong'
            });

            if (result.rows[0].verified === true) {
                var token = jwt.sign({
                    id: result.rows[0].id,
                    email: req.body.email
                }, process.env.jwtSecret, {
                    expiresIn: 604800
                });

                return res.status(200).send({
                    auth: true,
                    token: token,
                    msg: 'Login success :)'
                });
            } else {
                return res.status(404).send({
                    auth: false,
                    token: null,
                    msg: 'Account not verified'
                });
            }
        }
    });
    client.release();
});

router.get('/verify', async function (req, res, next) {
    try {
        const id = req.query.id;
        const client = await pool().connect()
        await client.query('SELECT id FROM url_shortner_users WHERE id=$1', [id], async function (err, result) {
            if (result.rows[0] && id === result.rows[0].id) {
                await client.query('update url_shortner_users set verified = true where id=$1', [id], async function (err, result) {
                    res.redirect('https://app.urlll.xyz/verified');
                })
            } else {
                return res.status(404).send(
                    'No user for the given id'
                );
            }
        });
        client.release();
    } catch (e) {
        throw (e)
    }
});

// TODO: To be added in later releases

// router.post('/forgot_password', async function (req, res) {
//     if (req.body.email === '') {
//         return res.status(403).send({
//             auth: false,
//             token: null,
//             msg: "Bad payload"
//         });
//     }

//     if (!validator.validate(req.body.email)) {
//         return res.status(404).send({
//             auth: false,
//             token: null,
//             msg: "Email badly formatted"
//         });
//     }

//     const client = await pool().connect();
//     await client.query('SELECT * FROM url_shortner_users WHERE "email"=$1', [req.body.email], async function (err, result) {
//         if (result.rows[0]) {
//             var token = await jwt.sign({
//                 id: result.rows[0].id,
//                 email: result.rows[0].email
//             }, process.env.jwtSecret, {
//                 expiresIn: 3600
//             });
//             forgotPassword(result.rows[0].name, token, result.rows[0].email);
//             return res.status(403).send({
//                 msg: "If we found an account associated with that email, we've sent password reset instructions"
//             });
//         }
//     });
// });

// router.get('/forgot_password/redirect', async function (req, res) {
//     if (req.query.token === '' || req.query.token === null || req.query.token === undefined) {
//         return res.status(403).send({
//             auth: false,
//             token: null,
//             msg: "Bad payload"
//         });
//     }

//     var id;
//     var email;

//     jwt.verify(req.query.token, process.env.jwtSecret, function (err, decoded) {
//         if (err && err.name === 'TokenExpiredError') {
//             return res.status(200).send({
//                 auth: true,
//                 token: 'expired',
//                 message: 'Token Expired'
//             });
//         } else if (err) {
//             return res.status(500).send({
//                 auth: false,
//                 token: null,
//                 message: 'Failed to authenticate token.'
//             });
//         }

//         id = decoded.id;
//         email = decoded.email;
//     });

//     const client = await pool().connect();
//     await client.query('SELECT * FROM url_shortner_users WHERE "email"=$1 and id=$2', [email, id], async function (err, result) {
//         if (result.rows[0]) {
//             var token = await jwt.sign({
//                 id: result.rows[0].id,
//                 email: result.rows[0].email
//             }, process.env.jwtSecret, {
//                 expiresIn: 300
//             });
//             if (process.env.PORT) {
//                 return res.redirect("https://app.urlll.xyz" + "/reset-password?token="+token);
//             } else {
//                 return res.redirect("http://localhost:4200" + "/reset-password?token="+token);
//             }
//         } else {
//             return res.send("Internal Error");
//         }
//     });
// });

// router.post('/forgot_password/reset', jwtToken, async function (req, res) {
//     if (req.body.password === '') {
//         return res.status(403).send({
//             msg: "Bad payload"
//         });
//     }

//     var pwd = await bcrypt.hashSync(req.body.password, 8);
//     const client = await pool().connect();
//     await client.query('update url_shortner_users set password = $1 WHERE email = $2 and id = $3', [pwd, req.token.email, req.token.id], async function (err, result) {
//         if (err) {
//             console.log('error in pwd reset', err);
//             return res.status(403).send({
//                 msg: "Internal error"
//             });
//         } else {
//             if (result.rowCount === 1) {
//                 return res.status(403).send({
//                     msg: "Password updated successfully"
//                 });
//             }
//         }
//     });
// });

module.exports = router;