var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);

var fs = require('fs');

var handlebars = require('handlebars');

const dotenv = require('dotenv')
dotenv.config()

function sendEmail(username, user_id, to_email) {
  console.log('username, user_id, to_email', username, user_id, to_email);
  readHTMLFile('src/auth/html/verify_email.html', function (err, html) {
    var template = handlebars.compile(html);
    var buttonUrl;
    if (process.env.PORT) {
      buttonUrl = process.env.api_url_heroku + '/auth/verify?id=' + user_id;
    } else {
      buttonUrl = process.env.api_url_local + '/auth/verify?id=' + user_id;
    }
    var replacements = {
      buttonUrl: buttonUrl,
      name: username
    };
    var htmlToSend = template(replacements);

    var request = sg.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
      body: {
        personalizations: [
          {
            to: [
              {
                email: to_email
              }
            ],
            subject: 'Please verify your email - URL Shortener'
          }
        ],
        from: {
          name: 'URL Shortener',
          email: 'owner@ashwin.engineer'
        },
        content: [
          {
            type: 'text/html',
            value: htmlToSend
          }
        ]
      }
    });

    sg.API(request)
      .then(function (response) {
        console.log('Email delivered to', to_email, ' Status Code: ', response.statusCode);
      })
      .catch(function (error) {
        console.log('Some error occured in sending email', error.response.statusCode);
      });
  });
}

var readHTMLFile = function (path, callback) {
  fs.readFile(path, {
    encoding: 'utf-8'
  }, function (err, html) {
    if (err) {
      throw err;
      callback(err);
    } else {
      callback(null, html);
    }
  });
};

module.exports = sendEmail;