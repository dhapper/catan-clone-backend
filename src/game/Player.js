class Player {
    constructor(id, name, color, isHost = false) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.connected = false;
        this.isHost = isHost;
    }
}

module.exports = Player; 