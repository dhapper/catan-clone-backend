class Player {
    constructor(id, name, color, isHost) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.isHost = isHost;
        this.connected = false;

        this.resources = {
            wood: 10,
            brick: 10,
            wheat: 10,
            sheep: 10,
            ore: 10
        };

        this.ports = [];
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