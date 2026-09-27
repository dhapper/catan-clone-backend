
const Board = require("./Board");
const Tile = require("./Tile");
const Vertex = require("./Vertex");
const Edge = require("./Edge");

const {
    TILE_TYPES,
    ALL_TILES
} = require("../constants/TileTypes");

const { ALL_TOKENS } = require("../constants/NumberTokens");
const DEFAULT_PORTS = require("../constants/PortConstants");

const {
    SEAFARERS_MAPS
} = require("../constants/SeafarersConstants");

const HEX_SIZE = 120;

function shuffle(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] =
            [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

function tilesShareVertex(tileA, tileB) {
    return tileA.vertices.some(vertexId =>
        tileB.vertices.includes(vertexId)
    );
}

function findNonAdjacentTiles(
    tiles,
    count,
    selected = [],
    startIndex = 0
) {
    if (selected.length === count) {
        return selected;
    }

    for (
        let index = startIndex;
        index < tiles.length;
        index++
    ) {
        const tile = tiles[index];

        if (
            selected.some(selectedTile =>
                tilesShareVertex(tile, selectedTile)
            )
        ) {
            continue;
        }

        const result = findNonAdjacentTiles(
            tiles,
            count,
            [...selected, tile],
            index + 1
        );

        if (result) {
            return result;
        }
    }

    return null;
}

function assignNumberTokens(board, resourceTiles) {
    const tokens = shuffle(
        ALL_TOKENS.slice(0, resourceTiles.length)
    );

    const redTokens = tokens.filter(
        token => token === 6 || token === 8
    );

    const otherTokens = shuffle(
        tokens.filter(
            token => token !== 6 && token !== 8
        )
    );

    const redTileCandidates =
        shuffle(resourceTiles);

    const redTiles =
        findNonAdjacentTiles(
            redTileCandidates,
            redTokens.length
        );

    if (!redTiles) {
        throw new Error(
            "Unable to place 6 and 8 tokens without adjacency"
        );
    }

    redTiles.forEach((tile, index) => {
        tile.numberToken =
            redTokens[index];
    });

    resourceTiles
        .filter(
            tile => !redTiles.includes(tile)
        )
        .forEach((tile, index) => {
            tile.numberToken =
                otherTokens[index];
        });
}

/*
 * Generates a port on every valid land edge.
 *
 * Valid edges:
 *
 * 1. Land edge with no adjacent tile.
 * 2. Land edge bordering a water tile.
 *
 * Land-land and water-water edges do not receive ports.
 */
function generateSeafarersPorts(board, portLocations) {
    const ports =
        shuffle(
            DEFAULT_PORTS.slice(
                0,
                portLocations.length
            )
        );

    return portLocations.map(
        ({ row, column, side }, index) => {

            const tile =
                [...board.tiles.values()].find(
                    tile =>
                        tile.row === row &&
                        tile.column === column
                );

            if (!tile) {
                throw new Error(
                    `Invalid Seafarers port location: ${row}, ${column}`
                );
            }

            if (tile.type === "water") {
                throw new Error(
                    `Seafarers port cannot be placed on water tile: ${row}, ${column}`
                );
            }

            const edgeId =
                tile.edges[side];

            const edge =
                board.edges.get(edgeId);

            if (!edge) {
                throw new Error(
                    `Invalid Seafarers port edge: ${row}, ${column}, side ${side}`
                );
            }

            const portType =
                ports[index];

            return {
                ...portType,
                edgeId: edge.id,
                vertices: [...edge.vertices],
                side,
                landTileId: tile.id,
                ownerId: null
            };
        }
    );
}

function generateSeafarersBoard(
    mapConfig,
    { isReroll = false } = {}
) {

    const {
        map,
        portLocations
    } = mapConfig;

    const rowSizes =
        map.map(row => row.length);

    const board = new Board(rowSizes);
    board.hexSize = HEX_SIZE;

    const landTileCount =
        map
            .join("")
            .split("")
            .filter(cell => cell === "X")
            .length;

    const tileTypes =
        shuffle(
            ALL_TILES.slice(0, landTileCount)
        );

    let tileId = 0;
    let landTileId = 0;
    let vertexId = 0;
    let edgeId = 0;

    const maxRowSize =
        Math.max(...rowSizes);

    const vertexLookup = new Map();
    const edgeLookup = new Map();

    for (
        let row = 0;
        row < map.length;
        row++
    ) {
        const rowLayout =
            map[row];

        const numberOfTiles =
            rowLayout.length;

        const horizontalSpacing =
            Math.sqrt(3) * HEX_SIZE;

        const rowWidth =
            (numberOfTiles - 1) *
            horizontalSpacing;

        const maxRowWidth =
            (maxRowSize - 1) *
            horizontalSpacing;

        const rowShift =
            (maxRowWidth - rowWidth) / 2;

        for (
            let column = 0;
            column < numberOfTiles;
            column++
        ) {
            const x =
                rowShift +
                column * horizontalSpacing;

            const y =
                row * (1.5 * HEX_SIZE);

            const cellType =
                rowLayout[column];

            let tileType;
            let resource = null;

            if (cellType === "O") {
                tileType = "water";
            } else {
                tileType =
                    tileTypes[landTileId];

                const tileTypeInfo =
                    TILE_TYPES.find(
                        tile =>
                            tile.type === tileType
                    );

                resource =
                    tileTypeInfo?.resource ?? null;

                landTileId++;
            }

            const tile = new Tile(
                `t${tileId}`,
                row,
                column,
                x,
                y,
                tileType,
                resource
            );

            // Generate the six vertices
            for (let i = 0; i < 6; i++) {
                const angle =
                    -90 + i * 60;

                const radians =
                    angle * Math.PI / 180;

                const vertexX =
                    x +
                    HEX_SIZE *
                    Math.cos(radians);

                const vertexY =
                    y +
                    HEX_SIZE *
                    Math.sin(radians);

                const lookupKey =
                    `${vertexX.toFixed(6)},` +
                    `${vertexY.toFixed(6)}`;

                let vertex =
                    vertexLookup.get(
                        lookupKey
                    );

                if (!vertex) {
                    vertex = new Vertex(
                        `v${vertexId}`,
                        vertexX,
                        vertexY
                    );

                    board.addVertex(vertex);

                    vertexLookup.set(
                        lookupKey,
                        vertex
                    );

                    vertexId++;
                }

                tile.vertices.push(
                    vertex.id
                );

                vertex.adjacentTiles.push(
                    tile.id
                );
            }

            // Generate the six edges
            for (let i = 0; i < 6; i++) {
                const vertexA =
                    tile.vertices[i];

                const vertexB =
                    tile.vertices[
                    (i + 1) % 6
                    ];

                const edgeKey =
                    [vertexA, vertexB]
                        .sort()
                        .join("-");

                let edge =
                    edgeLookup.get(edgeKey);

                if (!edge) {
                    edge = new Edge(
                        `e${edgeId}`,
                        vertexA,
                        vertexB
                    );

                    board.addEdge(edge);

                    edgeLookup.set(
                        edgeKey,
                        edge
                    );

                    edgeId++;

                    board.vertices
                        .get(vertexA)
                        .adjacentVertices
                        .push(vertexB);

                    board.vertices
                        .get(vertexB)
                        .adjacentVertices
                        .push(vertexA);
                }

                tile.edges.push(
                    edge.id
                );

                edge.adjacentTiles.push(
                    tile.id
                );

                board.vertices
                    .get(vertexA)
                    .adjacentEdges
                    .push(edge.id);

                board.vertices
                    .get(vertexB)
                    .adjacentEdges
                    .push(edge.id);
            }

            board.addTile(tile);

            tileId++;
        }
    }

    /*
     * Generate ports on every valid
     * land/coast edge.
     */
board.ports =
    generateSeafarersPorts(
        board,
        portLocations
    );

    /*
     * Number tokens only go on
     * resource tiles.
     */
    const resourceTiles =
        [...board.tiles.values()].filter(
            tile =>
                tile.type !== "water" &&
                tile.type !== "desert"
        );

    assignNumberTokens(
        board,
        resourceTiles,
        isReroll
    );

    return board;
}

module.exports =
    generateSeafarersBoard;