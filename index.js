require('dotenv').config();

const express = require('express');
const multer = require('multer');

const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.DATA_FILE;
const UPLOAD_CREDENTIALS = Buffer.from(`${process.env.UPLOAD_USER}:${process.env.UPLOAD_PASS}`).toString('base64');

const app = express();
app.set('view engine', 'pug');

app.use('/assets', express.static(path.join(__dirname, 'public', 'assets'), {fallthrough: false}));

app.use('/upload', (req, res, next) => {
	const authHeader = req.get('Authorization');
	if (authHeader && authHeader === `Basic ${UPLOAD_CREDENTIALS}`) {
		next();
		return;
	}
	res.set('WWW-Authenticate', 'Basic realm="Data Upload", charset="UTF-8"').sendStatus(401);
});

app.use('/upload', multer({storage: multer.memoryStorage()}).single('datafile'));

app.get('/robots.txt', (req, res) => {
	res.contentType('txt').send('User-agent: *\nDisallow: /');
});

app.get('/upload', (req, res) => {
	res.render('upload', {});
});

app.post('/upload', (req, res) => {
	let success = true;
	let error = '';
	try {
		JSON.parse(req.file.buffer.toString());
	} catch (err) {
		success = false;
		error = 'Not a valid JSON file';
		res.render('upload', {success, error});
		return;
	}
	fs.writeFile(path.join(__dirname, 'data', DATA_FILE), req.file.buffer, (err) => {
		if (err) {
			success = false;
			error = err;
		}
		res.render('upload', {success, error});
	});
});

app.get('/', (req, res) => {
	fs.readFile(path.join(__dirname, 'data', DATA_FILE), 'utf8', (err, dataStr) => {
		if (err) {
			res.status(500).contentType('txt').send(err.message);
			return;
		}
		try {
			const dataJson = JSON.parse(dataStr);
			res.render('index', dataJson);
		} catch (err2) {
			res.status(500).contentType('txt').send(err2.message);
		}
	});
});

app.listen(process.env.PORT, () => {
	console.log(`Listening on port ${process.env.PORT}`);
});
