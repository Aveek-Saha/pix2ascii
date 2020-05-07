const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const Busboy = require('busboy');

const path = require('path');
const os = require('os');
const fs = require('fs');

const p2a = require('./img2ascii.js')

const app = express();

const runtimeOpts = {
    timeoutSeconds: 120
}

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));


app.post('/', (req, res) => {

    const busboy = new Busboy({ headers: req.headers, limits: { files: 1, fileSize: 5000000 } });
    const tmpdir = os.tmpdir();
    const fields = {};
    const uploads = {};

    busboy.on('field', (fieldname, val) => {
        // TODO(developer): Process submitted field values here
        // console.log(`Processed field ${fieldname}: ${val}.`);
        fields[fieldname] = val;
    });

    const fileWrites = [];

    // This code will process each file uploaded.
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        console.log(mimetype !== "image/png" || mimetype !== "image/jpeg" || mimetype !== "image/bmp");
        var width = parseInt(fields['width'])
        
        if ((mimetype !== "image/png" && mimetype !== "image/jpeg" && mimetype !== "image/bmp" )
            || (width < 100 || width > 500)){
            res.status(400).send("Bad request")
            return
        }
        const filepath = path.join(tmpdir, filename);
        uploads[fieldname] = filepath;

        const writeStream = fs.createWriteStream(filepath);
        file.pipe(writeStream);

        const promise = new Promise((resolve, reject) => {
            file.on('limit', (data) => {
                writeStream.end();
                res.status(413).send("Image too large, you can only upload files up to 5 Mb")
                return
            });
            file.on('end', () => {
                writeStream.end();
            });
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        }).catch((err) => {
            // console.log(err)
        });
        fileWrites.push(promise);
    });

    busboy.on('finish', async () => {
        await Promise.all(fileWrites);

        var art = []

        // TODO(developer): Process saved files here
        for (const file in uploads) {
            var ascii = await p2a.convert(uploads[file], parseInt(fields['width']), fields['charset'])
            art.push(ascii)
            fs.unlinkSync(uploads[file]);

        }
        res.send(art[0]);
    });

    busboy.end(req.rawBody);

});

// Expose Express API as a single Cloud Function:
exports.ascii = functions.runWith(runtimeOpts).https.onRequest(app);