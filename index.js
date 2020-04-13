const express = require('express');


// App setup
const app = express();

const hostname = '127.0.0.1';
const port = 4000;
const server = app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

const io = require('./model/socket').init(server);

// Set listeners
require('./listeners').setListeners(io);


/*const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});*/