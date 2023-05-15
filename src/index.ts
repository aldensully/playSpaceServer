import type { Request, Response } from 'express';
const express = require('express');
const cors = require('cors');
const app = express();
var path = require('path');
const fs = require('fs');
const ytdl = require('ytdl-core');
var ProgressBar = require('progress');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const stream = require('youtube-audio-stream');
const bodyParser = require('body-parser');


app.use(cors());
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true }));

//app.get('/', async (req:any, res:any) => {
//	 const bitRate = ffprobeSync('../assets/power_chords.mp3').format.bit_rate;
//	 const throttle = new Throttle(bitRate / 8);
//	 const yturl = req.body?.url ?? 'https://www.youtube.com/watch?v=5qap5aO4i9A';

//	    // const file = __dirname + '/power_chords.mp3';
//     fs.exists(file, (exists:any) => {
//         if (exists) {
//             const rstream = fs.createReadStream(file);
//             rstream.pipe(res);
//         } else {
//             res.send('Error - 404');
//             res.end();
//         }
//     });


//	const yturl = 'https://www.youtube.com/watch?v=MWdgShCMhks'
//	let start = Date.now();

//	   const stream = ytdl(yturl, {
//			quality: 'highestaudio'
//		})
//        ffmpeg(stream)
//            .audioBitrate(128)
//            // .save(`${__dirname}/${Math.floor(Math.random() * 100000)}.mp3`)
//            //.save("/audio.mp3")
//            .toFormat('mp3')
//            .pipe(res)
//			.on('progress', (chunkLength:any, downloaded:any, total:any) => {
//				const percent = downloaded / total;
//				const bar = new ProgressBar('  downloading [:bar] :percent :etas', {
//					complete: '=',
//					incomplete: ' ',
//					width: 20,
//					total: 1
//				});
//				bar.tick(percent);
//			})
//})
type Song = {
	url: string;
	title: string;
	artist: string;
	duration: number;
	thumbnailUri: string;
};

type StreamStoreType = {
	[key: string]: {
		id: string;
		name: string;
		queue: Song[];
		state: 'idle' | 'playing' | 'paused';
	};
};

const streams: StreamStoreType = {
	'1': {
		id: '1',
		name: 'space_1',
		state: 'idle',
		queue: []
	}
};

app.get('/spaces', (req: Request, res: Response) => {
	res.status(200).json({ spaces: Object.values(streams) });
});

app.get('/streaming/:filename', function (req: any, res: any) {
	const filename = req.params.filename;
	console.log('reading: ', filename);
	const file = fs.createReadStream(path.join(__dirname, 'streaming', filename));
	file.pipe(res);
});

app.get('/:spaceId/stream.m3u8', cors(), (req: any, res: any) => {
	const spaceId = req.params.spaceId;
	const filePath = path.join(__dirname, 'streaming', spaceId, 'stream.m3u8');
	console.log('getting file for: ', filePath);

	// Check if the file exists
	if (fs.existsSync(filePath)) {
		// Set the appropriate headers for audio streaming
		res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
		res.setHeader('Cache-Control', 'no-cache');

		// Read and stream the file
		const fileStream = fs.createReadStream(filePath);
		fileStream.pipe(res);
	} else {
		console.log('file not found: ', filePath);
		// File not found, return a 404 response
		res.sendStatus(404);
	}
});

app.post('/addSong', async (req: Request, res: Response) => {
	try {
		const { spaceId, songUrl } = req.body;

		if (!spaceId || !songUrl) {
			return res.status(400).json({ error: "Bad Request - spaceId and songUrl must be provided" });
		}

		const songInfo = await ytdl.getBasicInfo(songUrl);

		if (!songInfo || !songInfo.videoDetails) {
			return res.status(400).json({ error: "Bad Request - songUrl is not valid" });
		}
		const newSong = {
			title: songInfo.videoDetails.title,
			url: songUrl,
			artist: songInfo.videoDetails.author.name,
			duration: songInfo.videoDetails.lengthSeconds,
			thumbnailUri: songInfo.videoDetails.thumbnails[0].url
		};
		// await downloadStream(songUrl, spaceId);
		streams[spaceId].queue = [...streams[spaceId].queue, newSong];

		res.status(200).json({
			song: {
				title: songInfo.videoDetails.title,
				url: songUrl,
				artist: songInfo.videoDetails.author.name,
				duration: songInfo.videoDetails.lengthSeconds,
				thumbnailUri: songInfo.videoDetails.thumbnails[0].url
			}
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});


app.get('/:spaceId', (req: any, res: any) => {
	const spaceId = req.params.spaceId;
	if (!streams[spaceId]) {
		res.status(404).json({ error: 'space not found' });
	} else {
		res.status(200).json({ space: streams[spaceId] });
	}
});

app.get('/streams/:streamId', (req: any, res: any) => {
	const streamId = req.params.streamId;

});

function downloadStream(url: string, spaceId: string) {
	// const yturl = 'https://www.youtube.com/watch?v=KglxHuC-ToU';
	const baseUrl = 'http://localhost:3001/streaming/';
	const stream = ytdl(url, { audioFormat: 'mp3', quality: 'lowest' });

	var proc = ffmpeg(stream)
		.outputOptions([
			'-hls_time 10',
			'-f hls',
			`-hls_base_url ${baseUrl}${spaceId}/`
		])
		.output(`src/streaming/${spaceId}/stream.m3u8`)
		.on('start', () => console.log('streaming started'))
		.on('error', function (err: any) {
			console.log('an error happened: ' + err.message);
		})
		.on('progress', function (progress: any) {
			console.log('Processing: ' + JSON.stringify(progress) + '% done');
		})
		.on('end', () => console.log('HLS stream ended'))
		.run();
}

const clients = new Set();


// app.get('/', (async(req:Request, res:typeof express.Response) => {
// 	const url = 'https://www.youtube.com/watch?v=MWdgShCMhks'

//   try {
//     for await (const chunk of stream('https://www.youtube.com/watch?v=shWEfRlmb6g')) {
//       res.write(chunk)
//     }
//     res.end()
//   } catch (err) {
//     console.error(err)
//     if (!res.headersSent) {
//       res.writeHead(500)
//       res.end('internal system error')
//     }
//   }
// }))

app.get('/hello', (req: any, res: any) => {
	res.send('hello world');
});

app.listen(3001, () => { console.log('listening on port 3001'); })

