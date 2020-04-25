const chance = require('chance').Chance();
const setSize = 4; // number of powns available for player
const boardShift = 10; // distance between starts fields. We have 40 fileds for 4 players so shift is 10


const createPown = (ownerId, position) => {
    const pownId = chance.string({
        length: 6,
        alpha: true,
        numeric: true
    });
    return({
        ownerId: ownerId,
        id: pownId,
        position: position,
        isStartArea: true, //means it stay at start area, only 6 cube can move it out
        isHome: false // means pown stays at finish position, there are 4 fields which must be taken by powns to win
    });
};

const generatePownsSet = (ownerId, startPosition) => {
    const powns = [];
    const pownStartField = startPosition * boardShift;
    for(let i = 0; i < setSize; i++){
        powns.push(createPown(ownerId, pownStartField));
    }
    return powns;
};

module.exports = {
    generatePownsSet: generatePownsSet
};