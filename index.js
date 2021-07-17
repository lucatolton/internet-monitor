var fs = require('fs');
var speedtest = require('speedtest-net');
var moment = require('moment');
var pingHost = require('ping');
var packageJSON = require('./package.json');
var configExists = fs.existsSync('./config.json');
var express = require('express');
var app = express();
var morgan = require('morgan');
var db = require('./db.js');

console.log(moment().unix()); // 1576763732 - This will be stored in the database
console.log(moment.unix(moment().unix()).format('HH:mm'));

// Load config
var config;
if (configExists) {
	config = JSON.parse(fs.readFileSync('./config.json'));
} else {
	console.error('Unable to load configuration file');
	process.exit(1);
}

if (!config) {
	console.error('Config file could not be loaded into program');
	process.exit(1);
}

// Some configuration validation
if (config.pingEvery < 10000) {
	console.error('Minimum ping interval is 10000ms (10 seconds)');
	process.exit(1);
}

if (config.pingCount < 1) {
	console.error('Minimum ping count is 1');
	process.exit(1);
}

if (config.speedTestEvery < 120000) {
	console.error('Minimum speed test interval is 120000ms (2 minutes)');
	process.exit(1);
}

function millisToMinutesAndSeconds(millis) {
	var seconds = ((millis % 60000) / 1000).toFixed(0);
	return seconds;
}

// Logging

function log (t, m) {
	var time = moment().format('DD MMMM YYYY h:mm:ss a');
	console.log(`${time}: [${t}] ${m}`);
	try {
		fs.appendFileSync(config.logFile, `${time}: [${t}] ${m}\n`);
	} catch (err) {
		console.error('Failed to append to log file');
		console.error(err);
	}
}

log('INFO', `Internet Monitor by Luca Tolton | Running version ${packageJSON.version}`);
log('CONFIG', `Ping To: ${config.pingTo} | Ping Every: ${config.pingEvery}ms | Ping Count: ${config.pingCount} | Speed Test Every: ${config.speedTestEvery}ms | Log file: ${config.logFile}`);
if(!config.silent) {
	log('WARNING', `Silent mode is currently DISABLED, your console will be spammed with all web requests. To enable silent mode, set silent to true in the config.json file`);
}


// Ping

function ping(cb) {
	var host = config.pingTo;
	pingHost.promise.probe(host, { min_reply: config.pingCount }).then(function(res) {
		if (res.alive) {
			db.insertPingResults(res.avg, res.max, res.min);
			return cb(null, `Minimum: ${res.min} | Maximum: ${res.max} | Average: ${res.avg}`);
		} else {
			db.insertPingResults(0, 0, 0);
			return cb(`Unable to ping ${host}`, null);
		}
	});
}

function pingFn () {
	ping((err, data) => {
		if (err) return log('ERROR', err);
		log('PING', data);
	});
}

function speedTestFn() {
	testSpeed((err, result) => {
		if (err) {
			log('ERROR', err);
			return db.insertSpeedTestResults(0, 0);
		}
		log('SPEED TEST', `Ping: ${result.server.ping} | Download: ${result.speeds.download} | Upload : ${result.speeds.upload} | Client IP: ${result.client.ip} | Client ISP: ${result.client.isp} | Speed Test Server: ${result.server.host} | Speed Test Server Sponsor: ${result.server.sponsor} | Speed Test Location: ${result.server.location}, ${result.server.country} | Speed test done by speedtest.net using speedtest-net Node.JS module`);
		db.insertSpeedTestResults(result.speeds.download, result.speeds.upload);
	});
}

// Speed Test

function testSpeed (cb) {
	var test = speedtest();
	test.on('data', data => {
		//console.log(data);
		//console.log('The speed test has completed successfully.');
		cb(null, data);
	});
	test.on('error', err => {
		//console.log('Error while testing internet speed:');
		//console.error(err);
		cb(err, null);
		// Removed the automatic recheck as it would start multiple checks after a while and build up and crash the app
		// log('RETRY', 'Speed test error. Retrying in 1 minute');
		// setTimeout(() => { speedTestFn(); }, 60 * 1000);
	});
}

var pingInterval = setInterval(() => { // eslint-disable-line no-unused-vars
	pingFn();
}, config.pingEvery);

var speedInterval = setInterval(() => { // eslint-disable-line no-unused-vars
	speedTestFn();
}, config.speedTestEvery);

pingFn();
speedTestFn();

// Server

app.set('view engine', 'ejs');
if(!config.silent) {
	app.use(morgan('combined'));
}
app.use('/assets', express.static('assets'));

app.get('/ping', function(req, res) {
	/*var d = 1;
	if (req.query.d && req.query.d < 30) d = req.query.d;
	db.getPingResults(d, function(err, data) {
		if (err) throw err;
		//console.log(data);
		res.render('ping.ejs', { data: JSON.stringify(data) }); //var data = <%- data %>;
	});*/
	res.render('ping.ejs', { reload: millisToMinutesAndSeconds(config.pingEvery), pingIp: config.pingTo });
});

app.get('/speedtest', function(req, res) {
	/*var d = 1;
	if (req.query.d && req.query.d < 30) d = req.query.d;
	db.getSpeedTestResults(d, function(err, data) {
		if (err) throw err;
		//console.log(data);
		res.render('speedtest.ejs', { data: JSON.stringify(data) });
	});*/
	res.render('speedtest.ejs', { stReload: millisToMinutesAndSeconds(config.speedTestEvery) });
});

app.get('/api/ping', function(req, res) {
	var d = 1;
	var h = 0;
	if (req.query.d && req.query.d < 30) d = req.query.d;
	if (req.query.h && req.query.h < 30) h = req.query.h;
	if (h) d = h / 24;
	db.getPingResults(d, function(err, data) {
		if (err) throw err;
		res.json(data);
	});
});

app.get('/api/speedtest', function(req, res) {
	var d = 1;
	var h = 0;
	if (req.query.d && req.query.d < 30) d = req.query.d;
	if (req.query.h && req.query.h < 30) h = req.query.h;
	if (h) d = h / 24;
	db.getSpeedTestResults(d, function(err, data) {
		if (err) throw err;
		res.json(data);
	});
});

app.get('/api/force/speedtest', function(req, res) {
	speedTestFn();
});

app.get('/api/force/ping', function(req, res) {
	pingFn();
});

app.get('/api/config', function(req, res) {
	var publicConfig = {
		speedTestEvery: config.speedTestEvery,
		pingEvery: config.pingEvery,
		version: packageJSON.version
	};

	res.json(publicConfig);
});

app.listen(5514, function() {
	console.log('Listening on port 5514');
});