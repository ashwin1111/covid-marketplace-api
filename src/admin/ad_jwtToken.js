var jwt = require('jsonwebtoken');

const dotenv = require('dotenv')
dotenv.config()

function verifyToken(req, res, next) {
    var token = req.headers['x-access-token'];

    if (!token)
        return res.status(403).send({
            auth: false,
            token: null,
            message: 'No token provided.'
        });

    jwt.verify(token, process.env.jwtAdminSecret, function (err, decoded) {
        if (err && err.name === 'TokenExpiredError') {
            return res.status(200).send({
                auth: true,
                token: 'expired',
                message: 'Token Expired'
            });
        } else if (err) {
            console.log('Failed to authenticate token',err);
            return res.status(500).send({
                auth: false,
                token: null,
                message: 'Failed to authenticate token.'
            });
        }

        req.token = {
            id: decoded.id,
            name: decoded.name
        };

        next();
    });
}

module.exports = verifyToken;