class Board {
    constructor(rowSizes) {
        this.rowSizes = rowSizes;

        this.tiles = new Map();
        this.vertices = new Map();
        this.edges = new Map();
        
    }

    addTile(tile) {
        this.tiles.set(tile.id, tile);
    }

    addVertex(vertex) {
        this.vertices.set(vertex.id, vertex);
    }

    addEdge(edge) {
        this.edges.set(edge.id, edge);
    }
}

module.exports = Board;