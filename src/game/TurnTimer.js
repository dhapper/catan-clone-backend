const { GAME_PHASES, GAMEPLAY_SUBPHASES } = require("../constants/GameConstants");

let turnTimeout = null;
let timedPlayerId = null;
const TURN_DURATION_MS = 3 * 60 * 1000;

function checkTurnTimer(io, game, broadcastGameState) {
    if (game.phase !== GAME_PHASES.GAMEPLAY || game.winner) {
        if (turnTimeout) clearTimeout(turnTimeout);
        turnTimeout = null;
        timedPlayerId = null;
        game.turnEndsAt = null;
        return;
    }

    if (game.currentPlayerId === timedPlayerId) {
        return;
    }

    if (turnTimeout) clearTimeout(turnTimeout);
    timedPlayerId = game.currentPlayerId;
    game.turnEndsAt = Date.now() + TURN_DURATION_MS;

    turnTimeout = setTimeout(() => {
        if (game.subphase === GAMEPLAY_SUBPHASES.PRODUCTION) {
            game.rollProductionDice();
            io.emit("game:sound", "diceRoll");
        }

        if (game.endTurn()) {
            io.emit("game:sound", "pickupDice");
        }

        broadcastGameState();
    }, TURN_DURATION_MS);
}

module.exports = { checkTurnTimer };