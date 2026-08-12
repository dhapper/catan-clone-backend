const Player = require("../game/Player");
const {
    GAME_PHASES,
    SETUP_SUBPHASES
} = require("../game/GameConstants");

function registerSocketHandlers(io, game) {
    function broadcastGameState() {
        io.emit("game:state", {
            players: [...game.players.values()],
            colors: game.colors,
            phase: game.phase,
            subphase: game.subphase,
            currentPlayerId: game.currentPlayerId,
            diceRoll: game.diceRoll,
            turnOrderRolls: Object.fromEntries(game.turnOrderRolls),
            setupTurnOrder: game.setupTurnOrder
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
    });
}

module.exports = registerSocketHandlers;