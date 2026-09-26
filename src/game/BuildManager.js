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

        if (this.game.config.expansions.seafarers) {
            const hasLandTile = edge.adjacentTiles.some(tileId => {
                const tile = this.game.board.tiles.get(tileId);
                return tile && tile.type !== "water";
            });

            if (!hasLandTile) {
                return false;
            }
        }

        const currentPlayerId = this.game.currentPlayerId;

        const player = this.game.players.get(
            this.game.currentPlayerId
        );

        if (!player || player.pieces?.road <= 0) {
            return false;
        }

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

    canBuildShip(edgeId) {
        if (!this.game.config.expansions.seafarers) {
            return false;
        }

        const edge = this.game.board.edges.get(edgeId);

        // console.log("SHIP EDGE:", {
        //     edgeId,
        //     vertices: edge?.vertices,
        //     adjacentTiles: edge?.adjacentTiles,
        //     road: edge?.road,
        //     ship: edge?.ship
        // });

        if (!edge || edge.road || edge.ship) {
            return false;
        }

        const player = this.game.players.get(
            this.game.currentPlayerId
        );

        if (!player || player.pieces?.ship <= 0) {
            return false;
        }

        // A ship must be placed on a coastal edge.
        const hasWaterTile = edge.adjacentTiles.some(tileId => {
            const tile = this.game.board.tiles.get(tileId);
            return tile?.type === "water";
        });

        if (!hasWaterTile) {
            return false;
        }

        const currentPlayerId = this.game.currentPlayerId;

        for (const vertexId of edge.vertices) {
            const vertex = this.game.board.vertices.get(vertexId);

            // Own settlement/city connects to the ship network.
            if (
                vertex.building &&
                vertex.building.playerId === currentPlayerId
            ) {
                return true;
            }

            // Opponent building blocks the network at this vertex.
            if (
                vertex.building &&
                vertex.building.playerId !== currentPlayerId
            ) {
                continue;
            }

            // Own ship connects to the ship network.
            for (const adjacentEdgeId of vertex.adjacentEdges) {
                const adjacentEdge =
                    this.game.board.edges.get(adjacentEdgeId);

                if (
                    adjacentEdge &&
                    adjacentEdge.ship &&
                    adjacentEdge.ship.playerId === currentPlayerId
                ) {
                    return true;
                }
            }
        }

        // console.log("SHIP CHECK:", {
        //     currentPlayerId,
        //     vertices: edge.vertices.map(vertexId => {
        //         const vertex = this.game.board.vertices.get(vertexId);

        //         return {
        //             id: vertexId,
        //             building: vertex?.building,
        //             adjacentEdges: vertex?.adjacentEdges.map(adjacentEdgeId => {
        //                 const adjacentEdge =
        //                     this.game.board.edges.get(adjacentEdgeId);

        //                 return {
        //                     id: adjacentEdgeId,
        //                     road: adjacentEdge?.road,
        //                     ship: adjacentEdge?.ship
        //                 };
        //             })
        //         };
        //     }),
        //     tiles: edge.adjacentTiles.map(tileId => {
        //         const tile = this.game.board.tiles.get(tileId);

        //         return {
        //             id: tileId,
        //             type: tile?.type
        //         };
        //     })
        // });

        return false;
    }

    canMoveShip(fromEdgeId, toEdgeId) {
        if (!this.game.config.expansions.seafarers) {
            return false;
        }

        if (
            this.game.phase !== GAME_PHASES.GAMEPLAY ||
            this.game.subphase !== GAMEPLAY_SUBPHASES.ACTION
        ) {
            return false;
        }

        const player = this.game.players.get(
            this.game.currentPlayerId
        );

        if (!player || player.shipMoved) {
            return false;
        }

        const fromEdge = this.game.board.edges.get(fromEdgeId);
        const toEdge = this.game.board.edges.get(toEdgeId);

        if (!fromEdge || !toEdge) {
            return false;
        }

        // Source must contain the current player's ship.
        if (
            !fromEdge.ship ||
            fromEdge.ship.playerId !== this.game.currentPlayerId
        ) {
            return false;
        }

        // A ship built this turn cannot be moved.
        if (fromEdge.ship.builtThisTurn) {
            return false;
        }

        // Destination must be empty.
        if (toEdge.road || toEdge.ship) {
            return false;
        }

        // Destination must be a coastal edge.
        const hasWaterTile = toEdge.adjacentTiles.some(tileId => {
            const tile = this.game.board.tiles.get(tileId);
            return tile?.type === "water";
        });

        if (!hasWaterTile) {
            return false;
        }

        /*
         * The source ship must be at an open end.
         *
         * A ship is open when neither endpoint connects
         * to one of the player's ships or buildings.
         */
        const isOpen = fromEdge.vertices.some(vertexId => {
            const vertex =
                this.game.board.vertices.get(vertexId);

            if (!vertex) {
                return false;
            }

            // Our building closes the shipping route.
            if (
                vertex.building &&
                vertex.building.playerId === this.game.currentPlayerId
            ) {
                return false;
            }

            // Our ship on another edge closes the route.
            const hasOwnAdjacentShip =
                vertex.adjacentEdges.some(adjacentEdgeId => {
                    if (adjacentEdgeId === fromEdgeId) {
                        return false;
                    }

                    const adjacentEdge =
                        this.game.board.edges.get(adjacentEdgeId);

                    return (
                        adjacentEdge?.ship &&
                        adjacentEdge.ship.playerId ===
                        this.game.currentPlayerId
                    );
                });

            return !hasOwnAdjacentShip;
        });

        if (!isOpen) {
            return false;
        }

        /*
         * Destination must be connected to the player's
         * shipping network.
         *
         * We temporarily treat the source ship as removed,
         * because the moved ship is no longer there.
         */
        const currentPlayerId =
            this.game.currentPlayerId;

        for (const vertexId of toEdge.vertices) {
            const vertex =
                this.game.board.vertices.get(vertexId);

            if (!vertex) {
                continue;
            }

            // Our building connects to the shipping network.
            if (
                vertex.building &&
                vertex.building.playerId === currentPlayerId
            ) {
                return true;
            }

            // Opponent building blocks this endpoint.
            if (
                vertex.building &&
                vertex.building.playerId !== currentPlayerId
            ) {
                continue;
            }

            // Our existing ship connects to the network.
            for (const adjacentEdgeId of vertex.adjacentEdges) {
                if (adjacentEdgeId === fromEdgeId) {
                    continue;
                }

                const adjacentEdge =
                    this.game.board.edges.get(adjacentEdgeId);

                if (
                    adjacentEdge?.ship &&
                    adjacentEdge.ship.playerId === currentPlayerId
                ) {
                    return true;
                }
            }
        }

        return false;
    }

    getMovableShips() {
        console.log("GET MOVABLE SHIPS");

        if (!this.game.config.expansions.seafarers) {
            console.log("Seafarers disabled");
            return [];
        }

        const player = this.game.players.get(
            this.game.currentPlayerId
        );

        console.log("Current player:", this.game.currentPlayerId);
        console.log("Player:", player);
        console.log("shipMoved:", player?.shipMoved);
        if (!player || player.shipMoved) {
            return [];
        }

        const movableShips = [];

        for (const edge of this.game.board.edges.values()) {
            // console.log(
            //     "SHIP CHECK:",
            //     edge.id,
            //     edge.ship
            // );
            if (
                edge.ship &&
                edge.ship.playerId === this.game.currentPlayerId &&
                !edge.ship.builtThisTurn
            ) {
                const isOpen = edge.vertices.some(vertexId => {
                    const vertex =
                        this.game.board.vertices.get(vertexId);

                    if (!vertex) {
                        return false;
                    }

                    if (
                        vertex.building &&
                        vertex.building.playerId ===
                        this.game.currentPlayerId
                    ) {
                        return false;
                    }

                    const hasOwnAdjacentShip =
                        vertex.adjacentEdges.some(adjacentEdgeId => {
                            if (adjacentEdgeId === edge.id) {
                                return false;
                            }

                            const adjacentEdge =
                                this.game.board.edges.get(adjacentEdgeId);

                            return (
                                adjacentEdge?.ship &&
                                adjacentEdge.ship.playerId ===
                                this.game.currentPlayerId
                            );
                        });

                    return !hasOwnAdjacentShip;
                });

                if (isOpen) {
                    movableShips.push(edge.id);
                }
            }
        }

        console.log("Movable ships:", movableShips);
        return movableShips;
    }

    getShipMoveDestinations(fromEdgeId) {
        if (!this.game.config.expansions.seafarers) {
            return [];
        }

        const destinations = [];

        for (const edge of this.game.board.edges.values()) {
            if (this.canMoveShip(fromEdgeId, edge.id)) {
                destinations.push(edge.id);
            }
        }

        return destinations;
    }

    moveShip(fromEdgeId, toEdgeId) {
        if (!this.canMoveShip(fromEdgeId, toEdgeId)) {
            return {
                success: false
            };
        }

        const fromEdge =
            this.game.board.edges.get(fromEdgeId);

        const toEdge =
            this.game.board.edges.get(toEdgeId);

        toEdge.ship = fromEdge.ship;
        fromEdge.ship = null;

        const player =
            this.game.players.get(this.game.currentPlayerId);

        player.shipMoved = true;

        this.game.turnLog.addMessage(
            "BUILD",
            "Ship moved"
        );

        return {
            success: true,
            achievementChanged: false
        };
    }

    canBuildSetupRoad(edgeId) {
        const edge = this.game.board.edges.get(edgeId);

        if (!edge || edge.road) {
            return false;
        }

        if (this.game.config.expansions.seafarers) {
            const hasLandTile = edge.adjacentTiles.some(tileId => {
                const tile = this.game.board.tiles.get(tileId);
                return tile && tile.type !== "water";
            });

            if (!hasLandTile) {
                return false;
            }
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

    getBuildableShips() {
        if (!this.game.config.expansions.seafarers) {
            return [];
        }

        const buildableShips = [];

        for (const edge of this.game.board.edges.values()) {
            if (this.canBuildShip(edge.id)) {
                buildableShips.push(edge.id);
            }
        }

        return buildableShips;
    }

    placeRoad(edgeId) {
        const edge = this.game.board.edges.get(edgeId);
        const setupRoad = this.game.phase === GAME_PHASES.SETUP;

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
            const player = this.game.players.get(
                this.game.currentPlayerId
            );

            if (!player) {
                return false;
            }

            // Road Building allows free road placement.
            if (this.isRoadBuildingActive()) {
                player.roadBuildingRemaining--;
            } else {
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
        }

        edge.road = {
            playerId: this.game.currentPlayerId
        };

        const player = this.game.players.get(
            this.game.currentPlayerId
        );

        player.pieces.road--;

        if (!setupRoad) {
            this.game.turnLog.addMessage("INFRA", "Road placed");
        }

        const achievementChanged =
            this.game.updateLongestRoad();

        if (this.game.phase === GAME_PHASES.SETUP) {
            this.game.setupSettlementVertexId = null;
            this.game.setup.advanceTurn();
        }

        return {
            success: true,
            achievementChanged
        };
    }

    placeShip(edgeId) {
        if (!this.canBuildShip(edgeId)) {
            return {
                success: false
            };
        }

        const player = this.game.players.get(
            this.game.currentPlayerId
        );

        if (!this.game.canAfford(
            this.game.currentPlayerId,
            BUILD_COSTS[STRUCTURE_TYPES.SHIP]
        )) {
            return {
                success: false
            };
        }

        this.game.payCost(
            this.game.currentPlayerId,
            BUILD_COSTS[STRUCTURE_TYPES.SHIP]
        );

        const edge = this.game.board.edges.get(edgeId);

        edge.ship = {
            playerId: this.game.currentPlayerId,
            builtThisTurn: true
        };

        player.pieces.ship--;

        this.game.turnLog.addMessage(
            "BUILD",
            "Ship placed"
        );

        return {
            success: true,
            achievementChanged: false
        };
    }

    isRoadBuildingActive() {
        const player = this.game.players.get(
            this.game.currentPlayerId
        );

        return (
            player &&
            player.roadBuildingRemaining > 0
        );
    }

    canBuildSettlement(vertexId) {
        const vertex = this.game.board.vertices.get(vertexId);

        if (!vertex || vertex.building) {
            return false;
        }

        if (this.game.config.expansions.seafarers) {
            const hasLandTile = vertex.adjacentTiles.some(tileId => {
                const tile = this.game.board.tiles.get(tileId);
                return tile && tile.type !== "water";
            });

            if (!hasLandTile) {
                return false;
            }
        }

        const player = this.game.players.get(
            this.game.currentPlayerId
        );

        if (!player || player.pieces?.settlement <= 0) {
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

            if (
                this.game.config.expansions.seafarers &&
                edge &&
                edge.ship &&
                edge.ship.playerId === this.game.currentPlayerId
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
        const setupSettlement = this.game.phase === GAME_PHASES.SETUP;

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

        const player = this.game.players.get(
            this.game.currentPlayerId
        );

        player.pieces.settlement--;

        const achievementChanged =
            this.game.updateLongestRoad();

        if (this.game.phase === GAME_PHASES.SETUP) {
            const playerId = this.game.currentPlayerId;

            let settlementCount = 0;

            for (const boardVertex of this.game.board.vertices.values()) {
                if (
                    boardVertex.building &&
                    boardVertex.building.playerId === playerId &&
                    boardVertex.building.type === STRUCTURE_TYPES.SETTLEMENT
                ) {
                    settlementCount++;
                }
            }

            if (settlementCount === 2) {
                const resourceMap = {
                    forest: "wood",
                    pasture: "sheep",
                    field: "wheat",
                    hill: "brick",
                    mountain: "ore"
                };

                // console.log("SECOND SETTLEMENT:", playerId);

                // console.log(
                //     "SECOND SETTLEMENT ADJACENT TILES:",
                //     vertex.adjacentTiles
                // );

                for (const tileId of vertex.adjacentTiles) {
                    const tile = this.game.board.tiles.get(tileId);

                    if (!tile) {
                        continue;
                    }

                    const resource = resourceMap[tile.type];

                    if (!resource) {
                        continue;
                    }

                    this.game.giveResourceToPlayer(
                        playerId,
                        resource,
                        1
                    );
                }
            }
        }

        if (!setupSettlement) {
            this.game.turnLog.addMessage("INFRA", "Settlement placed");
        }

        this.game.updatePlayerVictoryPoints(
            this.game.currentPlayerId
        );

        this.claimPort(vertexId);

        if (this.game.phase === GAME_PHASES.SETUP) {
            this.game.setupSettlementVertexId = vertexId;
            this.game.subphase = SETUP_SUBPHASES.PLACING_ROAD;
        }

        return {
            success: true,
            achievementChanged
        };
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

        const player = this.game.players.get(
            this.game.currentPlayerId
        );

        if (!player || player.pieces?.city <= 0) {
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

        const player = this.game.players.get(
            this.game.currentPlayerId
        );

        player.pieces.city--;
        player.pieces.settlement++;

        this.game.turnLog.addMessage("INFRA", "City placed");

        this.game.updatePlayerVictoryPoints(
            this.game.currentPlayerId
        );

        return true;
    }

    getBuildAvailability(playerId) {
        return {
            road:
                this.game.players.get(playerId)?.roadBuildingRemaining > 0 ||
                this.game.canAfford(playerId, BUILD_COSTS[STRUCTURE_TYPES.ROAD]
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
            ),

            ship:
                this.game.config.expansions.seafarers &&
                this.game.canAfford(
                    playerId,
                    BUILD_COSTS[STRUCTURE_TYPES.SHIP]
                ),
        };
    }
}

module.exports = BuildManager;