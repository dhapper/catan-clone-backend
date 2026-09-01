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

        return true;
    }
}

module.exports = VictoryPointManager;