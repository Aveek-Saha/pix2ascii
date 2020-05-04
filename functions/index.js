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
    timeoutSeconds: 300
}

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

app.get('/', (req, res) => {
    console.log("working");
    res.send("Works")
});


app.post('/', (req, res) => {

    const busboy = new Busboy({ headers: req.headers });
    const tmpdir = os.tmpdir();
    const fields = {};
    const uploads = {};

    busboy.on('field', (fieldname, val) => {
        // TODO(developer): Process submitted field values here
        console.log(`Processed field ${fieldname}: ${val}.`);
        fields[fieldname] = val;
    });

    const fileWrites = [];

    // This code will process each file uploaded.
    busboy.on('file', (fieldname, file, filename) => {
        console.log(`Processed file ${filename}`);
        const filepath = path.join(tmpdir, filename);
        uploads[fieldname] = filepath;

        const writeStream = fs.createWriteStream(filepath);
        file.pipe(writeStream);

        const promise = new Promise((resolve, reject) => {
            file.on('end', () => {
                writeStream.end();
            });
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
        fileWrites.push(promise);
    });

    busboy.on('finish', async () => {
        await Promise.all(fileWrites);

        var art = []

        // TODO(developer): Process saved files here
        for (const file in uploads) {
            var ascii = await p2a.convert(uploads[file], { height: 50, width: 100 }, 'gscale_70')
            art.push(ascii)
            
            fs.unlinkSync(uploads[file]);

        }
        res.send(art);
    });

    busboy.end(req.rawBody);

});

// Expose Express API as a single Cloud Function:
exports.widgets = functions.runWith(runtimeOpts).https.onRequest(app);