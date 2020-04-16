const dotenv = require('dotenv')
dotenv.config()

var app = require('./src/routes');

var port = process.env.PORT || 5555;

app.listen(port, () => {
    console.log('Covid-19 Marketplace is listening on port ' + port);
});