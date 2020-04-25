
const createPlayer = (playerId, startPosition, place) => {
    return ({
        id: playerId, // same as scocket id
        startPosition: startPosition,
        place: place
    });
};

module.exports ={
    createPlayer: createPlayer
};