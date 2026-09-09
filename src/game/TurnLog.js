class TurnLog {
    constructor() {
        this.entries = [];
        this.turnNumber = 0;
    }

    addTurn(player) {
        this.turnNumber++;

        this.entries.push({
            turn: this.turnNumber,
            playerName: player.name,
            color: player.color,
            roll: null,
            messages: []
        });
    }

    addMessage(type, message) {
        const entry = this.entries[this.entries.length - 1];

        if (!entry) {
            return;
        }

        entry.messages.push({
            message,
            type
        });
    }

    setRoll(roll) {
        const entry = this.entries[this.entries.length - 1];

        if (!entry) {
            return;
        }

        entry.roll = roll;
    }

    formatResources(resources) {
        return Object.entries(resources)
            .filter(([resource, amount]) => amount > 0)
            .map(([resource, amount]) => `${resource} x${amount}`)
            .join(", ");
    }
}

module.exports = TurnLog;