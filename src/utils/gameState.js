function getGameState(game) {
    return {
        lobbyCode: game.lobbyCode,
        config: game.config,
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
        pirateTileId: game.pirateTileId,
        robberVictims: game.robberVictims,
        robberSafetyNumber: game.robberSafetyNumber,
        bankResourceCount: game.bankResourceCount,
        victoryPointsNeeded: game.victoryPointsNeeded,
        boardLayout: game.boardLayout,
        pieceLimits: game.pieceLimits,
        winner: game.winner,
        ports: game.board.ports,
        turnEndsAt: game.timer.turnEndsAt,
        timerPaused: game.timer.timerPaused,
        timerRemainingMs: game.timer.timerRemainingMs,
        turnLog: game.turnLog.entries
    };
}

module.exports = getGameState;