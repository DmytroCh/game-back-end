const place = require('./enum/finish-place-enum');
const startPosition = require('./enum/start-position-enum');
const maxWaitingTime = 60000; // 1 min in ms. This is how long room is waiting for all players. After this delay game starts even not full
const games = [];

// Get all games
const getGames = () => games;

// Get game by roomName (gameName == roomName)
const getGame = (roomName) => {
    const game = games.find(game => game.roomName === roomName);
    if(game)
        return game;
    else
        throw new Error(`Game ${roomName} not found`);
};

// Create a new game
const addGame = (playerId, roomName) => {
    games.push({
        roomName: roomName, //random string based on guid standard.
        players: [{
            id: playerId, // same as scocket id
            startPosition: startPosition.FIRST,
            place: place.NOT_FINISHED
        }],
        pins: [{
            ownerId: 'dfgdsf',
            id: 1,
            position: 0,
            isHome: true //means it stay at start home, only 6 cube can move it out
        }],
        createdOn: new Date().getTime(), //This is time, when first user was joined. After e.g. 1 min from this time game starts.
        isStarted: false, // this flag shows if game is started. Should be set on true when 4 players found or accrosed maxWaitingTime
        isFinished: false // this flag shows if players still play (or all finished). 
    });
};

// This method look to already exists players positions and return free slot id (enum value)
const findStartPosition = (game) => {
    const possiblePositions = Object.values(place);
    const busyPositions = game.players.map(player => player.startPosition);
    const freePositions = possiblePositions.filter(pos => !busyPositions.includes(pos));
    if(freePositions.length > 0){
        return freePositions[0];
    }else{
        throw new Error('There is no free start position, something wrong with match maker');
    }
};

const startGame = game => {
    game.isStarted = true;
};

// This method add new player to the game
const addPlayerToGame = (game, playerId) => {
    game.players.push({
        id: playerId,
        startPosition: findStartPosition(game),
        place: place.NOT_FINISHED
    });
    if(game.players.length === 4)
        startGame(game);
};

// this method removes game by given name
const removeGame = (roomName) => {
    games.splice(games.findIndex(game => game.roomName === roomName), 1);
};

// This method implemens case, when in the active game there is one player (others leaved)
// In this case he win. and game should be marked as finished
const proceedOnePlayerGameWin = (game) => {
    game.players[0].place = place.FIRST;
    game.isFinished = true;
};

// This method remove player from the game
// and call removing empty game (if game becames empty after removing last player)
// The second thing is if there is only one player after second leaving - he win automatically
// So we need to finish game and assing him firsplacet 
const removePlayerFromGame = (playerId) => {
    const game = games.find(game => {
        return game.players.some(player => player.id === playerId);
    });
    // if found
    if(game){
        const playerIndex = game.players.findIndex(player => player.id === playerId);
        game.players.splice(playerIndex, 1);
        // last user win
        if(game.players.length == 1){
            proceedOnePlayerGameWin(game);
        }
        // there is no more users w can remove game
        if(game.players.length == 0){
            removeGame(game.roomName);
            return null;
        }
    }else{
        throw new Error(`Player ${playerId} was not found in any games. Verify games array`);
    }
    return game.roomName;
};

// This method required for timers
// Problem is we don't want ask users wait untill all places will be taken
// Idea is wait maxWaitingTime from first user join the game and starts it absolutely
const startGamesPeriodically = () => {
    console.log("games-runner validator runned");
    const gameToRun = [];
    games.forEach(game => {
        const nowMs = new Date().getTime();
        if(!game.isStarted // if game not started
            && !game.isFinished // if game not finished 
            && nowMs - game.createdOn >= maxWaitingTime){ 
                game.isStarted = true;
                gameToRun.push(game);
                //Here we should run method to add bots to free slots
        } 
    });
    return gameToRun;
};

module.exports = {
    getGames: getGames,
    getGame: getGame,
    addGame: addGame,
    addPlayerToGame: addPlayerToGame,
    removePlayerFromGame: removePlayerFromGame,
    startGamesPeriodically: startGamesPeriodically
};