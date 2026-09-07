function emitNextTurnStartSound(io, game) {
    const currentPlayerId = game.currentPlayerId;

    for (const socket of io.sockets.sockets.values()) {
        if (socket.playerId === currentPlayerId) {
            socket.emit("game:sound", "start");
        } else {
            socket.emit("game:sound", "pickupDice");
        }
    }
}

function emitAchievementSound(io) {
    io.emit("game:sound", "achievement");
}

module.exports = {
    emitNextTurnStartSound,
    emitAchievementSound
};