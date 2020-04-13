let controller = require('./controller-ws');

module.exports = {
    setListeners: io => {
        setListeners(io);
    }
};

// this method responsible for setting listeners to socket.io object
const setListeners = io => {
    setConnectionListener(io);
};

// New user is connected
const setConnectionListener = io => {
    io.on('connection', socket => {
        console.log('Client connected', socket.id);
        // User is connected. He is a new player, so we need to find a game for him.
        controller.handleNewPlayer(socket);

        // Proceed disconnect event.
        socket.on('disconnect', () => {
            console.log("Client disconnected", socket.id);
            // Remove user from game when he disconnected
            controller.handleDisconnectedUser(socket);
        })
    });

};