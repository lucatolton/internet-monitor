var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./db.sqlite3');
var moment = require('moment');

var stmt = `CREATE TABLE IF NOT EXISTS "speedtest" (
	"timestamp"	INTEGER,
	"download"	NUMERIC,
	"upload"	NUMERIC
);`;
db.run(stmt);

var stmt2 = `CREATE TABLE IF NOT EXISTS "ping" (
	"timestamp"	INTEGER,
	"average"	NUMERIC,
	"max"	NUMERIC,
	"min"	NUMERIC
);`;
db.run(stmt2);

function insertSpeedTestResults(d, u) {
	db.serialize(function() {
		var now = moment().unix();
		var stmt = db.prepare(`INSERT INTO speedtest (timestamp, download, upload) VALUES (${now}, ${d}, ${u})`);
		stmt.run();
		stmt.finalize();
	});
}

function insertPingResults(a, m, l) {
	db.serialize(function() {
		var now = moment().unix();
		var stmt = db.prepare(`INSERT INTO ping (timestamp, average, max, min) VALUES (${now}, ${a}, ${m}, ${l})`);
		stmt.run();
		stmt.finalize();
	});
}

function getSpeedTestResults(d, cb) {
	db.serialize(function() {
		var day = 60 * 60 * 24; // 86400
		console.log(moment().unix());
		var r = moment().unix() - (d * day);
		var s = [];
		db.each(`SELECT timestamp, download, upload FROM speedtest WHERE timestamp > ${r}`, function(err, row) {
			if (err) throw err; // TODO: error handling
			s.push({
				timestamp: row.timestamp,
				download: row.download,
				upload: row.upload
			});
		}, function(err, count) { // eslint-disable-line no-unused-vars
			if (err) { // TODO: error handling
				return cb(err, null);
			}
			return cb(null, s);
		});
	});
}

function getPingResults(d, cb) {
	db.serialize(function() {
		var day = 60 * 60 * 24; // 86400
		var r = moment().unix() - (d * day);
		var s = [];
		db.each(`SELECT timestamp, average, max, min FROM ping WHERE timestamp > ${r}`, function(err, row) {
			if (err) throw err; // TODO: error handling
			s.push({
				timestamp: row.timestamp,
				average: row.average,
				max: row.max,
				min: row.min
			});
		}, function(err, count) { // eslint-disable-line no-unused-vars
			if (err) { // TODO: error handling
				return cb(err, null);
			}
			return cb(null, s);
		});
	});
}

module.exports = {
	insertSpeedTestResults,
	insertPingResults,
	getSpeedTestResults,
	getPingResults
};
