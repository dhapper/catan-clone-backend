class VictoryPointManager {
    constructor(game) {
        this.game = game;
    }

    calculatePlayerVictoryPoints(playerId) {
        const player = this.game.players.get(playerId);

        if (!player) {
            return 0;
        }

        let victoryPoints = 0;

        for (const vertex of this.game.board.vertices.values()) {
            if (!vertex.building) {
                continue;
            }

            if (vertex.building.playerId !== playerId) {
                continue;
            }

            if (vertex.building.type === "settlement") {
                victoryPoints += 1;
            }

            if (vertex.building.type === "city") {
                victoryPoints += 2;
            }
        }

        if (player.hasLongestRoad) {
            victoryPoints += 2;
        }

        if (player.hasLargestArmy) {
            victoryPoints += 2;
        }

        return victoryPoints;
    }

    calculateSecretVictoryPoints(playerId) {
        const player = this.game.players.get(playerId);

        if (!player) {
            return 0;
        }

        return player.devCards.filter(
            card => card.type === "victory_point"
        ).length;
    }

    updatePlayerVictoryPoints(playerId) {
        const player = this.game.players.get(playerId);

        if (!player) {
            return false;
        }

        player.victoryPoints =
            this.calculatePlayerVictoryPoints(playerId);

        player.secretVictoryPoints =
            this.calculateSecretVictoryPoints(playerId);

        this.game.checkWinner();

        return true;
    }

    calculateLongestRoad(playerId) {
        const player = this.game.players.get(playerId);

        if (!player) {
            return 0;
        }

        let longestRoad = 0;

        for (const edge of this.game.board.edges.values()) {
            if (
                !edge.road ||
                edge.road.playerId !== playerId
            ) {
                continue;
            }

            for (const vertexId of edge.vertices) {
                longestRoad = Math.max(
                    longestRoad,
                    this.findLongestRoadFrom(
                        playerId,
                        vertexId,
                        new Set()
                    )
                );
            }
        }

        return longestRoad;
    }

    findLongestRoadFrom(playerId, vertexId, usedEdges) {
        const vertex = this.game.board.vertices.get(vertexId);

        if (!vertex) {
            return 0;
        }

        let longest = 0;

        for (const edgeId of vertex.adjacentEdges) {
            if (usedEdges.has(edgeId)) {
                continue;
            }

            const edge = this.game.board.edges.get(edgeId);

            if (
                !edge ||
                !edge.road ||
                edge.road.playerId !== playerId
            ) {
                continue;
            }

            const nextVertexId =
                edge.vertices.find(id => id !== vertexId);

            if (!nextVertexId) {
                continue;
            }

            const nextVertex =
                this.game.board.vertices.get(nextVertexId);

            if (
                nextVertex.building &&
                nextVertex.building.playerId !== playerId
            ) {
                continue;
            }

            const nextUsedEdges = new Set(usedEdges);
            nextUsedEdges.add(edgeId);

            longest = Math.max(
                longest,
                1 + this.findLongestRoadFrom(
                    playerId,
                    nextVertexId,
                    nextUsedEdges
                )
            );
        }

        return longest;
    }

    updateLongestRoad() {
        let currentHolder = null;

        for (const player of this.game.players.values()) {
            if (player.hasLongestRoad) {
                currentHolder = player;
                break;
            }
        }

        const roadLengths = new Map();

        for (const player of this.game.players.values()) {
            const roadLength =
                this.calculateLongestRoad(player.id);

            roadLengths.set(player.id, roadLength);
            player.longestRoad = roadLength;
        }

        if (!currentHolder) {
            let newHolder = null;

            for (const player of this.game.players.values()) {
                const roadLength = roadLengths.get(player.id);

                if (roadLength < 5) {
                    continue;
                }

                if (
                    !newHolder ||
                    roadLength > roadLengths.get(newHolder.id)
                ) {
                    newHolder = player;
                }
            }

            if (newHolder) {
                newHolder.hasLongestRoad = true;
            }
        } else {
            const currentLength =
                roadLengths.get(currentHolder.id);

            let newHolder = null;

            for (const player of this.game.players.values()) {
                if (player.id === currentHolder.id) {
                    continue;
                }

                const roadLength = roadLengths.get(player.id);

                if (roadLength > currentLength) {
                    if (
                        !newHolder ||
                        roadLength > roadLengths.get(newHolder.id)
                    ) {
                        newHolder = player;
                    }
                }
            }

            if (newHolder) {
                currentHolder.hasLongestRoad = false;
                newHolder.hasLongestRoad = true;
            }
        }

        for (const player of this.game.players.values()) {
            this.updatePlayerVictoryPoints(player.id);
        }
    }

    updateLargestArmy() {
        let currentHolder = null;

        for (const player of this.game.players.values()) {
            if (player.hasLargestArmy) {
                currentHolder = player;
                break;
            }
        }

        if (!currentHolder) {
            let newHolder = null;

            for (const player of this.game.players.values()) {
                if (player.knightsPlayed < 3) {
                    continue;
                }

                if (
                    !newHolder ||
                    player.knightsPlayed > newHolder.knightsPlayed
                ) {
                    newHolder = player;
                }
            }

            if (newHolder) {
                newHolder.hasLargestArmy = true;
            }

            // return;  // told to remove????
        }

        let newHolder = null;

        for (const player of this.game.players.values()) {
            if (player.id === currentHolder.id) {
                continue;
            }

            if (player.knightsPlayed <= currentHolder.knightsPlayed) {
                continue;
            }

            if (
                !newHolder ||
                player.knightsPlayed > newHolder.knightsPlayed
            ) {
                newHolder = player;
            }
        }

        if (newHolder) {
            currentHolder.hasLargestArmy = false;
            newHolder.hasLargestArmy = true;
        }

        for (const player of this.game.players.values()) {
            this.updatePlayerVictoryPoints(player.id);
        }
    }
}

module.exports = VictoryPointManager;