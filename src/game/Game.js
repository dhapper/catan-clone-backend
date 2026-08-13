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

        const total = roll1 + roll2;

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

        if (this.phase === GAME_PHASES.SETUP) {
            this.setupSettlementVertexId = vertexId;
            this.subphase = SETUP_SUBPHASES.PLACING_ROAD;
        }

        return true;
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