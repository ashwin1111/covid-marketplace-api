const dotenv = require('dotenv')
dotenv.config()

var app = require('./src/routes');

var port = process.env.PORT || 3333;

app.listen(port, () => {
    console.log('URL Shortner is listening on port ' + port);
});