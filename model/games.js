const place = require('./enum/finish-place-enum');
const startPosition = require('./enum/start-position-enum');
const maxWaitingTime = 60000; // 1 min in ms. This is how long room is waiting for all players. After this delay game starts even not full
const player = require('./player');
const pown = require('./pown');
const dice = require('./dice');
const games = [];
const supportOptions = require('./support-options'); // must be removed later

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
    const newGame = {
        roomName: roomName, //random string based on guid standard.
        players: [player.createPlayer(playerId, startPosition.FIRST, place.NOT_FINISHED)], // max 4 players
        powns: [...pown.generatePownsSet(playerId, startPosition.FIRST)], // powns from all players -> 16 items
        board: Array(80).fill(null).map(() => []), // this is board which will contains powns ids basedon their position.
        createdOn: new Date().getTime(), //This is time, when first user was joined. After e.g. 1 min from this time game starts.
        isStarted: false, // this flag shows if game is started. Should be set on true when 4 players found or accrosed maxWaitingTime
        isFinished: false ,// this flag shows if players still play (or all finished).
        dice: dice.getCleanDice(playerId)
    };
    games.push(newGame);
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
    if(game.players.length === 4){
        game = supportOptions.createOptionalStartBoard(game);
        startGame(game);
    }

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
        // If turn was player who leaved
        if(game.dice.playerId === playerId){
            const nextPlayerId = findNextPlayer(playerId, game);
            const newDice = dice.getCleanDice(nextPlayerId);
            game.dice = newDice;
        }
        const playerIndex = game.players.findIndex(player => player.id === playerId);
        game.players.splice(playerIndex, 1);
        //remove player's powns
        const playersPowns = game.powns.filter((pown) => pown.ownerId === playerId).map(pown => pown.id);
        game.board.forEach(cell => {
            playersPowns.forEach(pownId => {
                let index = cell.indexOf(pownId);
                if(index >= 0)
                    cell.splice(index, 1);
            });

        });

        game.powns = game.powns.filter((pown) => pown.ownerId !== playerId);
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
    //console.log("games-runner validator runned");
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
/*const getNewDice = (playerDice, playerId, game) => {
    //check if rolled previosly
    if(playerDice.turn === 0){
        return dice.rollDice(playerDice);
    }else if(playerDice.value === 6 && player.turn < 3){ //max number of 6 values is 2 otherwise next player should play
        return dice.rollDice(playerDice);
    }else{
        const nextPlayerId = findNextPlayer(playerId, game);
        return dice.getCleanDice(nextPlayerId);
    }
};*/

// This method check if moved pown will run out the home or try to stay on busy home`s cell
const checkHome = (game, pown1) => {
    const pownOwnerId = pown1.ownerId;
    const diceValue = game.dice.value;
    const boardShift = pown.getBoardShift(); //distance between two starts
    const startPosition = game.players.find(player => player.id === pownOwnerId).startPosition * boardShift;
    const boardSize = 39;
    const homeSize = 4;
    const maxHomePosition = startPosition + boardSize + homeSize;
    const parkedPownsNumber = game.powns.filter(pown => pown.ownerId === pownOwnerId).filter(pown => pown.isHome === true).length;
    let newPosition = pown1.position + diceValue;

    //case player 0
    if(startPosition !== 0){
        //if new position will cause go to home
        if(pown1.position < startPosition &&
            newPosition >= startPosition){
            newPosition = startPosition + (boardSize + 1) + diceValue - (startPosition - pown1.position);
            //console.log(`Start position ${startPosition}, new position ${newPosition}`);
        }
    }

    //check if move will cause move out of home
    if(newPosition > maxHomePosition - parkedPownsNumber){
        console.log("Pown run out the home");
        return false;
    }else if(!validateHomeNumbers(game.board, maxHomePosition, newPosition, homeSize, pown1.id)){
        //check if at home not too mach powns. like two stay one step till the end.
        console.log(`Too much powns at home.`);
        return false;
    }

    //check if pown not at home already
    if(pown1.isHome)
        return false;

    return true;
};

// this method check if there is no too much powns in specific home area like [0,0,3,0]
const validateHomeNumbers = (board, maxHomePosition, newPosition, homeSize, pownId) => {
    board = board.map(arr => {
        return [...arr].filter(el => el !== pownId);
    });
    board[newPosition].push(pownId);
    let result = true;
    let maxValue = 1;
    for(let i = maxHomePosition; i > maxHomePosition - homeSize; i--){
        let sum = 0;
        board
        for(let j = maxHomePosition; j >= i; j--){
            sum = sum + board[j].length;
            //console.log(`i: ${i}, j: ${j}, sum: ${sum}`);
        }
        if(sum > maxValue){
            result = false;
        }else{
            maxValue = maxValue + 1;
        }
    }
    return result;
};

// This method responsible for pown move
const movePown = (game, pownId) => {
    const gameId = game.roomName;
    const activeGame = games.find(g => g.roomName === gameId);
    const activePown = activeGame.powns.find(p => p.id === pownId);
    console.log("Active pown", activePown);
    // Is pown stays at start area
    if(activePown.isStartArea){
        activePown.isStartArea = false;
    }else{
        const pownIndex = activeGame.board[activePown.position].findIndex(p => p === activePown.id);
        activeGame.board[activePown.position].splice(pownIndex, 1);
        const newPosition = activePown.position + activeGame.dice.value;
        const player = activeGame.players.find(player => player.id === activePown.ownerId);
        const startPosition = player.startPosition * 10;
        
        //if pown in home area alredy
        if(activePown.position >= 40){
            activePown.position = newPosition;
        }else{
            //does pown did 40 steps and go to home area?
            //player 0 case
            if(startPosition == 0){
                activePown.position = newPosition;
            }else{
                // 1-3 players case
                if(activePown.position < startPosition &&
                    newPosition >= startPosition){
                    const stepsAtHome = newPosition - startPosition;
                    activePown.position = startPosition + 40 + stepsAtHome;
                }else{
                    // lock lap, otherwise red pown will go to green home as it start from position 30
                    if(newPosition >= 40){
                        activePown.position = (newPosition) % 40;
                    }else{
                        activePown.position = newPosition;
                    }
                }
            }
        }
    }
    //place pown on board
    activeGame.board[activePown.position].push(activePown.id);
    // park pown if it's time
    parkPown(activeGame, pownId);
};

const parkPown = (game, pownId) => {
    const index = game.powns.findIndex(pown => pown.id === pownId);
    console.log("+++++++++++++++++++parkPown method++++++++++++++++++++++++");
    console.log(index);
    if(index >= 0){
        const player = game.players.find(player => player.id === game.powns[index].ownerId);
        if(player){
            const parkedPowns = game.powns.filter(pown => pown.ownerId === player.id && pown.isHome === true);
            const homeEnd = 39 + player.startPosition * pown.getBoardShift() - parkedPowns.length + 4;
            console.log("Parked powns", parkedPowns);
            console.log("homeEnd", homeEnd);
            if(game.powns[index].position >= homeEnd){
                game.powns[index].isHome = true;
                console.log("Pown was parked", pownId);
                normalizeHomeStatuses(game, player);
                playerFinishedGame(game, player);
            }
        }else{
            console.error("Player not found", game.powns[index].ownerId);
        }
    }else{
        console.error("Pown not found", pownId);
    }
};

// this method set player's result if all powns parked
const playerFinishedGame = (game, player) => {
    const parkedPowns = game.powns.filter(pown => {
        return pown.ownerId === player.id && pown.isHome === true;
    });
    if(parkedPowns.length >= 4){
        const index = game.players.findIndex(pl => pl.id === player.id);
        const alreadyFinished = game.players.filter(pl => pl.place > 0);
        switch(alreadyFinished.length){
            case 0:
                game.players[index].place = place.FIRST;
                break;
            case 1:
                game.players[index].place = place.SECOND;
                break;
            case 2:
                game.players[index].place = place.THIRD;
                break;
            case 3:
                game.players[index].place = place.FOURTH;
                break;
        }
    }
};

//this method validate and update if all powns has proper isHome field
//it's neccesary in case of [0,0,2,0]=>[0,0,1,1];
const normalizeHomeStatuses = (game, player) => {
    let playerPowns = game.powns.filter(pown => pown.ownerId === player.id);
    playerPowns = playerPowns.sort((pown1, pown2) => pown1.position - pown2.position).reverse();
    //console.log("playerPowns", playerPowns);
    let isSorted = true;
    for(let i = 0; i < playerPowns.length - 1; i++){
        if(isSorted && playerPowns[i].position - playerPowns[i + 1].position <= 1){
            const index = game.powns.findIndex(pown => pown.id === playerPowns[i + 1].id);
            game.powns[index].isHome = true;
        }else{
            isSorted = false;
        }
    }
};

// This method return true or false depends on if move was done by user is proper in case of rules
const validateMove = (game, playerId, pownId) => {
    const dice = game.dice;
    // check if proper user did movestartPosition
    if(dice.playerId === playerId){
        //console.log("PlayerId is ok!");
        const diceValue = dice.value;
        const pown = game.powns.find(pown => pown.ownerId === playerId && pown.id === pownId);
        if(pown){
            //console.log("Pown found!");
            //check if pown stays at start and dice value != 6
            if(pown.isStartArea && diceValue !== 6){
                //console.error("Pown can't move out!", pown);
                return false;
            }
            //here should be check if pown are not jump out of home if do, return false
            const isHomeProper = checkHome(game, pown); 
            if(!isHomeProper){
                console.error("Home validation fails");
                return false;
            }       
        }else{
            return false;
        }
    }else{
        return false;
    }
    return true;
};

// This method check if given player has possible moves
const validateAllPossibleMoves = (game, playerId, pownId) => {
    let isPossibleMove = false;
    const powns = game.powns.filter(pown => pown.ownerId === playerId);
    if(pownId){
        // go through all player`s powns
        for(let i = 0; i < pown.getSetSize(); i++){
            if(!isPossibleMove)
                isPossibleMove = validateMove(game, playerId, powns[i].id);
        }
    }else{
        isPossibleMove = true;
    }
    return isPossibleMove;
};

// This method responsible for move validation and execution
const doMove = (playerSocket, pownId) => {
    const playerId = playerSocket.id;
    const game = games.find(game => {
        return game.players.some(player => player.id === playerId);
    });
        // if found
        if(game){
            console.log("=======================New Move======================");
            console.log("Game found");
            const moveIsValid = validateMove(game, playerId, pownId);
            //if move is not valid we need to check if this user has any possible move, otherwise next player should play
            if(!moveIsValid){
                console.error("Move is invalid!");
                const isThereAnyPossibleMoves = validateAllPossibleMoves(game, playerId, pownId);
                //console.log("isThereAnyPossibleMoves", isThereAnyPossibleMoves);
                if(isThereAnyPossibleMoves){                    
                    return false;
                }else{
                    const nextPlayerId = findNextPlayer(playerId, game);
                    const newDice = dice.getCleanDice(nextPlayerId);
                    game.dice = newDice;
                }
            }else{
                console.log("Move is valid!");
                //const newDice = getNewDice(game.dice, playerId, game);
                //We need do this move in bellow method  
                movePown(game, pownId);   
                const nextPlayerId = findNextPlayer(playerId, game);
                const newDice = dice.getCleanDice(nextPlayerId);
                game.dice = newDice;
                checkGameFinished(game);
            }  
        }else{
            throw new Error(`Player ${playerId} was not found in any games. Verify games array`);
        }
        return true;
};

const checkGameFinished = (game) => {
    const finishedPlayers = game.players.filter(player => player.place > 0);
    if(finishedPlayers.length >= game.players.length)
        game.isFinished = true;

};

//if there are no moves for player then turn should go to next one
const shouldNextPlayerBe = (game) => {
        const isAvailableMove = validateAllPossibleMoves(game, game.dice.playerId, "pownId");
        if(!isAvailableMove){
            const playerPown = game.powns.find(pown => pown.ownerId === game.dice.playerId);
            return playerPown;
        }
        return null;
};

module.exports = {
    getGames: getGames,
    getGame: getGame,
    getGameNameByPlayerId: getGameNameByPlayerId,
    addGame: addGame,
    addPlayerToGame: addPlayerToGame,
    removePlayerFromGame: removePlayerFromGame,
    startGamesPeriodically: startGamesPeriodically,
    doMove: doMove,
    validateAllPossibleMoves: validateAllPossibleMoves,
    shouldNextPlayerBe: shouldNextPlayerBe
};