const GAME_PHASES = Object.freeze({
    SETUP: "setup",
    GAMEPLAY: "gameplay"
});

const SETUP_SUBPHASES = Object.freeze({
    PLACING_SETTLEMENT: "placing_settlement",
    PLACING_ROAD: "placing_road"
});

module.exports = {
    GAME_PHASES,
    SETUP_SUBPHASES
};