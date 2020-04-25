const chance = require('chance').Chance();


const rollDice = (dice) => {
    dice.value = chance.integer({min: 1, max: 6});
    dice.turn = dice.turn + 1;
    return dice;
};

const getCleanDice = (playerId) => {
    return ({
        playerId: playerId,
        value: 0,
        turn: 0 //max 3. If player roll 3 times 6 in the row, the last 6 removed. Next player turn
    });
};

module.exports = {
    rollDice: rollDice,
    getCleanDice: getCleanDice
};