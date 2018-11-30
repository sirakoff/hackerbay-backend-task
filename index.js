const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const expressJWT = require('express-jwt');
const morgan = require('morgan');
const jsonpatch = require('jsonpatch');
const sharp = require('sharp');
const https = require('https');
const http = require('http');
const fs = require('fs');
const log = require('./log');

const app = express();
const isURL = (str) => {

	const urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
	const url = new RegExp(urlRegex, 'i');
	return str.length < 2083 && url.test(str);

};

app.use(morgan('tiny'));
app.use(bodyParser.json());

let { JWT_SECRET = '' } = process.env;
const { PORT = '' } = process.env;

if (!JWT_SECRET && fs.existsSync('/run/secrets/JWT_SECRET')) {

	JWT_SECRET = fs.readFileSync('/run/secrets/JWT_SECRET');

}

sharp.cache(false);

app.disable('x-powered-by');

app.post('/login', (req, res) => {

	const { username, password } = req.body;

	if (!username || !password) {

		return res.status(400).json({
			message: 'Username and password fields are required'
		});

	}

	return res.json({
		token: jwt.sign({ username }, JWT_SECRET, {
			expiresIn: '5h'
		})
	});

});

app.post('/patch', expressJWT({ secret: JWT_SECRET }), (req, res) => {

	if (!req.user) return res.status(401).json({});

	const { patch, doc } = req.body;

	if (!patch || !doc) {

		return res.status(400).json({
			message: '`patch` & `doc` fields are required.'
		});

	}

	try {

		return res.json({
			doc: jsonpatch.apply_patch(doc, patch)
		});

		// eslint-disable-next-line keyword-spacing
	} catch(e) {

		// console.log(e);

		return res.status(400).json({
			message: e.message
		});

	}


});

app.get('/thumbnail', expressJWT({ secret: JWT_SECRET }), (req, res, next) => {

	if (!req.user) return res.status(401).json({});

	const { url } = req.query;

	if (!url || !isURL(url)) {

		return res.status(400).json({
			message: '`url` is a required parameter and must be valid'
		});

	}

	return ((/^https/.test(url)) ? https : http).get(url, (stream) => {

		const { statusCode } = res;

		if (statusCode !== 200) {
			const error = new Error(`Request Failed.\n Status Code: ${statusCode}`);

			return next(error);

		}

		const resize = sharp().resize({
			// fit: "inside",
			width: 50,
			height: 50
		});

		res.set('Cache-Control', 'max-age=360');
		res.set('Expires', new Date(Date.now() + (360 * 1000)).toUTCString());
		res.set('Content-Type', stream.headers['content-type']);
		res.set('Accept-Ranges', 'bytes');

		stream.on('error', (err) => {

			if (global.gc) global.gc();

			next(err);

		});

		resize.on('info', (info) => {

			res.set('Content-Length', info.size);

		});

		resize.on('end', () => {

			if (global.gc) global.gc();

		});

		stream.on('timeout', () => {

			if (global.gc) global.gc();

			res.status(504).end();

		});

		resize.on('error', (err) => {

			if (global.gc) global.gc();

			next(err);

		});

		res.on('error', (err) => {

			next(err);

		});

		return stream.pipe(resize).pipe(res);

	}).on('error', (err) => {

		log.error(err);

		next(err);

	});

});

app.use('*', (req, res) => {

	res.status(404);

	return res.json({});

});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {

	log.error(err);

	if (err.name === 'UnauthorizedError') return res.status(401).json({});

	res.status(500);

	return res.json({
		error: true
	});

});


app.listen(PORT, () => {

	log.info(`Hackerbay Backend Task started on 0.0.0.0:${PORT}`);

});

module.exports = app;
