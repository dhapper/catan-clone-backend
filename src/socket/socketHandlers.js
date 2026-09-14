const Player = require("../game/Player");
const Game = require("../game/Game");
const {
    GAME_PHASES,
    SETUP_SUBPHASES,
    GAMEPLAY_SUBPHASES
} = require("../constants/GameConstants");
const {
    emitNextTurnStartSound,
    emitAchievementSound
} = require("../services/SoundManager");

function registerSocketHandlers(io, games) {
    function broadcastGameState(game) {

        game.timer.check(io, broadcastGameState);

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
            buildAvailability: game.currentPlayerId ? game.getBuildAvailability(game.currentPlayerId) : null,
            discardRequirements: Object.fromEntries(game.discardRequirements),
            robberTileId: game.robberTileId,
            robberVictims: game.robberVictims,
            robberSafetyNumber: game.robberSafetyNumber,
            bankResourceCount: game.bankResourceCount,
            victoryPointsNeeded: game.victoryPointsNeeded,
            boardLayout: game.boardLayout,
            pieceLimits: game.pieceLimits,
            winner: game.winner,
            turnEndsAt: game.timer.turnEndsAt,
            timerPaused: game.timer.timerPaused,
            timerRemainingMs: game.timer.timerRemainingMs,
            turnLog: game.turnLog.entries
        });
    }

    io.on("connection", (socket) => {
        socket.playerId = null;
        socket.lobbyCode = null;

        let game = null;

        console.log(
            "Client connected:",
            socket.id
        );
        // socket.playerId = null;
        // socket.lobbyCode = null;

        // const game = games.get(socket.lobbyCode);

        // if (!game) {
        //     console.log("Lobby not found:", socket.lobbyCode);
        //     return;
        // }

        // // socket joins room
        // socket.join(`lobby:${socket.lobbyCode}`);

        // console.log(
        //     "Client connected:",
        //     socket.id,
        //     "Lobby:",
        //     socket.lobbyCode
        // );

        // broadcastGameState(game);

        socket.on("lobby:create", () => {

            const lobbyCodes = [
                // "TREE",
                // "MOON",
                // "FISH",
                // "BEAR",
                // "STAR",
                // "WOLF",
                // "FIRE",
                // "BLUE",
                // "GOLD",
                // "SNOW",

                "SAKA",
                "RICE",
                "RAYA",
                "GYOK",
                "NONI",
                "OZIL",
            ];

            const availableCodes = lobbyCodes.filter(
                lobbyCode => !games.has(lobbyCode)
            );

            if (availableCodes.length === 0) {
                socket.emit("lobby:create:error", {
                    error: "No new lobbies are available"
                });
                return;
            }

            const lobbyCode =
                availableCodes[
                Math.floor(Math.random() * availableCodes.length)
                ];

            game = new Game(lobbyCode);
            games.set(lobbyCode, game);

            socket.playerId = null;
            socket.lobbyCode = lobbyCode;
            socket.join(`lobby:${lobbyCode}`);

            console.log(
                "Lobby created:",
                lobbyCode,
                "by socket:",
                socket.id
            );

            broadcastGameState(game);
        });

        socket.on("lobby:join", (lobbyCode) => {
            lobbyCode = lobbyCode.trim().toUpperCase();

            const existingGame = games.get(lobbyCode);

            if (!existingGame) {
                socket.emit("lobby:join:error", {
                    error: "Lobby not found"
                });
                return;
            }

            game = existingGame;
            socket.lobbyCode = lobbyCode;
            socket.join(`lobby:${lobbyCode}`);

            console.log(
                "Lobby joined:",
                lobbyCode,
                "by socket:",
                socket.id
            );

            broadcastGameState(game);
        });

        socket.on("lobby:exit", () => {
            if (!game || !socket.lobbyCode) {
                return;
            }

            const lobby = game;
            const lobbyCode = socket.lobbyCode;

            if (socket.playerId) {
                lobby.players.delete(socket.playerId);
            }

            socket.playerId = null;

            const room = io.sockets.adapter.rooms.get(`lobby:${lobbyCode}`);
            const connectedSockets = room ? room.size : 0;

            socket.leave(`lobby:${lobbyCode}`);
            socket.lobbyCode = null;
            game = null;

            if (connectedSockets <= 1) {
                games.delete(lobbyCode);
                console.log("Lobby destroyed:", lobbyCode);
                return;
            }

            broadcastGameState(lobby);
        });

        socket.on("player:create", ({ name }) => {
            if (socket.playerId) {
                socket.emit("player:create:error", {
                    error: "You are already controlling a player"
                });
                return;
            }

            const playerId = `p${game.players.size + 1}`;
            const isHost = game.players.size === 0;

            const color = game.colors.find(
                color =>
                    ![...game.players.values()].some(
                        player => player.color === color
                    )
            );

            const player = new Player(
                playerId,
                name,
                color,
                isHost
            );

            game.addPlayer(player);
            player.connected = true;
            socket.playerId = playerId;

            socket.emit("player:claimed", {
                player
            });

            broadcastGameState(game);
        });

        socket.on("player:rename", ({ name }) => {
            if (!socket.playerId) {
                return;
            }

            const player = game.players.get(socket.playerId);

            if (!player || !name.trim()) {
                return;
            }

            player.name = name.trim();

            broadcastGameState(game);
        });

        socket.on("player:changeColor", (color) => {
            if (!socket.playerId) {
                return;
            }

            const player = game.players.get(socket.playerId);

            if (!player) {
                return;
            }

            if (!game.colors.includes(color)) {
                return;
            }

            const colorTaken = [...game.players.values()].some(
                otherPlayer =>
                    otherPlayer.id !== player.id &&
                    otherPlayer.color === color
            );

            if (colorTaken) {
                return;
            }

            player.color = color;

            broadcastGameState(game);
        });

        socket.on("player:claim", (playerId) => {
            const player = game.players.get(playerId);

            if (!player) {
                socket.emit("player:claim:error", {
                    error: "Player not found"
                });
                return;
            }

            if (player.connected) {
                socket.emit("player:claim:error", {
                    error: "Player is already connected"
                });
                return;
            }

            if (socket.playerId) {
                socket.emit("player:claim:error", {
                    error: "You are already controlling a player"
                });
                return;
            }

            player.connected = true;
            socket.playerId = player.id;

            socket.emit("player:claimed", {
                player
            });

            broadcastGameState(game);
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);

            if (socket.playerId) {
                const player = game.players.get(socket.playerId);

                if (player) {
                    player.connected = false;
                }

                broadcastGameState(game);
            }
        });

        socket.on("game:start", () => {
            if (!socket.playerId) {
                return;
            }

            const player = game.players.get(socket.playerId);

            if (!player || !player.isHost) {
                return;
            }

            if (game.phase !== GAME_PHASES.LOBBY) {
                return;
            }

            game.phase = GAME_PHASES.SETUP;
            game.devCards.initializeDeck();

            broadcastGameState(game);
        });

        socket.on("game:rollForTurnOrder", () => {
            if (!socket.playerId) {
                return;
            }

            if (game.phase !== GAME_PHASES.SETUP) {
                return;
            }

            if (game.subphase !== SETUP_SUBPHASES.ROLL_FOR_TURN_ORDER) {
                return;
            }

            if (!game.setup.rollForTurnOrder(socket.playerId)) {
                return;
            }

            broadcastGameState(game);
        });

        socket.on("game:rollProductionDice", () => {
            if (!socket.playerId) {
                return;
            }

            if (game.currentPlayerId !== socket.playerId) {
                return;
            }

            if (!game.rollProductionDice()) {
                return;
            }

            io.to(`lobby:${game.lobbyCode}`).emit("game:sound", "diceRoll");

            broadcastGameState(game);
        });

        socket.on("game:endTurn", () => {
            if (!socket.playerId) {
                return;
            }

            if (game.currentPlayerId !== socket.playerId) {
                return;
            }

            if (!game.endTurn()) {
                return;
            }

            emitNextTurnStartSound(io, game);

            broadcastGameState(game);
        });

        socket.on("game:toggleTimer", () => {
            if (!socket.playerId || !game.timer.toggle()) {
                return;
            }

            broadcastGameState(game);
        });

        socket.on("game:stealResource", ({ victimId }) => {
            if (!socket.playerId) {
                return;
            }

            if (game.currentPlayerId !== socket.playerId) {
                return;
            }

            if (!game.stealResource(victimId)) {
                console.log("STEAL RESOURCE REJECTED");
                return;
            }

            console.log(
                "RESOURCE STOLEN FROM:",
                victimId
            );

            game.robberVictims = [];

            broadcastGameState(game);
        });

        socket.on("game:discardResources", ({ resources }) => {
            if (!socket.playerId) {
                return;
            }

            if (!game.discardResources(
                socket.playerId,
                resources
            )) {
                console.log("DISCARD REJECTED");
                return;
            }

            console.log(
                "DISCARD SUCCESS:",
                socket.playerId,
                resources
            );

            broadcastGameState(game);
        });

        socket.on("game:moveRobber", ({ tileId }) => {
            if (!socket.playerId) {
                return;
            }

            if (game.currentPlayerId !== socket.playerId) {
                return;
            }

            if (!game.moveRobber(tileId)) {
                console.log("ROBBER MOVE REJECTED");
                return;
            }

            console.log(
                "ROBBER MOVED:",
                socket.playerId,
                tileId
            );

            io.to(`lobby:${game.lobbyCode}`).emit("game:sound", "place");

            broadcastGameState(game);
        });

        socket.on("game:bankTrade", ({ offered, wanted }) => {
            if (!socket.playerId) {
                return;
            }

            if (game.currentPlayerId !== socket.playerId) {
                return;
            }

            if (!game.bankTrade(offered, wanted)) {
                return;
            }

            broadcastGameState(game);
        });

        socket.on("game:createTrade", ({ offered, wanted }) => {
            console.log("CREATE TRADE RECEIVED:", offered, wanted);

            if (!socket.playerId) {
                console.log("1");
                return;
            }

            if (game.currentPlayerId !== socket.playerId) {
                console.log("2");
                return;
            }

            if (!game.createTrade(offered, wanted)) {
                console.log("3");
                return;
            }

            console.log("CREATE TRADE SUCCESS:", game.currentTrade);

            broadcastGameState(game);
        });

        socket.on("game:acceptTrade", () => {
            if (!socket.playerId) {
                return;
            }

            if (!game.acceptTrade(socket.playerId)) {
                console.log("TRADE ACCEPT REJECTED");
                return;
            }

            console.log(
                "TRADE ACCEPTED:",
                socket.playerId
            );

            broadcastGameState(game);
        });

        socket.on("game:declineTrade", () => {
            if (!socket.playerId) {
                return;
            }

            if (!game.declineTrade(socket.playerId)) {
                console.log("TRADE DECLINE REJECTED");
                return;
            }

            console.log(
                "TRADE DECLINED:",
                socket.playerId
            );

            broadcastGameState(game);
        });

        socket.on("game:resolveTrade", ({ playerId }) => {
            if (!socket.playerId) {
                return;
            }

            // Only the player who created the trade
            // can choose which accepted player to trade with.
            if (game.currentTrade?.playerId !== socket.playerId) {
                console.log("TRADE RESOLUTION REJECTED");
                return;
            }

            const success = game.resolveTrade(playerId);

            if (!success) {
                console.log("TRADE RESOLUTION FAILED");
                return;
            }

            console.log(
                "TRADE RESOLVED WITH:",
                playerId
            );

            broadcastGameState(game);
        });

        socket.on("game:cancelTrade", () => {
            if (!socket.playerId) {
                return;
            }

            if (!game.cancelTrade(socket.playerId)) {
                console.log("TRADE CANCEL REJECTED");
                return;
            }

            console.log(
                "TRADE CANCELLED:",
                socket.playerId
            );

            broadcastGameState(game);
        });

        socket.on("game:buyDevCard", () => {
            if (!socket.playerId) {
                return;
            }

            if (game.currentPlayerId !== socket.playerId) {
                return;
            }

            if (!game.buyDevCard(socket.playerId)) {
                console.log("DEV CARD PURCHASE REJECTED");
                return;
            }

            console.log(
                "DEV CARD PURCHASED:",
                socket.playerId
            );

            broadcastGameState(game);
        });

        socket.on("game:playKnight", () => {
            if (!socket.playerId) {
                return;
            }

            if (game.currentPlayerId !== socket.playerId) {
                return;
            }

            const result = game.playKnight();

            if (!result || !result.success) {
                console.log("KNIGHT PLAY REJECTED");
                return;
            }

            if (result.achievementChanged) {
                emitAchievementSound(io, game);
            }

            console.log(
                "KNIGHT PLAYED:",
                socket.playerId
            );

            broadcastGameState(game);
        });

        socket.on("game:playRoadBuilding", () => {
            if (!socket.playerId) {
                return;
            }

            if (game.currentPlayerId !== socket.playerId) {
                return;
            }

            if (!game.playRoadBuilding()) {
                console.log("ROAD BUILDING PLAY REJECTED");
                return;
            }

            console.log(
                "ROAD BUILDING PLAYED:",
                socket.playerId
            );

            broadcastGameState(game);
        });

        socket.on("game:playMonopoly", ({ resource }) => {
            if (!socket.playerId) {
                return;
            }

            if (game.currentPlayerId !== socket.playerId) {
                return;
            }

            if (!game.playMonopoly(resource)) {
                console.log("MONOPOLY PLAY REJECTED");
                return;
            }

            console.log(
                "MONOPOLY PLAYED:",
                socket.playerId,
                resource
            );

            broadcastGameState(game);
        });

        socket.on("game:playInvention", () => {
            if (!socket.playerId) {
                return;
            }

            if (game.currentPlayerId !== socket.playerId) {
                return;
            }

            if (!game.playInvention()) {
                console.log("INVENTION PLAY REJECTED");
                return;
            }

            console.log(
                "INVENTION PLAYED:",
                socket.playerId
            );

            broadcastGameState(game);
        });

        socket.on("game:resolveInvention", ({ resources }) => {
            if (!socket.playerId) {
                return;
            }

            if (game.currentPlayerId !== socket.playerId) {
                return;
            }

            if (!game.resolveInvention(resources)) {
                console.log("INVENTION RESOLUTION REJECTED");
                return;
            }

            console.log(
                "INVENTION RESOLVED:",
                socket.playerId,
                resources
            );

            broadcastGameState(game);
        });

        // game settings

        socket.on("game:setBankResourceCount", (amount) => {
            game.setBankResourceCount(amount);
            broadcastGameState(game);
        });

        socket.on("game:setRobberSafetyNumber", (number) => {
            game.setRobberSafetyNumber(number);
            broadcastGameState(game);
        });

        socket.on("game:setVictoryPointsNeeded", (amount) => {
            game.setVictoryPointsNeeded(amount);
            broadcastGameState(game);
        });

        socket.on("game:setBoardLayout", (layout) => {
            const boardLayout = layout
                .split(",")
                .map(value => Number(value.trim()));

            if (boardLayout.some(value => value <= 0 || !Number.isInteger(value))) {
                return;
            }

            game.setBoardLayout(boardLayout);
            broadcastGameState(game);
        });

        socket.on("game:regenerateBoard", () => {
            game.regenerateBoard();
            broadcastGameState(game);
        });

        socket.on("game:reset", () => {
            game.reset(true);
            broadcastGameState(game);
        });

        socket.on("game:setPieceLimit", ({ piece, value }) => {
            game.setPieceLimit(piece, value);
            broadcastGameState(game);
        });

    });

}

module.exports = registerSocketHandlers;