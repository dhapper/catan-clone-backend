function emitNextTurnStartSound(io, game) {
    const currentPlayerId = game.currentPlayerId;

    const lobbySockets =
        io.sockets.adapter.rooms.get(`lobby:${game.lobbyCode}`) || new Set();

    for (const socketId of lobbySockets) {
        const socket = io.sockets.sockets.get(socketId);

        if (!socket) {
            continue;
        }

        if (socket.playerId === currentPlayerId) {
            socket.emit("game:sound", "start");
        } else {
            socket.emit("game:sound", "pickupDice");
        }
    }
}

function emitAchievementSound(io, game) {
    io.to(`lobby:${game.lobbyCode}`).emit("game:sound", "achievement");
}

module.exports = {
    emitNextTurnStartSound,
    emitAchievementSound
};