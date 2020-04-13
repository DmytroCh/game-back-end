const chance = require('chance').Chance();
const maxPlayers = 4; // There are 4 players can be in the room
let games = require('./games');


// This method responsible for finding room's name which is waiting for start AND has free slots
// if this room will not found - new name should be created
const findRoom = () => {
    const game = games.getGames().find(game => {
        return (!game.isStarted //game was not start
            && !game.isFinished //game was not finish
            && game.players.length < maxPlayers); //board is not full
    });
    if (game){
        return game.roomName;
    }
    else
        return chance.guid();
};

// We need also add player to array with games, as decided to not use sockets rooms for additional data
const addPlayerToGame = (socket, roomName) => {
    const game = games.getGames().find(game => game.roomName === roomName);
    // if game already exist add player either create new game
    if (game) {
        games.addPlayerToGame(game, socket.id);
    } else {
        games.addGame(socket.id, roomName);
    }
};

// This method responsible for adding user to room (games)
const addPlayerToRoom = socket => {
    const roomName = findRoom();
    socket.join(roomName);
    addPlayerToGame(socket, roomName);
    console.log(games.getGames());
    return roomName;
};

// This method removes user from game
const removePlayerFromRoom = socket => {
    const roomName = games.removePlayerFromGame(socket.id);
    console.log(games.getGames());
    return roomName;
}

module.exports = {
    getRooms: () => rooms,
    addPlayerToRoom: addPlayerToRoom,
    removePlayerFromRoom: removePlayerFromRoom
};
