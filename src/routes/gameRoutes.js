const express = require("express");

const router = express.Router();

function createGameRoutes(game, io) {
    function broadcastGameState() {
        io.emit("game:state", {
            players: [...game.players.values()],
            colors: game.colors,
            phase: game.phase,
            subphase: game.subphase,
            currentPlayerId: game.currentPlayerId,
            diceRoll: game.diceRoll,
            turnOrderRolls: Object.fromEntries(game.turnOrderRolls),
            setupTurnOrder: game.setupTurnOrder,
            bank: game.bank.resources,
            buildAvailability: game.currentPlayerId
                ? game.getBuildAvailability(game.currentPlayerId)
                : null,
            ports: game.board.ports,
        });
    }

    router.get("/game", (req, res) => {
        res.json({
            rowSizes: game.board.rowSizes,
            hexSize: game.board.hexSize,
            phase: game.phase,
            subphase: game.subphase,
            players: [...game.players.values()],
            currentPlayerId: game.currentPlayerId,
            buildableRoads: game.getBuildableRoads(),
            buildableSettlements: game.getBuildableSettlements(),
            buildableCities: game.getBuildableCities(),
            tiles: [...game.board.tiles.values()],
            vertices: [...game.board.vertices.values()],
            edges: [...game.board.edges.values()],
            ports: game.board.ports,
        });
    });

    router.post("/game/build/settlement", (req, res) => {
        const { vertexId } = req.body;

        const vertex = game.board.vertices.get(vertexId);

        if (!vertex) {
            return res.status(404).json({
                error: "Vertex not found"
            });
        }

        if (!game.placeSettlement(vertexId)) {
            return res.status(400).json({
                error: "Settlement cannot be built here"
            });
        }

        broadcastGameState();

        res.json({
            success: true,
            vertex
        });
    });

    router.post("/game/build/road", (req, res) => {
        const { edgeId } = req.body;

        const edge = game.board.edges.get(edgeId);

        if (!edge) {
            return res.status(404).json({
                error: "Edge not found"
            });
        }

        if (!game.placeRoad(edgeId)) {
            return res.status(400).json({
                error: "Road cannot be built here"
            });
        }

        broadcastGameState();

        res.json({
            success: true,
            edge
        });
    });

    router.post("/game/build/city", (req, res) => {
        const { vertexId } = req.body;

        const vertex = game.board.vertices.get(vertexId);

        if (!vertex) {
            return res.status(404).json({
                error: "Vertex not found"
            });
        }

        if (!game.placeCity(vertexId)) {
            return res.status(400).json({
                error: "City cannot be built here"
            });
        }

        broadcastGameState();

        res.json({
            success: true,
            vertex
        });
    });

    return router;
}

module.exports = createGameRoutes;