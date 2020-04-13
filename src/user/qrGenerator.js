const fs = require('fs');
const qrcode = require('qrcode');

var uploadToS3 = require('./uploadS3');

function qr(filename, filecontents, res) {
    run().catch(error => {
        console.error(error)
        return res.status(403).send({
            msg: 'Internal Error'
        });
    });

    async function run() {
        const img = await qrcode.toDataURL(filecontents);
        var data = img.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFile('src/user/tempImages/' + filename + '.png', data, 'base64', function (err) {
            if (err) {
                console.log(err);
                return res.status(403).send({
                    msg: 'Internal Error'
                });
            } else {
                uploadToS3(filename, res);
            }
        });
    }
}

module.exports = qr;