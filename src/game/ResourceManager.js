class ResourceManager {
    constructor(game) {
        this.game = game;
    }

    giveResourceToPlayer(playerId, resource, amount) {
        const player = this.game.players.get(playerId);

        if (!player) {
            return false;
        }

        if (!Number.isInteger(amount) || amount <= 0) {
            return false;
        }

        if (!(resource in player.resources)) {
            return false;
        }

        if (this.game.bank.resources[resource] < amount) {
            return false;
        }

        this.game.bank.removeResource(resource, amount);
        player.addResource(resource, amount);

        return true;
    }

    returnResourceToBank(playerId, resource, amount) {
        const player = this.game.players.get(playerId);

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
        this.game.bank.addResource(resource, amount);

        return true;
    }

    canAfford(playerId, cost) {
        const player = this.game.players.get(playerId);

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
        const player = this.game.players.get(playerId);

        if (!player) {
            return false;
        }

        if (!this.canAfford(playerId, cost)) {
            return false;
        }

        for (const [resource, amount] of Object.entries(cost)) {
            player.removeResource(resource, amount);
            this.game.bank.addResource(resource, amount);
        }

        return true;
    }
}

module.exports = ResourceManager;