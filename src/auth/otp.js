const dotenv = require('dotenv')
dotenv.config()

var accountSid = process.env.twilioAccountSid;
var authToken = process.env.twilioAuthToken;

const client = require('twilio')(accountSid, authToken, {
    lazyLoading: true
});

function otp (to_number, msg) {
    client.messages
    .create({
        body: msg,
        from: process.env.twilioFromNumber,
        to: '+91' + to_number
    }).then(message => {
        console.log('otp sent successfully to ' + to_number + ' - ' + message.status);
    }).catch(err => {
        console.log('err in sending otp', err);
    });
}

module.exports = otp;