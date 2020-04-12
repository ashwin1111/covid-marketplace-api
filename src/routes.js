var express = require('express');
var app = express();

const cors = require('cors');
app.use(cors());

app.get('/', (req, res) => {
    res.send('Welcome to COVID-19 Marketplace')
})

app.use('/auth', require('./auth/authController'));

app.use('/admin', require('./admin/adminController'));

module.exports = app;