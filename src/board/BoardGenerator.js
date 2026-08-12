const Board = require("./Board");
const Tile = require("./Tile");
const Vertex = require("./Vertex");
const Edge = require("./Edge");
const {
    TILE_TYPES,
    ALL_TILES
} = require("../game/TileTypes");
const { ALL_TOKENS } = require("../game/NumberTokens");

const HEX_SIZE = 60;

function shuffle(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] =
            [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

function generateBoard(rowSizes) {
    const board = new Board(rowSizes);
    board.hexSize = HEX_SIZE;

    const tileCount =
        rowSizes.reduce(
            (total, rowSize) => total + rowSize,
            0
        );

    const tileTypes =
        shuffle(ALL_TILES.slice(0, tileCount));

    const numberTokens =
        shuffle(ALL_TOKENS.slice(0, tileCount));

    let tileId = 0;
    let vertexId = 0;
    let edgeId = 0;

    const maxRowSize = Math.max(...rowSizes);

    // Used to find an existing vertex at a given position
    const vertexLookup = new Map();
    const edgeLookup = new Map();

    for (let row = 0; row < rowSizes.length; row++) {
        const numberOfTiles = rowSizes[row];

        const horizontalSpacing = Math.sqrt(3) * HEX_SIZE;

        const rowWidth =
            (numberOfTiles - 1) * horizontalSpacing;

        const maxRowWidth =
            (maxRowSize - 1) * horizontalSpacing;

        const rowShift =
            (maxRowWidth - rowWidth) / 2;

        for (let column = 0; column < numberOfTiles; column++) {
            const x =
                rowShift +
                column * horizontalSpacing;

            const y =
                row * (1.5 * HEX_SIZE);

            const tileType = tileTypes[tileId];

            const tileTypeInfo =
                TILE_TYPES.find(
                    tile => tile.type === tileType
                );

            const resource =
                tileTypeInfo?.resource ?? null;

            let numberToken = null;

            if (tileType !== "desert") {
                numberToken = numberTokens.shift();
            }

            const tile = new Tile(
                `t${tileId}`,
                row,
                column,
                x,
                y,
                tileType,
                resource,
                numberToken
            );

            // Generate the six vertices of this hex
            for (let i = 0; i < 6; i++) {
                const angle = -90 + i * 60;
                const radians = angle * Math.PI / 180;

                const vertexX =
                    x + HEX_SIZE * Math.cos(radians);

                const vertexY =
                    y + HEX_SIZE * Math.sin(radians);

                // Round to avoid floating-point precision problems
                const lookupKey =
                    `${vertexX.toFixed(6)},${vertexY.toFixed(6)}`;

                let vertex = vertexLookup.get(lookupKey);

                // Vertex doesn't exist yet
                if (!vertex) {
                    vertex = new Vertex(
                        `v${vertexId}`,
                        vertexX,
                        vertexY
                    );

                    board.addVertex(vertex);
                    vertexLookup.set(lookupKey, vertex);

                    vertexId++;
                }

                // Tile references the vertex
                tile.vertices.push(vertex.id);

                // Vertex references the tile
                vertex.adjacentTiles.push(tile.id);
            }

            // Create the six edges
            for (let i = 0; i < 6; i++) {
                const vertexA = tile.vertices[i];
                const vertexB = tile.vertices[(i + 1) % 6];

                const edgeKey = [vertexA, vertexB]
                    .sort()
                    .join("-");

                let edge = edgeLookup.get(edgeKey);

                if (!edge) {
                    edge = new Edge(
                        `e${edgeId}`,
                        vertexA,
                        vertexB
                    );

                    board.addEdge(edge);
                    edgeLookup.set(edgeKey, edge);

                    edgeId++;

                    board.vertices.get(vertexA).adjacentVertices.push(vertexB);
                    board.vertices.get(vertexB).adjacentVertices.push(vertexA);
                }

                tile.edges.push(edge.id);

                edge.adjacentTiles.push(tile.id);

                board.vertices.get(vertexA).adjacentEdges.push(edge.id);
                board.vertices.get(vertexB).adjacentEdges.push(edge.id);
            }

            board.addTile(tile);

            tileId++;
        }
    }

    return board;
}

module.exports = generateBoard;