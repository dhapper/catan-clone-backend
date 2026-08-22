const {
    STRUCTURE_TYPES,
    BUILD_COSTS
} = require("../constants/BuildingConstants");

const {
    GAME_PHASES,
    SETUP_SUBPHASES,
    GAMEPLAY_SUBPHASES
} = require("../constants/GameConstants");

class BuildManager {
    constructor(game) {
        this.game = game;
    }

    canBuildRoad(edgeId) {
        const edge = this.game.board.edges.get(edgeId);

        if (!edge || edge.road) {
            return false;
        }

        const currentPlayerId = this.game.currentPlayerId;

        for (const vertexId of edge.vertices) {
            const vertex = this.game.board.vertices.get(vertexId);

            if (
                vertex.building &&
                vertex.building.playerId === currentPlayerId
            ) {
                return true;
            }

            if (
                vertex.building &&
                vertex.building.playerId !== currentPlayerId
            ) {
                continue;
            }

            for (const adjacentEdgeId of vertex.adjacentEdges) {
                const adjacentEdge =
                    this.game.board.edges.get(adjacentEdgeId);

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
        const edge = this.game.board.edges.get(edgeId);

        if (!edge || edge.road) {
            return false;
        }

        if (!this.game.setupSettlementVertexId) {
            return false;
        }

        return edge.vertices.includes(
            this.game.setupSettlementVertexId
        );
    }

    getBuildableRoads() {
        const buildableRoads = [];

        for (const edge of this.game.board.edges.values()) {
            if (this.game.phase === GAME_PHASES.SETUP) {
                if (this.canBuildSetupRoad(edge.id)) {
                    buildableRoads.push(edge.id);
                }
            } else if (this.canBuildRoad(edge.id)) {
                buildableRoads.push(edge.id);
            }
        }

        return buildableRoads;
    }

    placeRoad(edgeId) {
        const edge = this.game.board.edges.get(edgeId);

        if (!edge) {
            return false;
        }

        const canBuild =
            this.game.phase === GAME_PHASES.SETUP
                ? this.canBuildSetupRoad(edgeId)
                : this.canBuildRoad(edgeId);

        if (!canBuild) {
            return false;
        }

        if (this.game.phase !== GAME_PHASES.SETUP) {
            if (!this.game.canAfford(
                this.game.currentPlayerId,
                BUILD_COSTS[STRUCTURE_TYPES.ROAD]
            )) {
                return false;
            }

            this.game.payCost(
                this.game.currentPlayerId,
                BUILD_COSTS[STRUCTURE_TYPES.ROAD]
            );
        }

        edge.road = {
            playerId: this.game.currentPlayerId
        };

        if (this.game.phase === GAME_PHASES.SETUP) {
            this.game.setupSettlementVertexId = null;
            this.game.setup.advanceTurn();
        }

        return true;
    }

    canBuildSettlement(vertexId) {
        const vertex = this.game.board.vertices.get(vertexId);

        if (!vertex || vertex.building) {
            return false;
        }

        for (const adjacentVertexId of vertex.adjacentVertices) {
            const adjacentVertex =
                this.game.board.vertices.get(adjacentVertexId);

            if (adjacentVertex?.building) {
                return false;
            }
        }

        if (this.game.phase === GAME_PHASES.SETUP) {
            return true;
        }

        if (
            this.game.phase !== GAME_PHASES.GAMEPLAY ||
            this.game.subphase !== GAMEPLAY_SUBPHASES.ACTION
        ) {
            return false;
        }

        for (const edgeId of vertex.adjacentEdges) {
            const edge = this.game.board.edges.get(edgeId);

            if (
                edge &&
                edge.road &&
                edge.road.playerId === this.game.currentPlayerId
            ) {
                return true;
            }
        }

        return false;
    }

    getBuildableSettlements() {
        const buildableSettlements = [];

        for (const vertex of this.game.board.vertices.values()) {
            if (this.canBuildSettlement(vertex.id)) {
                buildableSettlements.push(vertex.id);
            }
        }

        return buildableSettlements;
    }

    placeSettlement(vertexId) {
        const vertex = this.game.board.vertices.get(vertexId);

        if (!this.canBuildSettlement(vertexId)) {
            return false;
        }

        if (this.game.phase !== GAME_PHASES.SETUP) {
            if (!this.game.canAfford(
                this.game.currentPlayerId,
                BUILD_COSTS[STRUCTURE_TYPES.SETTLEMENT]
            )) {
                return false;
            }

            this.game.payCost(
                this.game.currentPlayerId,
                BUILD_COSTS[STRUCTURE_TYPES.SETTLEMENT]
            );
        }

        vertex.building = {
            type: STRUCTURE_TYPES.SETTLEMENT,
            playerId: this.game.currentPlayerId
        };

        this.game.updatePlayerVictoryPoints(
            this.game.currentPlayerId
        );

        this.claimPort(vertexId);

        if (this.game.phase === GAME_PHASES.SETUP) {
            this.game.setupSettlementVertexId = vertexId;
            this.game.subphase = SETUP_SUBPHASES.PLACING_ROAD;
        }

        return true;
    }

    claimPort(vertexId) {
        const player =
            this.game.players.get(this.game.currentPlayerId);

        if (!player) {
            return false;
        }

        for (const port of this.game.board.ports) {
            if (port.ownerId) {
                continue;
            }

            if (!port.vertices.includes(vertexId)) {
                continue;
            }

            port.ownerId = this.game.currentPlayerId;
            player.ports.push(port);

            return true;
        }

        return false;
    }

    canBuildCity(vertexId) {
        const vertex = this.game.board.vertices.get(vertexId);

        if (!vertex) {
            return false;
        }

        if (!vertex.building) {
            return false;
        }

        if (vertex.building.playerId !== this.game.currentPlayerId) {
            return false;
        }

        if (vertex.building.type !== STRUCTURE_TYPES.SETTLEMENT) {
            return false;
        }

        if (
            this.game.phase !== GAME_PHASES.GAMEPLAY ||
            this.game.subphase !== GAMEPLAY_SUBPHASES.ACTION
        ) {
            return false;
        }

        return true;
    }

    getBuildableCities() {
        const buildableCities = [];

        for (const vertex of this.game.board.vertices.values()) {
            if (this.canBuildCity(vertex.id)) {
                buildableCities.push(vertex.id);
            }
        }

        return buildableCities;
    }

    placeCity(vertexId) {
        const vertex = this.game.board.vertices.get(vertexId);

        if (!this.canBuildCity(vertexId)) {
            return false;
        }

        if (!this.game.canAfford(
            this.game.currentPlayerId,
            BUILD_COSTS[STRUCTURE_TYPES.CITY]
        )) {
            return false;
        }

        this.game.payCost(
            this.game.currentPlayerId,
            BUILD_COSTS[STRUCTURE_TYPES.CITY]
        );

        vertex.building = {
            type: STRUCTURE_TYPES.CITY,
            playerId: this.game.currentPlayerId
        };

        this.game.updatePlayerVictoryPoints(
            this.game.currentPlayerId
        );

        return true;
    }

    getBuildAvailability(playerId) {
        return {
            road: this.game.canAfford(
                playerId,
                BUILD_COSTS[STRUCTURE_TYPES.ROAD]
            ),

            settlement: this.game.canAfford(
                playerId,
                BUILD_COSTS[STRUCTURE_TYPES.SETTLEMENT]
            ),

            city: this.game.canAfford(
                playerId,
                BUILD_COSTS[STRUCTURE_TYPES.CITY]
            ),

            developmentCard: this.game.canAfford(
                playerId,
                BUILD_COSTS[STRUCTURE_TYPES.DEVELOPMENT_CARD]
            )
        };
    }
}

module.exports = BuildManager;