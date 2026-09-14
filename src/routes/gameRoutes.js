const express = require("express");
const { emitAchievementSound } = require("../services/SoundManager");

const router = express.Router();

function createGameRoutes(games, io) {

    // const game = games.get("ABCD");

    function broadcastGameState(game) {
        io.to(`lobby:${game.lobbyCode}`).emit("game:state", {
            lobbyCode: game.lobbyCode,
            players: [...game.players.values()],
            colors: game.colors,
            phase: game.phase,
            subphase: game.subphase,
            currentTrade: game.currentTrade,
            currentPlayerId: game.currentPlayerId,
            diceRoll: game.diceRoll,
            turnOrderRolls: Object.fromEntries(game.turnOrderRolls),
            setupTurnOrder: game.setupTurnOrder,
            bank: game.bank.resources,
            buildAvailability: game.currentPlayerId
                ? game.getBuildAvailability(game.currentPlayerId)
                : null,
            discardRequirements: Object.fromEntries(game.discardRequirements),
            robberTileId: game.robberTileId,
            robberVictims: game.robberVictims,
            robberSafetyNumber: game.robberSafetyNumber,
            bankResourceCount: game.bankResourceCount,
            victoryPointsNeeded: game.victoryPointsNeeded,
            pieceLimits: game.pieceLimits,
            boardLayout: game.boardLayout,
            winner: game.winner,
            ports: game.board.ports,
            turnEndsAt: game.timer.turnEndsAt,
            turnLog: game.turnLog.entries
        });
    }

    router.get("/game/:lobbyCode", (req, res) => {
        const { lobbyCode } = req.params;
        const game = games.get(lobbyCode);

        if (!game) {
            return res.status(404).json({
                error: "Lobby not found"
            });
        }

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

    router.post("/game/:lobbyCode/build/settlement", (req, res) => {

        const game = getGameOr404(req, res);

        if (!game) {
            return;
        }

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

        const result = game.placeSettlement(vertexId);

        if (!result || !result.success) {
            return res.status(400).json({
                error: "Settlement cannot be built here"
            });
        }

        io.to(`lobby:${game.lobbyCode}`).emit("game:sound", "place");

        if (result.achievementChanged) {
            emitAchievementSound(io, game);
        }

        broadcastGameState(game);

        res.json({
            success: true,
            vertex
        });
    });

    router.post("/game/:lobbyCode/build/road", (req, res) => {
        const game = getGameOr404(req, res);

        if (!game) {
            return;
        }

        const { edgeId } = req.body;

        const edge = game.board.edges.get(edgeId);

        if (!edge) {
            return res.status(404).json({
                error: "Edge not found"
            });
        }

        const result = game.placeRoad(edgeId);

        if (!result || !result.success) {
            return res.status(400).json({
                error: "Road cannot be built here"
            });
        }

        io.to(`lobby:${game.lobbyCode}`).emit("game:sound", "place");

        if (result.achievementChanged) {
            emitAchievementSound(io, game);
        }

        broadcastGameState(game);

        res.json({
            success: true,
            edge
        });
    });

    router.post("/game/:lobbyCode/reset", (req, res) => {

        const game = getGameOr404(req, res);

        if (!game) {
            return;
        }

        // game.reset();
        // io.to(`lobby:${game.lobbyCode}`).emit("game:reset");
        // io.to(`lobby:${game.lobbyCode}`).emit("game:sound", "reset");
        // broadcastGameState(game);

        games.delete(game.lobbyCode);

        res.json({
            success: true,
            message: "Reset: lobby destroyed"
        });
    });

    router.post("/game/:lobbyCode/build/city", (req, res) => {

        const game = getGameOr404(req, res);

        if (!game) {
            return;
        }

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

        io.to(`lobby:${game.lobbyCode}`).emit("game:sound", "place");

        broadcastGameState(game);

        res.json({
            success: true,
            vertex
        });
    });

    function getGameOr404(req, res) {
        const { lobbyCode } = req.params;
        const game = games.get(lobbyCode);

        if (!game) {
            res.status(404).json({
                error: "Lobby not found"
            });
            return null;
        }

        return game;
    }

    return router;
}

module.exports = createGameRoutes;