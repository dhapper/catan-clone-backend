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

        this.initializePirate();
    }

    initializePirate() {
        if (!this.game.config.expansions.seafarers) {
            this.game.pirateTileId = null;
            return;
        }

        const waterTiles = [
            ...this.game.board.tiles.values()
        ].filter(tile => tile.type === "water");

        if (waterTiles.length === 0) {
            this.game.pirateTileId = null;
            return;
        }

        const middleIndex = Math.floor(waterTiles.length / 2);

        this.game.pirateTileId =
            waterTiles[middleIndex].id;
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

        if (tile.type === "water") {
            return false;
        }

        // The robber must actually move.
        if (tileId === this.game.robberTileId) {
            return false;
        }

        this.game.robberTileId = tileId;

        const tileResource =
            tile.resource ?? "desert";

        this.game.turnLog.addMessage(
            "ROBBER",
            `Robber moved to ${tileResource}:${tile.numberToken ?? "-"}`
        );

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

    movePirate(tileId) {
        if (!this.game.config.expansions.seafarers) {
            return false;
        }

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

        if (tile.type !== "water") {
            return false;
        }

        if (tileId === this.game.pirateTileId) {
            return false;
        }

        this.game.pirateTileId = tileId;

        this.game.turnLog.addMessage(
            "PIRATE",
            `Pirate moved to water:${tile.numberToken ?? "-"}`
        );

        this.game.subphase =
            GAMEPLAY_SUBPHASES.ACTION;

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

        this.game.turnLog.addMessage(
            "ROBBER",
            `${thief.name} stole resource from ${victim.name}`
        );

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

        const discardedResources =
            this.game.turnLog.formatResources(resources);

        this.game.turnLog.addMessage(
            "DISCARD",
            `${player.name} discarded ${discardedResources}`
        );

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

    autoMoveRobber() {
        if (this.game.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (
            this.game.subphase !==
            GAMEPLAY_SUBPHASES.ROBBER_PLACEMENT
        ) {
            return false;
        }

        const currentPlayerId = this.game.currentPlayerId;

        const eligibleTiles = [];

        for (const tile of this.game.board.tiles.values()) {
            // Cannot stay on the current robber tile.
            if (tile.id === this.game.robberTileId) {
                continue;
            }

            if (tile.type === "water") {
                continue;
            }

            let adjacentToCurrentPlayer = false;

            for (const vertexId of tile.vertices) {
                const vertex =
                    this.game.board.vertices.get(vertexId);

                if (
                    vertex?.building?.playerId ===
                    currentPlayerId
                ) {
                    adjacentToCurrentPlayer = true;
                    break;
                }
            }

            if (!adjacentToCurrentPlayer) {
                eligibleTiles.push(tile.id);
            }
        }

        if (eligibleTiles.length === 0) {
            return false;
        }

        const tileId =
            eligibleTiles[
            Math.floor(
                Math.random() * eligibleTiles.length
            )
            ];

        return this.moveRobber(tileId);
    }
}

module.exports = RobberManager;