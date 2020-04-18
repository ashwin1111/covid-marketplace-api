var express = require('express');
var app = express();

const cors = require('cors');
app.use(cors());

app.get('/', (req, res) => {
    res.send('Welcome to COVID-19 Marketplace')
})

app.use('/auth', require('./auth/authController'));

app.use('/admin', require('./admin/adminController'));

app.use('/user', require('./user/userController'));

app.use('/scanner', require('./scanner/scanController'));

app.use('/analytics', require('./analytics/analyticsController'));

module.exports = app;