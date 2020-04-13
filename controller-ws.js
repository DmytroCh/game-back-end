let rooms = require('./model/rooms');
const io = require('./model/socket').getIO();
const games = require('./model/games');


// handle new connected user
const handleNewPlayer = (socket) => {
    const roomName = rooms.addPlayerToRoom(socket);
    const game = games.getGame(roomName);
    // inform other player from same game about new player
    io.to(roomName).emit('new-player-joined', game);
    // emit start-game event if we have 4 players (isStarted == true)
    if(game.isStarted)
        io.to(roomName).emit('start-game', game);
};

// Handle user who disconnected (close the game)
const handleDisconnectedUser = (socket) => {
    const roomName = rooms.removePlayerFromRoom(socket);
    // inform other players from same game about player leaving if game still exist (if game leaved last player game is removing)
    if(roomName)
        io.to(roomName).emit('player-leave', games.getGame(roomName));

};

// Handel games auto runs
const handleAutoStartGame = () => {
    const gamesToRun = games.startGamesPeriodically();
    gamesToRun.forEach(game => {    
        io.to(game.roomName).emit('start-game', game);
    });
};

// This timer runs games periodically
setInterval(handleAutoStartGame, 5000, 'games-runner');

module.exports = {
    handleNewPlayer: (socket) => handleNewPlayer(socket),
    handleDisconnectedUser: (socket) => handleDisconnectedUser(socket)
};