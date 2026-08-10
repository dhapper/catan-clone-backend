class Vertex {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;

        this.adjacentTiles = [];
        this.adjacentEdges = [];
        this.adjacentVertices = [];

        this.building = null;
    }
}

module.exports = Vertex;