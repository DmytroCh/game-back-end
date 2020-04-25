const place = require('./enum/finish-place-enum');
const startPosition = require('./enum/start-position-enum');
const maxWaitingTime = 60000; // 1 min in ms. This is how long room is waiting for all players. After this delay game starts even not full
const player = require('./player');
const pown = require('./pown');
const dice = require('./dice');
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
        players: [player.createPlayer(playerId, startPosition.FIRST, place.NOT_FINISHED)], // max 4 players
        powns: [...pown.generatePownsSet(playerId, startPosition.FIRST)], // powns from all players -> 16 items
        createdOn: new Date().getTime(), //This is time, when first user was joined. After e.g. 1 min from this time game starts.
        isStarted: false, // this flag shows if game is started. Should be set on true when 4 players found or accrosed maxWaitingTime
        isFinished: false ,// this flag shows if players still play (or all finished).
        dice: dice.getCleanDice(playerId)
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
    const startPosition = findStartPosition(game);
    game.players.push(player.createPlayer(playerId, startPosition, place.NOT_FINISHED));
    game.powns = game.powns.concat(pown.generatePownsSet(playerId, startPosition));
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

const getGameNameByPlayerId = (playerId) => {
    const game = games.find(game => {
        return game.players.some(player => player.id === playerId);
    });
    // if found
    if(game){
        return game.roomName;
    }else{
        throw new Error(`Player ${playerId} was not found in any games. Verify games array`);
    }
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

// This method search who should throw next
const findNextPlayer = (playerId, game) => {
    const rollOrder = game.players.sort((a, b) => a - b); //sort players by start position
    const i = rollOrder.findIndex(player => player.id === playerId);
    if(i < rollOrder.length - 1){
        return rollOrder[i + 1].id;
    }else if(i === rollOrder.length - 1){
        return rollOrder[0].id;
    }else{
        throw new Error('There is problem with ordering in findNextPlayer()');
    }
    //console.log(rollOrder);
} 

// get new dice based on game rules
const getNewDice = (playerDice, playerId, game) => {
    //check if rolled previosly
    if(playerDice.turn === 0){
        return dice.rollDice(playerDice);
    }else if(playerDice.value === 6 && player.turn < 3){ //max number of 6 values is 2 otherwise next player should play
        return dice.rollDice(playerDice);
    }else{
        const nextPlayerId = findNextPlayer(playerId, game);
        return dice.getCleanDice(nextPlayerId);
    }
};

const movePown = () => {
    
}


// This method return true or false depends on if move was done by user is proper in case of rules
// If move is proper - board should be updated
const proceedMove = (game, playerId, pownId) => {
    const dice = game.dice;
    // check if proper user did move
    if(dice.playerId === playerId){
        const diceValue = dice.value;
        const pown = game.powns.find(pown => pown.ownerId === playerId && pown.pownId === pownId);
        if(pownId){
            //check if pown stays at start and dice value != 6
            if(pown.isStartArea && diceValue !== 6)
                return false;
            //here should be check if pown are not jump out of home if do, return false
            //if not, we need do this move in bellow method  
            movePown(game, pown);         

        }
    }else{
        return false;
    }
};

// This method responsible for move validation and execution
const doMove = (playerSocket, pownId) => {
    const playerId = playerSocket.id;
    const game = games.find(game => {
        return game.players.some(player => player.id === playerId);
    });
        // if found
        if(game){
            const moveIsValid = proceedMove(game, playerId, pownId);
            const newDice = getNewDice(game.dice, playerId, game);
        }else{
            throw new Error(`Player ${playerId} was not found in any games. Verify games array`);
        }
        return true;
};

module.exports = {
    getGames: getGames,
    getGame: getGame,
    getGameNameByPlayerId: getGameNameByPlayerId,
    addGame: addGame,
    addPlayerToGame: addPlayerToGame,
    removePlayerFromGame: removePlayerFromGame,
    startGamesPeriodically: startGamesPeriodically,
    doMove: doMove
};