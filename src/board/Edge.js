class Edge {
    constructor(id, vertexA, vertexB) {
        this.id = id;

        this.vertices = [
            vertexA,
            vertexB
        ];

        this.adjacentTiles = [];

        this.road = null;
    }
}

module.exports = Edge;