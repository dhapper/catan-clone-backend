function serializeGameState(game) {
    return {
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
        boardLayout: game.boardLayout,
        winner: game.winner,
        ports: game.board.ports,
    };
}

function broadcastGameState(io, room) {
    io.to(room.code).emit("game:state", serializeGameState(room.game));
}

module.exports = {
    serializeGameState,
    broadcastGameState
};
