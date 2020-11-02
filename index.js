const express = require('express');
const cors = require('cors');
const path = require('path');


const hostname = '0.0.0.0';
const port = 4000;
const clientBuildPath = path.join(__dirname, '../game-front-end/build');

// App setup
const app = express();
app.use(cors());

// Serve static files from the React app
app.use(express.static(clientBuildPath));

// All remaining requests return the React app, so it can handle routing.
app.get('*', function(request, response) {
  response.sendFile(path.join(clientBuildPath, 'index.html'));
});

// web sockets listener
const server = app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

const io = require('./model/socket').init(server);

// Set listeners
require('./listeners').setListeners(io);
