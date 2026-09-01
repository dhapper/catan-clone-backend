const Player = require("../game/Player");
const {
    GAME_PHASES,
    SETUP_SUBPHASES,
    GAMEPLAY_SUBPHASES
} = require("../constants/GameConstants");

function registerSocketHandlers(io, game) {
    function broadcastGameState() {
        io.emit("game:state", {
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
            robberVictims: game.robberVictims
        });
    }

    io.on("connection", (socket) => {
        socket.playerId = null;

        console.log("Client connected:", socket.id);

        broadcastGameState();

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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);

            if (socket.playerId) {
                const player = game.players.get(socket.playerId);

                if (player) {
                    player.connected = false;
                }

                broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
        });

        socket.on("game:playKnight", () => {
            if (!socket.playerId) {
                return;
            }

            if (game.currentPlayerId !== socket.playerId) {
                return;
            }

            if (!game.playKnight()) {
                console.log("KNIGHT PLAY REJECTED");
                return;
            }

            console.log(
                "KNIGHT PLAYED:",
                socket.playerId
            );

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
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

            broadcastGameState();
        });

    });
}

module.exports = registerSocketHandlers;