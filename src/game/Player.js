class Player {
    constructor(id, name, color, isHost) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.isHost = isHost;
        this.connected = false;

        this.victoryPoints = 0;
        this.secretVictoryPoints = 0;
        

        this.resources = {
            wood: 0,
            brick: 0,
            wheat: 17,
            sheep: 17,
            ore: 17
        };

        this.ports = [];

        this.devCards = [];
        this.devCardPlayed = false;
        this.roadBuildingRemaining = 0;
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