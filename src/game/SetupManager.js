const {
    GAME_PHASES,
    SETUP_SUBPHASES,
    GAMEPLAY_SUBPHASES
} = require("../constants/GameConstants");

class SetupManager {
    constructor(game) {
        this.game = game;
    }

    createTurnOrder() {
        const players = [...this.game.players.values()];

        players.sort((a, b) => {
            const aRolls = this.game.turnOrderRolls.get(a.id);
            const bRolls = this.game.turnOrderRolls.get(b.id);

            const aTotal = aRolls[0] + aRolls[1];
            const bTotal = bRolls[0] + bRolls[1];

            if (bTotal !== aTotal) {
                return bTotal - aTotal;
            }

            // Tie-breaker: join order
            return (
                Number(a.id.slice(1)) -
                Number(b.id.slice(1))
            );
        });

        const forwardOrder = players.map(
            player => player.id
        );

        const reverseOrder = [...forwardOrder].reverse();

        this.game.setupTurnOrder = [
            ...forwardOrder,
            ...reverseOrder
        ];

        this.game.setupTurnIndex = 0;
    }

    rollForTurnOrder(playerId) {
        if (this.game.turnOrderRolls.has(playerId)) {
            return false;
        }

        const roll1 = Math.floor(Math.random() * 6) + 1;
        const roll2 = Math.floor(Math.random() * 6) + 1;

        this.game.turnOrderRolls.set(playerId, [
            roll1,
            roll2
        ]);

        const allPlayersRolled =
            [...this.game.players.values()].every(
                player => this.game.turnOrderRolls.has(player.id)
            );

        if (allPlayersRolled) {
            this.startPlacement();
        }

        return true;
    }

    start() {
        this.game.phase = GAME_PHASES.SETUP;
        this.game.subphase = SETUP_SUBPHASES.ROLL_FOR_TURN_ORDER;

        this.game.currentPlayerId = null;
    }

    startPlacement() {
        this.createTurnOrder();

        this.game.subphase = SETUP_SUBPHASES.PLACING_SETTLEMENT;

        this.game.currentPlayerId = this.game.setupTurnOrder[0];
    }

    advanceTurn() {
        this.game.setupTurnIndex++;

        if (
            this.game.setupTurnIndex >=
            this.game.setupTurnOrder.length
        ) {
            this.finish();
            return;
        }

        this.game.currentPlayerId =
            this.game.setupTurnOrder[this.game.setupTurnIndex];

        this.game.subphase =
            SETUP_SUBPHASES.PLACING_SETTLEMENT;
    }

    finish() {
        this.game.phase = GAME_PHASES.GAMEPLAY;
        this.game.subphase = GAMEPLAY_SUBPHASES.PRODUCTION;

        // First player in the forward setup order
        // gets the first normal gameplay turn.
        this.game.currentPlayerId = this.game.setupTurnOrder[0];
    }
}

module.exports = SetupManager;