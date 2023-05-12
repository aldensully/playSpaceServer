const express = require('express')
const app = express()
const fs = require('fs');
// const Throttle = require('throttle');
// const { ffprobeSync } = require('@dropb/ffprobe');

// respond with "hello world" when a GET request is made to the homepage
app.get('/', (req:any, res:any) => {
	// const bitRate = ffprobeSync('../assets/power_chords.mp3').format.bit_rate;
	// const throttle = new Throttle(bitRate / 8);
	// const writables = [writable1];
    const file = __dirname + '/power_chords.mp3';
    fs.exists(file, (exists:any) => {
        if (exists) {
            const rstream = fs.createReadStream(file);
            rstream.pipe(res);
        } else {
            res.send('Error - 404');
            res.end();
        }
    });

	// res.send('hello world')
})

app.listen(3000)

