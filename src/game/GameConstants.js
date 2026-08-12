const GAME_PHASES = Object.freeze({
    LOBBY: "lobby",
    SETUP: "setup",
    GAMEPLAY: "gameplay"
});

const SETUP_SUBPHASES = Object.freeze({
    ROLL_FOR_TURN_ORDER: "roll_for_turn_order",
    PLACING_SETTLEMENT: "placing_settlement",
    PLACING_ROAD: "placing_road"
});

const GAMEPLAY_SUBPHASES = Object.freeze({
    PRODUCTION: "production",
    ACTION: "action"
});

module.exports = {
    GAME_PHASES,
    SETUP_SUBPHASES,
    GAMEPLAY_SUBPHASES
};