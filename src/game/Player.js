class Player {
    constructor(id, name, color, isHost) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.isHost = isHost;
        this.connected = false;

        this.victoryPoints = 0;
        this.secretVictoryPoints = 0;
        this.hasLongestRoad = false;
        this.longestRoad = 0;
        this.hasLargestArmy = false;
        this.knightsPlayed = 0;

        this.resources = {
            wood: 0,
            brick: 0,
            wheat: 0,
            sheep: 0,
            ore: 0
        };

        this.ports = [];

        this.devCards = [];
        this.devCardPlayed = false;
        this.roadBuildingRemaining = 0;
        this.inventionActive = false;
    }

    addResource(resource, amount = 1) {
        if (!(resource in this.resources)) {
            return false;
        }

        this.resources[resource] += amount;

        return true;
    }

    removeResource(resource, amount = 1) {
        if (!(resource in this.resources)) {
            return false;
        }

        if (this.resources[resource] < amount) {
            return false;
        }

        this.resources[resource] -= amount;

        return true;
    }
}

module.exports = Player;