const createOptionalStartBoard = (game) => {
    const players = game.players;
    for(let i = 0; i < players.length; i++){
        let playerPowns = game.powns.filter(pown => pown.ownerId === players[i].id);
        for(let j = 0; j<playerPowns.length; j++){
            let playerPown = game.powns.findIndex(pown => pown.id === playerPowns[j].id);
            game.powns[playerPown].isStartArea = false;
            let position = 39;
            switch(i){
                case 0:
                    position = 39 - j;
                    break;
                case 1:
                    position = 9 - j;
                    break;
                case 2:
                    position = 19 - j;
                    break;
                case 3:
                    position = 29 - j;
                    break;
            }
            game.powns[playerPown].position = position;
            game.board[position] = [game.powns[playerPown].id];
        }

        
    }
    //game.powns[0].
    return game;
};

/*{
        id: playerId, // same as scocket id
        startPosition: startPosition,
        place: place
}
*/

/*{
        ownerId: ownerId,
        id: pownId,
        position: position,
        isStartArea: true, //means it stay at start area, only 6 cube can move it out
        isHome: false // means pown stays at finish position, there are 4 fields which must be taken by powns to win
    }
*/

/*{
    roomName: roomName, //random string based on guid standard.
    players: [player.createPlayer(playerId, startPosition.FIRST, place.NOT_FINISHED)], // max 4 players
    powns: [...pown.generatePownsSet(playerId, startPosition.FIRST)], // powns from all players -> 16 items
    board: Array(80).fill(null).map(() => []), // this is board which will contains powns ids basedon their position.
    createdOn: new Date().getTime(), //This is time, when first user was joined. After e.g. 1 min from this time game starts.
    isStarted: false, // this flag shows if game is started. Should be set on true when 4 players found or accrosed maxWaitingTime
    isFinished: false ,// this flag shows if players still play (or all finished).
    dice: dice.getCleanDice(playerId)
};*/
module.exports = {
    createOptionalStartBoard: createOptionalStartBoard
};