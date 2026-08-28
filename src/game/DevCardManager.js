const {
    GAME_PHASES,
    GAMEPLAY_SUBPHASES
} = require("../constants/GameConstants");
const {
    BASE_DEV_CARDS
} = require("../constants/DevCardConstants");
const {
    STRUCTURE_TYPES,
    BUILD_COSTS
} = require("../constants/BuildingConstants");

class DevCardManager {
    constructor(game) {
        this.game = game;

        this.deck = [];
    }

    initializeDeck() {
        this.deck = [...BASE_DEV_CARDS];

        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [this.deck[i], this.deck[j]] =
                [this.deck[j], this.deck[i]];
        }
    }

    drawCard(playerId) {
        const player = this.game.players.get(playerId);

        if (!player) {
            return false;
        }

        if (this.deck.length === 0) {
            return false;
        }

        const card = this.deck.pop();

        player.devCards.push(card);

        return true;
    }

    buyDevCard(playerId) {
        if (this.game.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (this.game.subphase !== GAMEPLAY_SUBPHASES.ACTION) {
            return false;
        }

        if (this.game.currentPlayerId !== playerId) {
            return false;
        }

        if (this.deck.length === 0) {
            return false;
        }

        if (!this.game.canAfford(
            playerId,
            BUILD_COSTS[STRUCTURE_TYPES.DEVELOPMENT_CARD]
        )) {
            return false;
        }

        if (!this.game.payCost(
            playerId,
            BUILD_COSTS[STRUCTURE_TYPES.DEVELOPMENT_CARD]
        )) {
            return false;
        }

        return this.drawCard(playerId);
    }
}

module.exports = DevCardManager;