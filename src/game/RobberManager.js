const { GAME_PHASES, GAMEPLAY_SUBPHASES } = require("../constants/GameConstants");

class RobberManager {
    constructor(game) {
        this.game = game;
    }

    initializeRobber() {
        const desertTile = [...this.game.board.tiles.values()].find(
            tile => tile.type === "desert"
        );

        if (desertTile) {
            this.game.robberTileId = desertTile.id;
        }
    }

    moveRobber(tileId) {
        if (this.game.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (
            this.game.subphase !==
            GAMEPLAY_SUBPHASES.ROBBER_PLACEMENT
        ) {
            return false;
        }

        const tile = this.game.board.tiles.get(tileId);

        if (!tile) {
            return false;
        }

        // The robber must actually move.
        if (tileId === this.game.robberTileId) {
            return false;
        }

        this.game.robberTileId = tileId;
        this.game.subphase = GAMEPLAY_SUBPHASES.ACTION;

        return true;
    }

    discardResources(playerId, resources) {
        if (this.game.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (
            this.game.subphase !==
            GAMEPLAY_SUBPHASES.DISCARDING
        ) {
            return false;
        }

        const requiredAmount =
            this.game.discardRequirements.get(playerId);

        if (!requiredAmount) {
            return false;
        }

        const player = this.game.players.get(playerId);

        if (!player) {
            return false;
        }

        // Validate each resource amount.
        for (const resource of Object.keys(player.resources)) {
            const amount = resources?.[resource] ?? 0;

            if (!Number.isInteger(amount) || amount < 0) {
                return false;
            }

            if (amount > player.resources[resource]) {
                return false;
            }
        }

        // Must discard exactly the required amount.
        const total =
            Object.values(resources).reduce(
                (sum, amount) => sum + amount,
                0
            );

        if (total !== requiredAmount) {
            return false;
        }

        // Return resources to the bank.
        for (const resource of Object.keys(player.resources)) {
            const amount = resources[resource] ?? 0;

            if (amount > 0) {
                this.game.returnResourceToBank(
                    playerId,
                    resource,
                    amount
                );
            }
        }

        // This player has finished discarding.
        this.game.discardRequirements.delete(playerId);

        // Everyone has finished.
        if (this.game.discardRequirements.size === 0) {
            this.game.subphase =
                GAMEPLAY_SUBPHASES.ROBBER_PLACEMENT;
        }

        return true;
    }
}

module.exports = RobberManager;