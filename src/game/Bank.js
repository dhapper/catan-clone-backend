class Bank {
    constructor() {
        this.resources = {
            wood: 19,
            brick: 19,
            wheat: 19,
            sheep: 19,
            ore: 19
        };
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

module.exports = Bank;