var AWS = require('aws-sdk');
var fs = require('fs');
AWS.config.update({ accessKeyId: process.env.awsAccessKeyId, secretAccessKey: process.env.awsSecretAccessKey });
var s3 = new AWS.S3();

function aws(filename, res) {
    fs.readFile('src/user/tempImages/' + filename + '.png', function (err, data) {
        if (err) {
            console.log('err in retreaving file for uploading in s3', err);
            return res.status(403).send({
                msg: 'Internal Error'
            });
        } else {
            params = { Bucket: process.env.awsBucketName, Key: filename, Body: data };
            s3.upload(params, function (err, data) {
                if (err) {
                    console.log("Error in uploading to s3 ", err);
                    return res.status(403).send({
                        msg: 'Internal Error'
                    });
                }

                if (data) {
                    console.log("Uploaded img to s3 location ", data.Location);
                    fs.unlinkSync('src/user/tempImages/' + filename + '.png');
                    return res.status(200).send({
                        file: filename,
                        msg: 'Slot booked successfully'
                    });
                }
            });
        }
    });
}

module.exports = aws;