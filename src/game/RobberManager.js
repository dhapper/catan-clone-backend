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

        this.game.robberVictims = [];

        for (const vertexId of tile.vertices) {
            const vertex = this.game.board.vertices.get(vertexId);

            if (!vertex?.building) {
                continue;
            }

            const playerId = vertex.building.playerId;

            if (playerId === this.game.currentPlayerId) {
                continue;
            }

            if (!this.game.robberVictims.includes(playerId)) {
                this.game.robberVictims.push(playerId);
            }
        }

        if (this.game.robberVictims.length === 1) {
            this.stealResource(
                this.game.robberVictims[0]
            );

            this.game.robberVictims = [];
        }

        this.game.subphase = GAMEPLAY_SUBPHASES.ACTION;

        return true;
    }

    stealResource(victimId) {
        const thief = this.game.players.get(
            this.game.currentPlayerId
        );

        const victim = this.game.players.get(victimId);

        if (!thief || !victim) {
            return false;
        }

        if (victimId === this.game.currentPlayerId) {
            return false;
        }

        if (!this.game.robberVictims.includes(victimId)) {
            return false;
        }

        const availableResources =
            Object.keys(victim.resources).filter(
                resource => victim.resources[resource] > 0
            );

        if (availableResources.length === 0) {
            return false;
        }

        const resource =
            availableResources[
            Math.floor(
                Math.random() * availableResources.length
            )
            ];

        victim.removeResource(resource, 1);
        thief.addResource(resource, 1);

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

    startKnightRobberPlacement() {
        if (this.game.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (
            this.game.subphase !==
            GAMEPLAY_SUBPHASES.ACTION
        ) {
            return false;
        }

        if (!this.game.currentPlayerId) {
            return false;
        }

        this.game.subphase =
            GAMEPLAY_SUBPHASES.ROBBER_PLACEMENT;

        return true;
    }
}

module.exports = RobberManager;