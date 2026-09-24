const express = require("express");
const { broadcastGameState } = require("../socket/gameState");

function createGameRoutes(rooms, io) {
    const router = express.Router();

    function loadRoom(req, res, next) {
        const room = rooms.getRoom(req.params.code);

        if (!room) {
            return res.status(404).json({
                error: "Room not found"
            });
        }

        req.room = room;
        req.game = room.game;
        next();
    }

    router.use("/rooms/:code", loadRoom);

    router.get("/rooms/:code/game", (req, res) => {
        const { game } = req;
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

    router.post("/rooms/:code/game/build/settlement", (req, res) => {
        const { game, room } = req;
        const { vertexId } = req.body;

        console.log("BUILD SETTLEMENT REQUEST:", {
            vertexId,
            phase: game.phase,
            subphase: game.subphase,
            currentPlayerId: game.currentPlayerId
        });

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

        io.to(room.code).emit("game:sound", "place");

        broadcastGameState(io, room);

        res.json({
            success: true,
            vertex
        });
    });

    router.post("/rooms/:code/game/build/road", (req, res) => {
        const { game, room } = req;
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

        io.to(room.code).emit("game:sound", "place");

        broadcastGameState(io, room);

        res.json({
            success: true,
            edge
        });
    });

    router.post("/rooms/:code/game/reset", (req, res) => {
        const { game, room } = req;
        game.reset();
        io.to(room.code).emit("game:reset");
        io.to(room.code).emit("game:sound", "reset");
        broadcastGameState(io, room);

        res.json({
            success: true,
            message: "Game and players fully reset"
        });
    });

    router.post("/rooms/:code/game/build/city", (req, res) => {
        const { game, room } = req;
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

        io.to(room.code).emit("game:sound", "place");

        broadcastGameState(io, room);

        res.json({
            success: true,
            vertex
        });
    });

    return router;
}

module.exports = createGameRoutes;