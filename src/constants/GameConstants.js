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
    ACTION: "action",
    DISCARDING: "discarding",
    ROBBER_PLACEMENT: "robber_placement"
});

const SPECIAL_VICTORY_POINTS = Object.freeze({
    LARGEST_ARMY: "largest_army",
    LONGEST_ROAD: "longest_road"
});


module.exports = {
    GAME_PHASES,
    SETUP_SUBPHASES,
    GAMEPLAY_SUBPHASES,
    SPECIAL_VICTORY_POINTS
};