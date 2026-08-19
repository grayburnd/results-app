var express = require('express'),
    async = require('async'),
    path = require('path'),
    fs = require('fs'),
    { Pool } = require('pg'),
    cookieParser = require('cookie-parser'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server);

var port = process.env.PORT || 80;

var db_username = process.env.DB_USERNAME;

var db_password = process.env.DB_PASSWORD;

var db_host = process.env.DB_HOST;

var db = process.env.DB;

// Mount path when served behind a path-prefixing gateway (e.g. /result/); defaults to root for local/CI use.
var basePath = process.env.BASE_PATH || '/';
if (!basePath.endsWith('/')) {
  basePath += '/';
}

io.on('connection', function (socket) {

  socket.emit('message', { text : 'Welcome!' });

  socket.on('subscribe', function (data) {
    socket.join(data.channel);
  });
});

var pool = new Pool({
  connectionString: `postgres://${db_username}:${db_password}@${db_host}/${db}`,
  ssl: { rejectUnauthorized: false }
});

async.retry(
  {times: 1000, interval: 1000},
  function(callback) {
    pool.connect(function(err, client, done) {
      if (err) {
        console.error("Waiting for db: " + err.message);
      }
      callback(err, client);
    });
  },
  function(err, client) {
    if (err) {
      return console.error("Giving up: " + err.message);
    }
    console.log("Connected to db");
    getVotes(client);
  }
);

function getVotes(client) {
  client.query('SELECT vote, COUNT(*) AS total FROM votes GROUP BY vote ORDER BY vote', [], function(err, result) {
    if (err) {
      console.error("Error performing query: " + err);
    } else {
      var votes = collectVotesFromResult(result);
      io.sockets.emit("scores", JSON.stringify(votes));
    }

    setTimeout(function() {getVotes(client) }, 1000);
  });
}

// Aggregated totals keyed by vote value, e.g. {a: 12, b: 9}; defaults keep the UI stable when a choice has no votes yet.
function collectVotesFromResult(result) {
  var votes = {a: 0, b: 0};

  result.rows.forEach(function (row) {
    votes[row.vote] = parseInt(row.total);
  });

  return votes;
}

function fetchCurrentVotes(callback) {
  pool.query('SELECT vote, COUNT(*) AS total FROM votes GROUP BY vote ORDER BY vote', [], function(err, result) {
    if (err) {
      return callback(err);
    }
    callback(null, collectVotesFromResult(result));
  });
}

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/views', { index: false }));

app.get('/', function (req, res) {
  fetchCurrentVotes(function(queryErr, votes) {
    if (queryErr) {
      console.error("Error performing query: " + queryErr);
      votes = {a: 0, b: 0};
    }

    fs.readFile(path.resolve(__dirname + '/views/index.html'), 'utf8', function(err, html) {
      if (err) {
        console.error("Error reading index.html: " + err);
        return res.status(500).send('Internal Server Error');
      }
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.send(
        html
          .replace('__BASE_PATH__', basePath)
          .replace('__INITIAL_VOTES__', JSON.stringify(votes))
      );
    });
  });
});

app.get('/results', function (req, res) {
  fetchCurrentVotes(function(err, votes) {
    if (err) {
      console.error("Error performing query: " + err);
      return res.status(500).json({ error: 'Unable to fetch results' });
    }
    res.json(votes);
  });
});

server.listen(port, function () {
  var port = server.address().port;
  console.log('App running on port ' + port);
});
