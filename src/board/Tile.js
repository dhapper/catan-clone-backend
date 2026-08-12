class Tile {
    constructor(id, row, column, x, y, type = null, resource = null, numberToken = null) {
        this.id = id;
        this.row = row;
        this.column = column;
        this.x = x;
        this.y = y;

        this.type = type;
        this.resource = resource;
        this.numberToken = numberToken;

        this.vertices = [];
        this.edges = [];
    }
}

module.exports = Tile;