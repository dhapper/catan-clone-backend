const { GAME_PHASES, SETUP_SUBPHASES, GAMEPLAY_SUBPHASES } = require("../constants/GameConstants");
const { STRUCTURE_TYPES, BUILDING_PRODUCTION, BUILD_COSTS } = require("../constants/BuildingConstants");

const SetupManager = require("./SetupManager");
const Bank = require("./Bank");

class Game {
    constructor(board) {
        this.board = board;

        this.players = new Map();
        this.bank = new Bank();
        this.currentPlayerId = null;
        this.diceRoll = null;
        this.currentTrade = null;
        this.discardRequirements = new Map();
        this.robberTileId = null;

        const desertTile = [...this.board.tiles.values()].find(
            tile => tile.type === "desert"
        );

        if (desertTile) {
            this.robberTileId = desertTile.id;
        }

        this.phase = GAME_PHASES.LOBBY;
        this.subphase = SETUP_SUBPHASES.ROLL_FOR_TURN_ORDER;
        this.setupSettlementVertexId = null;

        this.colors = [
            "red",
            "blue",
            "green",
            "orange",
            "purple",
            "yellow"
        ];

        this.turnOrderRolls = new Map();
        this.setupTurnOrder = [];
        this.setupTurnIndex = 0;

        this.setup = new SetupManager(this);
    }

    addPlayer(player) {
        this.players.set(player.id, player);
    }

    rollProductionDice() {
        if (this.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (this.subphase !== GAMEPLAY_SUBPHASES.PRODUCTION) {
            return false;
        }

        const roll1 = Math.floor(Math.random() * 6) + 1;
        const roll2 = Math.floor(Math.random() * 6) + 1;

        this.diceRoll = [roll1, roll2];

        // const total = roll1 + roll2;
        const total = 7;

        console.log("DICE ROLL:", roll1, roll2, "TOTAL:", total);

        if (total === 7) {
            for (const player of this.players.values()) {
                const resourceCount = Object.values(player.resources)
                    .reduce((total, amount) => total + amount, 0);

                if (resourceCount > 7) {
                    this.discardRequirements.set(
                        player.id,
                        Math.floor(resourceCount / 2)
                    );
                }
            }

            console.log(
                "DISCARD REQUIREMENTS:",
                Object.fromEntries(this.discardRequirements)
            );

            this.subphase = GAMEPLAY_SUBPHASES.DISCARDING;

            return true;
        }

        // Map each resource to all players who should receive it.
        const production = new Map();

        for (const tile of this.board.tiles.values()) {
            if (tile.numberToken !== total) {
                continue;
            }

            if (!tile.resource) {
                continue;
            }

            if (!production.has(tile.resource)) {
                production.set(tile.resource, []);
            }

            for (const vertexId of tile.vertices) {
                const vertex = this.board.vertices.get(vertexId);

                if (!vertex || !vertex.building) {
                    continue;
                }

                const amount =
                    BUILDING_PRODUCTION[vertex.building.type];

                if (!amount) {
                    continue;
                }

                production
                    .get(tile.resource)
                    .push({
                        playerId: vertex.building.playerId,
                        amount
                    });
            }
        }

        // Process each resource independently.
        for (const [resource, playerProductions] of production) {
            const totalDemand = playerProductions.reduce(
                (total, production) =>
                    total + production.amount,
                0
            );

            // Catan rule:
            // If the bank cannot provide the entire amount,
            // nobody receives this resource.
            if (this.bank.resources[resource] < totalDemand) {
                continue;
            }

            for (const production of playerProductions) {
                this.giveResourceToPlayer(
                    production.playerId,
                    resource,
                    production.amount
                );
            }
        }

        this.subphase = GAMEPLAY_SUBPHASES.ACTION;

        return true;
    }

    canBuildRoad(edgeId) {
        const edge = this.board.edges.get(edgeId);

        if (!edge) {
            return false;
        }

        // Edge must be empty
        if (edge.road) {
            return false;
        }

        const currentPlayerId = this.currentPlayerId;

        // Check both vertices connected to this edge
        for (const vertexId of edge.vertices) {
            const vertex = this.board.vertices.get(vertexId);

            // Your own building connects your road network.
            if (
                vertex.building &&
                vertex.building.playerId === currentPlayerId
            ) {
                return true;
            }

            // An opponent's building blocks your road network
            // from continuing through this vertex.
            if (
                vertex.building &&
                vertex.building.playerId !== currentPlayerId
            ) {
                continue;
            }

            // No building here, so check for one of your
            // connected roads.
            for (const adjacentEdgeId of vertex.adjacentEdges) {
                const adjacentEdge =
                    this.board.edges.get(adjacentEdgeId);

                if (
                    adjacentEdge &&
                    adjacentEdge.road &&
                    adjacentEdge.road.playerId === currentPlayerId
                ) {
                    return true;
                }
            }
        }

        return false;
    }

    canBuildSetupRoad(edgeId) {
        const edge = this.board.edges.get(edgeId);

        if (!edge) {
            return false;
        }

        // Edge must be empty
        if (edge.road) {
            return false;
        }

        // Must have just placed a settlement
        if (!this.setupSettlementVertexId) {
            return false;
        }

        // Road must connect directly to the setup settlement
        return edge.vertices.includes(this.setupSettlementVertexId);
    }

    getBuildableRoads() {
        const buildableRoads = [];

        for (const edge of this.board.edges.values()) {
            if (this.phase === GAME_PHASES.SETUP) {
                if (this.canBuildSetupRoad(edge.id)) {
                    buildableRoads.push(edge.id);
                }
            } else {
                if (this.canBuildRoad(edge.id)) {
                    buildableRoads.push(edge.id);
                }
            }
        }

        return buildableRoads;
    }

    placeRoad(edgeId) {
        const edge = this.board.edges.get(edgeId);

        if (!edge) {
            return false;
        }

        const canBuild =
            this.phase === GAME_PHASES.SETUP
                ? this.canBuildSetupRoad(edgeId)
                : this.canBuildRoad(edgeId);

        if (!canBuild) {
            return false;
        }

        // Roads are free during setup.
        if (this.phase !== GAME_PHASES.SETUP) {
            if (!this.canAfford(
                this.currentPlayerId,
                BUILD_COSTS.road
            )) {
                return false;
            }

            this.payCost(
                this.currentPlayerId,
                BUILD_COSTS.road
            );
        }

        edge.road = {
            playerId: this.currentPlayerId
        };

        if (this.phase === GAME_PHASES.SETUP) {
            this.setupSettlementVertexId = null;
            this.setup.advanceTurn();
        }

        return true;
    }

    canBuildSettlement(vertexId) {
        const vertex = this.board.vertices.get(vertexId);

        if (!vertex) {
            return false;
        }

        // Vertex must be empty
        if (vertex.building) {
            return false;
        }

        // No adjacent building allowed
        for (const adjacentVertexId of vertex.adjacentVertices) {
            const adjacentVertex =
                this.board.vertices.get(adjacentVertexId);

            if (adjacentVertex?.building) {
                return false;
            }
        }

        // Setup phase
        if (this.phase === GAME_PHASES.SETUP) {
            return true;
        }

        // Gameplay phase
        if (this.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (this.subphase !== GAMEPLAY_SUBPHASES.ACTION) {
            return false;
        }

        // Settlement must connect to one of the current player's roads
        for (const edgeId of vertex.adjacentEdges) {
            const edge = this.board.edges.get(edgeId);

            if (
                edge &&
                edge.road &&
                edge.road.playerId === this.currentPlayerId
            ) {
                return true;
            }
        }

        return false;
    }

    getBuildableSettlements() {
        const buildableSettlements = [];

        for (const vertex of this.board.vertices.values()) {
            if (this.canBuildSettlement(vertex.id)) {
                buildableSettlements.push(vertex.id);
            }
        }

        return buildableSettlements;
    }

    placeSettlement(vertexId) {
        const vertex = this.board.vertices.get(vertexId);

        if (!this.canBuildSettlement(vertexId)) {
            return false;
        }

        // Settlements are free during setup.
        if (this.phase !== GAME_PHASES.SETUP) {
            if (!this.canAfford(
                this.currentPlayerId,
                BUILD_COSTS[STRUCTURE_TYPES.SETTLEMENT]
            )) {
                return false;
            }

            this.payCost(
                this.currentPlayerId,
                BUILD_COSTS[STRUCTURE_TYPES.SETTLEMENT]
            );
        }

        vertex.building = {
            type: STRUCTURE_TYPES.SETTLEMENT,
            playerId: this.currentPlayerId
        };

        this.claimPort(vertexId);

        if (this.phase === GAME_PHASES.SETUP) {
            this.setupSettlementVertexId = vertexId;
            this.subphase = SETUP_SUBPHASES.PLACING_ROAD;
        }

        return true;
    }

    claimPort(vertexId) {
        const player = this.players.get(this.currentPlayerId);

        if (!player) {
            return false;
        }

        for (const port of this.board.ports) {
            if (port.ownerId) {
                continue;
            }

            if (!port.vertices.includes(vertexId)) {
                continue;
            }

            port.ownerId = this.currentPlayerId;
            player.ports.push(port);

            return true;
        }

        return false;
    }

    canBuildCity(vertexId) {
        const vertex = this.board.vertices.get(vertexId);

        if (!vertex) {
            return false;
        }

        // A city must replace an existing settlement.
        if (!vertex.building) {
            return false;
        }

        // The settlement must belong to the current player.
        if (vertex.building.playerId !== this.currentPlayerId) {
            return false;
        }

        // The existing building must be a settlement.
        if (vertex.building.type !== STRUCTURE_TYPES.SETTLEMENT) {
            return false;
        }

        // Cities can only be built during gameplay.
        if (this.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        // Cities can only be built during the action subphase.
        if (this.subphase !== GAMEPLAY_SUBPHASES.ACTION) {
            return false;
        }

        return true;
    }

    getBuildableCities() {
        const buildableCities = [];

        for (const vertex of this.board.vertices.values()) {
            if (this.canBuildCity(vertex.id)) {
                buildableCities.push(vertex.id);
            }
        }

        return buildableCities;
    }

    placeCity(vertexId) {
        const vertex = this.board.vertices.get(vertexId);

        if (!this.canBuildCity(vertexId)) {
            return false;
        }

        if (!this.canAfford(
            this.currentPlayerId,
            BUILD_COSTS[STRUCTURE_TYPES.CITY]
        )) {
            return false;
        }

        this.payCost(
            this.currentPlayerId,
            BUILD_COSTS[STRUCTURE_TYPES.CITY]
        );

        vertex.building = {
            type: STRUCTURE_TYPES.CITY,
            playerId: this.currentPlayerId
        };

        return true;
    }

    endTurn() {
        if (this.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (this.subphase !== GAMEPLAY_SUBPHASES.ACTION) {
            return false;
        }

        const playerCount = this.players.size;
        const setupOrderLength = this.setupTurnOrder.length;

        const forwardOrder =
            this.setupTurnOrder.slice(
                0,
                setupOrderLength / 2
            );

        const currentIndex =
            forwardOrder.indexOf(this.currentPlayerId);

        const nextIndex =
            (currentIndex + 1) % playerCount;

        this.currentPlayerId = forwardOrder[nextIndex];

        this.diceRoll = null;
        this.subphase = GAMEPLAY_SUBPHASES.PRODUCTION;

        return true;
    }

    giveResourceToPlayer(playerId, resource, amount) {
        const player = this.players.get(playerId);

        if (!player) {
            return false;
        }

        if (!Number.isInteger(amount) || amount <= 0) {
            return false;
        }

        if (!(resource in player.resources)) {
            return false;
        }

        if (this.bank.resources[resource] < amount) {
            return false;
        }

        this.bank.removeResource(resource, amount);
        player.addResource(resource, amount);

        return true;
    }

    returnResourceToBank(playerId, resource, amount) {
        const player = this.players.get(playerId);

        if (!player) {
            return false;
        }

        if (!Number.isInteger(amount) || amount <= 0) {
            return false;
        }

        if (!(resource in player.resources)) {
            return false;
        }

        if (player.resources[resource] < amount) {
            return false;
        }

        player.removeResource(resource, amount);
        this.bank.addResource(resource, amount);

        return true;
    }

    canAfford(playerId, cost) {
        const player = this.players.get(playerId);

        if (!player) {
            return false;
        }

        for (const [resource, amount] of Object.entries(cost)) {
            if (!(resource in player.resources)) {
                return false;
            }

            if (player.resources[resource] < amount) {
                return false;
            }
        }

        return true;
    }

    moveRobber(tileId) {
        if (this.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (this.subphase !== GAMEPLAY_SUBPHASES.ROBBER_PLACEMENT) {
            return false;
        }

        const tile = this.board.tiles.get(tileId);

        if (!tile) {
            return false;
        }

        // The robber must actually move.
        if (tileId === this.robberTileId) {
            return false;
        }

        this.robberTileId = tileId;

        this.subphase = GAMEPLAY_SUBPHASES.ACTION;

        return true;
    }

    payCost(playerId, cost) {
        const player = this.players.get(playerId);

        if (!player) {
            return false;
        }

        if (!this.canAfford(playerId, cost)) {
            return false;
        }

        for (const [resource, amount] of Object.entries(cost)) {
            player.removeResource(resource, amount);
            this.bank.addResource(resource, amount);
        }

        return true;
    }

    bankTrade(offeredResources, wantedResources) {
        if (this.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (this.subphase !== GAMEPLAY_SUBPHASES.ACTION) {
            return false;
        }

        const player = this.players.get(this.currentPlayerId);

        if (!player) {
            return false;
        }

        const resources = Object.keys(player.resources);

        // Validate the resource objects.
        for (const resource of resources) {
            if (
                !Number.isInteger(offeredResources?.[resource] ?? 0) ||
                !Number.isInteger(wantedResources?.[resource] ?? 0)
            ) {
                return false;
            }

            if (
                (offeredResources?.[resource] ?? 0) < 0 ||
                (wantedResources?.[resource] ?? 0) < 0
            ) {
                return false;
            }
        }

        // Player must actually have everything they are offering.
        for (const resource of resources) {
            const amount = offeredResources[resource] ?? 0;

            if (player.resources[resource] < amount) {
                return false;
            }
        }

        // Determine the player's best trading ratio for each resource.
        const tradeRatios = {};

        for (const resource of resources) {
            tradeRatios[resource] = 4;

            for (const port of player.ports) {
                if (
                    port.resource === resource ||
                    port.resource === "any"
                ) {
                    const ratio =
                        Number.parseInt(
                            port.offer.split(":")[0]
                        );

                    tradeRatios[resource] =
                        Math.min(
                            tradeRatios[resource],
                            ratio
                        );
                }
            }
        }

        // Validate each offered resource independently.
        for (const resource of resources) {
            const offered = offeredResources[resource] ?? 0;
            const wanted = wantedResources[resource] ?? 0;

            if (offered === 0) {
                continue;
            }

            const ratio = tradeRatios[resource];

            // Offered amount must be an exact multiple of the
            // applicable trade ratio.
            if (offered % ratio !== 0) {
                return false;
            }

            // Each completed trade gives one requested resource.
            const tradeCount = offered / ratio;

            // If the player is also requesting this same resource,
            // account for that separately below.
            if (wanted > 0) {
                continue;
            }

            // Nothing else required here.
            void tradeCount;
        }

        // Calculate the total resources the bank must provide.
        const bankDemand = {};

        for (const resource of resources) {
            bankDemand[resource] = wantedResources[resource] ?? 0;
        }

        // Calculate how many resources the offered amounts actually
        // purchase.
        const totalTradeUnits =
            resources.reduce(
                (total, resource) => {
                    const offered =
                        offeredResources[resource] ?? 0;

                    if (offered === 0) {
                        return total;
                    }

                    return total + offered / tradeRatios[resource];
                },
                0
            );

        const totalWanted =
            resources.reduce(
                (total, resource) =>
                    total + bankDemand[resource],
                0
            );

        // The requested amount must exactly match the number
        // of resources being purchased.
        if (totalWanted !== totalTradeUnits) {
            return false;
        }

        // Bank must have everything requested.
        for (const resource of resources) {
            if (
                this.bank.resources[resource] <
                bankDemand[resource]
            ) {
                return false;
            }
        }

        // Execute the trade.
        for (const resource of resources) {
            const amount =
                offeredResources[resource] ?? 0;

            if (amount > 0) {
                this.returnResourceToBank(
                    this.currentPlayerId,
                    resource,
                    amount
                );
            }
        }

        for (const resource of resources) {
            const amount =
                bankDemand[resource];

            if (amount > 0) {
                this.giveResourceToPlayer(
                    this.currentPlayerId,
                    resource,
                    amount
                );
            }
        }

        return true;
    }

    createTrade(offeredResources, wantedResources) {
        if (this.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (this.subphase !== GAMEPLAY_SUBPHASES.ACTION) {
            return false;
        }

        // Only one active trade at a time.
        if (this.currentTrade) {
            return false;
        }

        const player = this.players.get(this.currentPlayerId);

        if (!player) {
            return false;
        }

        const resources = Object.keys(player.resources);

        // Validate the resource objects.
        for (const resource of resources) {
            const offered = offeredResources?.[resource] ?? 0;
            const wanted = wantedResources?.[resource] ?? 0;

            if (!Number.isInteger(offered) || !Number.isInteger(wanted)) {
                return false;
            }

            if (offered < 0 || wanted < 0) {
                return false;
            }
        }

        // The player must actually have everything they are offering.
        for (const resource of resources) {
            const amount = offeredResources[resource] ?? 0;

            if (player.resources[resource] < amount) {
                return false;
            }
        }

        // Must actually offer something and want something.
        const hasOffer = resources.some(
            resource => (offeredResources[resource] ?? 0) > 0
        );

        const hasWanted = resources.some(
            resource => (wantedResources[resource] ?? 0) > 0
        );

        if (!hasOffer || !hasWanted) {
            return false;
        }

        this.currentTrade = {
            id: `trade-${Date.now()}`,
            playerId: this.currentPlayerId,
            offered: { ...offeredResources },
            wanted: { ...wantedResources },
            acceptedBy: [],
            declinedBy: []
        };

        return true;
    }

    acceptTrade(playerId) {
        if (this.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (this.subphase !== GAMEPLAY_SUBPHASES.ACTION) {
            return false;
        }

        if (!this.currentTrade) {
            return false;
        }

        // Trade creator cannot accept their own trade.
        if (playerId === this.currentTrade.playerId) {
            return false;
        }

        const player = this.players.get(playerId);

        if (!player) {
            return false;
        }

        // Player must be able to provide everything
        // requested by the trade.
        for (const resource of Object.keys(player.resources)) {
            const amount =
                this.currentTrade.wanted[resource] ?? 0;

            if (player.resources[resource] < amount) {
                return false;
            }
        }

        // Player has already accepted.
        if (this.currentTrade.acceptedBy.includes(playerId)) {
            return false;
        }

        this.currentTrade.acceptedBy.push(playerId);

        return true;
    }

    declineTrade(playerId) {
        if (!this.currentTrade) {
            return false;
        }

        if (this.currentTrade.playerId === playerId) {
            return false;
        }

        if (this.currentTrade.acceptedBy.includes(playerId)) {
            return false;
        }

        if (!this.currentTrade.declinedBy) {
            this.currentTrade.declinedBy = [];
        }

        if (this.currentTrade.declinedBy.includes(playerId)) {
            return false;
        }

        this.currentTrade.declinedBy.push(playerId);

        return true;
    }

    resolveTrade(playerId) {
        if (this.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (this.subphase !== GAMEPLAY_SUBPHASES.ACTION) {
            return false;
        }

        if (!this.currentTrade) {
            return false;
        }

        // The trade creator must be the current player.
        if (this.currentTrade.playerId !== this.currentPlayerId) {
            return false;
        }

        // The selected player must have accepted the trade.
        if (!this.currentTrade.acceptedBy.includes(playerId)) {
            return false;
        }

        const creator = this.players.get(this.currentTrade.playerId);
        const recipient = this.players.get(playerId);

        if (!creator || !recipient) {
            return false;
        }

        // Verify the creator still has everything they offered.
        for (const [resource, amount] of Object.entries(
            this.currentTrade.offered
        )) {
            if (creator.resources[resource] < amount) {
                return false;
            }
        }

        // Verify the recipient still has everything the creator wanted.
        for (const [resource, amount] of Object.entries(
            this.currentTrade.wanted
        )) {
            if (recipient.resources[resource] < amount) {
                return false;
            }
        }

        // Transfer creator's offered resources to recipient.
        for (const [resource, amount] of Object.entries(
            this.currentTrade.offered
        )) {
            if (amount > 0) {
                creator.removeResource(resource, amount);
                recipient.addResource(resource, amount);
            }
        }

        // Transfer recipient's resources to creator.
        for (const [resource, amount] of Object.entries(
            this.currentTrade.wanted
        )) {
            if (amount > 0) {
                recipient.removeResource(resource, amount);
                creator.addResource(resource, amount);
            }
        }

        this.currentTrade = null;

        return true;
    }

    cancelTrade(playerId) {
        if (this.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (this.subphase !== GAMEPLAY_SUBPHASES.ACTION) {
            return false;
        }

        if (!this.currentTrade) {
            return false;
        }

        // Only the player who created the trade
        // can cancel it.
        if (this.currentTrade.playerId !== playerId) {
            return false;
        }

        this.currentTrade = null;

        return true;
    }

    discardResources(playerId, resources) {
        if (this.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (this.subphase !== GAMEPLAY_SUBPHASES.DISCARDING) {
            return false;
        }

        const requiredAmount =
            this.discardRequirements.get(playerId);

        if (!requiredAmount) {
            return false;
        }

        const player = this.players.get(playerId);

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
                this.returnResourceToBank(
                    playerId,
                    resource,
                    amount
                );
            }
        }

        // This player has finished discarding.
        this.discardRequirements.delete(playerId);

        // Everyone has finished.
        if (this.discardRequirements.size === 0) {
            this.subphase = GAMEPLAY_SUBPHASES.ROBBER_PLACEMENT;
        }

        return true;
    }

    getBuildAvailability(playerId) {
        return {
            road: this.canAfford(
                playerId,
                BUILD_COSTS[STRUCTURE_TYPES.ROAD]
            ),

            settlement: this.canAfford(
                playerId,
                BUILD_COSTS[STRUCTURE_TYPES.SETTLEMENT]
            ),

            city: this.canAfford(
                playerId,
                BUILD_COSTS[STRUCTURE_TYPES.CITY]
            ),

            developmentCard: this.canAfford(
                playerId,
                BUILD_COSTS[STRUCTURE_TYPES.DEVELOPMENT_CARD]
            )
        };
    }
}

module.exports = Game;