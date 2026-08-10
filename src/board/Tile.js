class Tile {
    constructor(id, row, column, x, y) {
        this.id = id;
        this.row = row;
        this.column = column;
        this.x = x;
        this.y = y;

        this.vertices = [];
        this.edges = [];
    }
}

module.exports = Tile;