const {
    GAME_PHASES,
    GAMEPLAY_SUBPHASES
} = require("../constants/GameConstants");

class TurnManager {
    constructor(game) {
        this.game = game;
    }

    endTurn() {
        if (this.game.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (
            this.game.subphase !==
            GAMEPLAY_SUBPHASES.ACTION
        ) {
            return false;
        }

        const playerCount = this.game.players.size;
        const setupOrderLength =
            this.game.setupTurnOrder.length;

        const forwardOrder =
            this.game.setupTurnOrder.slice(
                0,
                setupOrderLength / 2
            );

        const currentIndex =
            forwardOrder.indexOf(
                this.game.currentPlayerId
            );

        const nextIndex =
            (currentIndex + 1) % playerCount;

        this.game.currentPlayerId =
            forwardOrder[nextIndex];

        this.game.diceRoll = null;
        this.game.subphase =
            GAMEPLAY_SUBPHASES.PRODUCTION;

        return true;
    }
}

module.exports = TurnManager;