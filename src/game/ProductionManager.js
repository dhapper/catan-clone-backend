const {
    GAME_PHASES,
    GAMEPLAY_SUBPHASES
} = require("../constants/GameConstants");

const {
    BUILDING_PRODUCTION
} = require("../constants/BuildingConstants");

class ProductionManager {
    constructor(game) {
        this.game = game;
    }

    rollProductionDice() {
        if (this.game.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (
            this.game.subphase !==
            GAMEPLAY_SUBPHASES.PRODUCTION
        ) {
            return false;
        }

        const roll1 =
            Math.floor(Math.random() * 6) + 1;

        const roll2 =
            Math.floor(Math.random() * 6) + 1;

        this.game.diceRoll = [roll1, roll2];

        const total = roll1 + roll2;
        // const total = 7;

        this.game.turnLog.setRoll(total);

        console.log(
            "DICE ROLL:",
            roll1,
            roll2,
            "TOTAL:",
            total
        );

        if (total === 7) {
            for (const player of this.game.players.values()) {
                const resourceCount =
                    Object.values(player.resources)
                        .reduce(
                            (total, amount) =>
                                total + amount,
                            0
                        );

                if (resourceCount > this.game.robberSafetyNumber) {
                    this.game.discardRequirements.set(
                        player.id,
                        Math.floor(resourceCount / 2)
                    );
                }
            }

            console.log(
                "DISCARD REQUIREMENTS:",
                Object.fromEntries(
                    this.game.discardRequirements
                )
            );

            if (this.game.discardRequirements.size > 0) {
                this.game.subphase =
                    GAMEPLAY_SUBPHASES.DISCARDING;
            } else {
                this.game.subphase =
                    GAMEPLAY_SUBPHASES.ROBBER_PLACEMENT;
            }

            return true;
        }

        const production = new Map();

        for (const tile of this.game.board.tiles.values()) {
            if (
                tile.numberToken !== total ||
                tile.id === this.game.robberTileId
            ) {
                continue;
            }

            if (!tile.resource) {
                continue;
            }

            if (!production.has(tile.resource)) {
                production.set(tile.resource, []);
            }

            for (const vertexId of tile.vertices) {
                const vertex =
                    this.game.board.vertices.get(vertexId);

                if (!vertex || !vertex.building) {
                    continue;
                }

                const amount =
                    BUILDING_PRODUCTION[
                    vertex.building.type
                    ];

                if (!amount) {
                    continue;
                }

                production
                    .get(tile.resource)
                    .push({
                        playerId:
                            vertex.building.playerId,
                        amount
                    });
            }
        }

        const playerProduction = new Map();

        for (
            const [resource, playerProductions]
            of production
        ) {
            const totalDemand =
                playerProductions.reduce(
                    (total, production) =>
                        total + production.amount,
                    0
                );

            if (
                this.game.bank.resources[resource] <
                totalDemand
            ) {
                this.game.turnLog.addMessage("PRODUCTION", `Insufficient ${resource} cards to distribute`);
                continue;
            }

            for (
                const production
                of playerProductions
            ) {
                this.game.giveResourceToPlayer(
                    production.playerId,
                    resource,
                    production.amount
                );

                if (!playerProduction.has(production.playerId)) {
                    playerProduction.set(
                        production.playerId,
                        {}
                    );
                }

                const resources =
                    playerProduction.get(
                        production.playerId
                    );

                resources[resource] =
                    (resources[resource] ?? 0) +
                    production.amount;
            }

        }

        for (
            const [playerId, resources]
            of playerProduction
        ) {
            const player =
                this.game.players.get(playerId);

            if (!player) {
                continue;
            }

            const producedResources =
                this.game.turnLog.formatResources(
                    resources
                );

            this.game.turnLog.addMessage(
                "PRODUCTION",
                `${player.name} produced ${producedResources}`
            );
        }

        this.game.subphase =
            GAMEPLAY_SUBPHASES.ACTION;

        return true;
    }
}

module.exports = ProductionManager;