const express = require('express');
const cors = require('cors');

const hostname = 'localhost';
const port = 4000;

// App setup
const app = express();
app.use(cors());

// web sockets listener
const server = app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/ws/`);
});

const io = require('./model/socket').init(server);

// Set listeners
require('./listeners').setListeners(io);
