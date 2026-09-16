const { GAME_PHASES, GAMEPLAY_SUBPHASES } = require("../constants/GameConstants");
const { emitNextTurnStartSound } = require("../services/SoundManager");

// const TURN_DURATION_MS = 3 * 60 * 1000;
const TURN_DURATION_MS = 1 * 30 * 1000;

class TurnTimer {
    constructor(game) {
        this.game = game;
        this.turnTimeout = null;
        this.timedPlayerId = null;
        this.remainingMs = null;
        this.timerPaused = false;
        this.timerRemainingMs = null;
        this.turnEndsAt = null;
    }

    check(io, broadcastGameState) {
        const game = this.game;

        if (game.phase !== GAME_PHASES.GAMEPLAY || game.winner) {
            if (this.turnTimeout) {
                clearTimeout(this.turnTimeout);
            }

            this.turnTimeout = null;
            this.timedPlayerId = null;
            this.remainingMs = null;

            this.timerPaused = false;
            this.timerRemainingMs = null;
            this.turnEndsAt = null;

            return;
        }

        if (this.timerPaused) {
            return;
        }

        if (game.currentPlayerId === this.timedPlayerId) {
            return;
        }

        if (this.turnTimeout) {
            clearTimeout(this.turnTimeout);
        }

        this.timedPlayerId = game.currentPlayerId;
        this.remainingMs = this.timerRemainingMs ?? TURN_DURATION_MS;

        this.timerRemainingMs = null;
        this.turnEndsAt = Date.now() + this.remainingMs;

        this.turnTimeout = setTimeout(() => {
            this.remainingMs = null;
            this.timerRemainingMs = null;

            if (game.subphase === GAMEPLAY_SUBPHASES.PRODUCTION) {
                game.rollProductionDice();
                io.to(`lobby:${game.lobbyCode}`).emit("game:sound", "diceRoll");
            }

            if (game.subphase === GAMEPLAY_SUBPHASES.ROBBER_PLACEMENT) {
                game.autoMoveRobber();
            }

            // cancel active invention cards
            const currentPlayer = game.players.get(game.currentPlayerId);
            if (currentPlayer?.inventionActive) {
                game.cancelInvention();
            }

            if (game.endTurn()) {
                emitNextTurnStartSound(io, game);
            }

            broadcastGameState(game);
        }, this.remainingMs);
    }

    toggle() {
        const game = this.game;

        if (game.phase !== GAME_PHASES.GAMEPLAY || game.winner) {
            return false;
        }

        if (this.timerPaused) {
            this.timerPaused = false;
            this.turnEndsAt = null;
            this.timerRemainingMs = this.remainingMs;

            this.timedPlayerId = null;
            this.remainingMs = null;

            return true;
        }

        this.timerRemainingMs = Math.max(
            0,
            (this.turnEndsAt ?? Date.now()) - Date.now()
        );

        this.remainingMs = this.timerRemainingMs;
        this.timerPaused = true;
        this.turnEndsAt = null;

        if (this.turnTimeout) {
            clearTimeout(this.turnTimeout);
        }

        this.turnTimeout = null;

        return true;
    }

    reset() {
        if (this.turnTimeout) {
            clearTimeout(this.turnTimeout);
        }

        this.turnTimeout = null;
        this.timedPlayerId = null;
        this.remainingMs = null;
        this.timerPaused = false;
        this.timerRemainingMs = null;
        this.turnEndsAt = null;
    }
}

module.exports = TurnTimer;