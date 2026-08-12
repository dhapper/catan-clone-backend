const {
    GAME_PHASES,
    SETUP_SUBPHASES,
    GAMEPLAY_SUBPHASES
} = require("./GameConstants");

const SetupManager = require("./SetupManager");

class Game {
    constructor(board) {
        this.board = board;

        this.players = new Map();
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

            // Player has a building on this vertex
            if (
                vertex.building &&
                vertex.building.playerId === currentPlayerId
            ) {
                return true;
            }

            // Player has a road connected to this vertex
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

            // TODO: blocking logic
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

        // Setup phase: any empty vertex is currently allowed.
        if (this.phase === GAME_PHASES.SETUP) {
            for (const adjacentVertexId of vertex.adjacentVertices) {
                const adjacentVertex =
                    this.board.vertices.get(adjacentVertexId);

                if (adjacentVertex.building) {
                    return false;
                }
            }

            return true;
        }

        // TODO: Gameplay rules

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

        vertex.building = {
            type: "settlement",
            playerId: this.currentPlayerId
        };

        if (this.phase === GAME_PHASES.SETUP) {
            this.setupSettlementVertexId = vertexId;
            this.subphase = SETUP_SUBPHASES.PLACING_ROAD;
        }

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

        const currentIndex = forwardOrder.indexOf(this.currentPlayerId);

        const nextIndex = (currentIndex + 1) % playerCount;

        this.currentPlayerId = forwardOrder[nextIndex];

        this.diceRoll = null;
        this.subphase = GAMEPLAY_SUBPHASES.PRODUCTION;

        return true;
    }

}

module.exports = Game;