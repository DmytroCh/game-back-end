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
    if(game.isStarted){
        io.to(roomName).emit('start-game', game);
        // check if player can do move, if not - move to next player
        const playerPown = games.shouldNextPlayerBe(game);
        if(playerPown)
            handleNewMove({id: game.dice.playerId}, playerPown.id);
    }
};

// Handle user who disconnected (close the game)
const handleDisconnectedUser = (socket) => {
    const roomName = rooms.removePlayerFromRoom(socket);
    // inform other players from same game about player leaving if game still exist (if game leaved last player game is removing)
    if(roomName){
        io.to(roomName).emit('player-leave', games.getGame(roomName));
        try{
            // check if player can do move, if not - move to next player
            const game = games.getGame(roomName);
            const playerPown = games.shouldNextPlayerBe(game);
            if(playerPown)
                handleNewMove({id: game.dice.playerId}, playerPown.id);
        }catch(error){
            console.error(error);
        }
    }

};

// Handle new player move event
const handleNewMove = (socket, pownId) => {
    try{
        games.doMove(socket, pownId);
    }catch(error){
        console.error(error);
    }finally{
        const roomName = games.getGameNameByPlayerId(socket.id);
        // inform other players from same game about board changes. If move was illegal - same positions will be returned
        if(roomName){
            const game = games.getGame(roomName);    
            io.to(roomName).emit('board-changes', game);
            //if there are now moves for player then turn should go to next one
            let isAvailableMove = games.validateAllPossibleMoves(game, game.dice.playerId, "pownId");
            while(!isAvailableMove){
                const playerPown = game.powns.find(pown => pown.ownerId === game.dice.playerId);
                handleNewMove({id: game.dice.playerId}, playerPown.id);
                isAvailableMove = games.validateAllPossibleMoves(game, game.dice.playerId, "pownId");
            }
        }
    }
};

// Handel games auto runs
const handleAutoStartGame = () => {
    const gamesToRun = games.startGamesPeriodically();
    gamesToRun.forEach(game => {    
        io.to(game.roomName).emit('start-game', game);
        // check if player can do move, if not - move to next player
        const playerPown = games.shouldNextPlayerBe(game);
        if(playerPown)
            handleNewMove({id: game.dice.playerId}, playerPown.id);
    });
};

// This timer runs games periodically
setInterval(handleAutoStartGame, 5000, 'games-runner');

module.exports = {
    handleNewPlayer: (socket) => handleNewPlayer(socket),
    handleDisconnectedUser: (socket) => handleDisconnectedUser(socket),
    handleNewMove: (socket, pownId) => handleNewMove(socket, pownId)
};