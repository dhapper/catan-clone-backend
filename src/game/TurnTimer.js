const { GAME_PHASES, GAMEPLAY_SUBPHASES } = require("../constants/GameConstants");
const { emitNextTurnStartSound } = require("../services/SoundManager");

let turnTimeout = null;
let timedPlayerId = null;
let remainingMs = null;
const TURN_DURATION_MS = 3 * 60 * 1000;

function checkTurnTimer(io, game, broadcastGameState) {
    if (game.phase !== GAME_PHASES.GAMEPLAY || game.winner) {
        if (turnTimeout) clearTimeout(turnTimeout);
        turnTimeout = null;
        timedPlayerId = null;
        remainingMs = null;
        game.timerPaused = false;
        game.timerRemainingMs = null;
        game.turnEndsAt = null;
        return;
    }

    if (game.timerPaused) {
        return;
    }

    if (game.currentPlayerId === timedPlayerId) {
        return;
    }

    if (turnTimeout) clearTimeout(turnTimeout);
    timedPlayerId = game.currentPlayerId;
    remainingMs = game.timerRemainingMs ?? TURN_DURATION_MS;
    game.timerRemainingMs = null;
    game.turnEndsAt = Date.now() + remainingMs;

    turnTimeout = setTimeout(() => {
        remainingMs = null;
        game.timerRemainingMs = null;

        if (game.subphase === GAMEPLAY_SUBPHASES.PRODUCTION) {
            game.rollProductionDice();
            io.emit("game:sound", "diceRoll");
        }

        if (game.endTurn()) {
            emitNextTurnStartSound(io, game);
        }

        broadcastGameState();
    }, remainingMs);
}

function toggleTurnTimer(game) {
    if (game.phase !== GAME_PHASES.GAMEPLAY || game.winner) {
        return false;
    }

    if (game.timerPaused) {
        game.timerPaused = false;
        game.turnEndsAt = null;
        game.timerRemainingMs = remainingMs;
        timedPlayerId = null;
        remainingMs = null;
        return true;
    }

    game.timerRemainingMs = Math.max(
        0,
        (game.turnEndsAt ?? Date.now()) - Date.now()
    );
    remainingMs = game.timerRemainingMs;
    game.timerPaused = true;
    game.turnEndsAt = null;

    if (turnTimeout) clearTimeout(turnTimeout);
    turnTimeout = null;

    return true;
}

module.exports = { checkTurnTimer, toggleTurnTimer };