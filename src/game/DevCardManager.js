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

        // player.devCards.push(card);

        player.devCards.push({
            type: card,
            boughtThisTurn: true
        });

        this.game.victoryPoints.updatePlayerVictoryPoints(playerId);

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

    canPlayDevCard(playerId) {
        if (this.game.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (this.game.subphase !== GAMEPLAY_SUBPHASES.ACTION) {
            return false;
        }

        if (this.game.currentPlayerId !== playerId) {
            return false;
        }

        const player = this.game.players.get(playerId);

        if (!player) {
            return false;
        }

        if (player.devCardPlayed) {
            return false;
        }

        return true;
    }

    playKnight() {
        const playerId = this.game.currentPlayerId;

        if (!this.canPlayDevCard(playerId)) {
            return false;
        }

        const player = this.game.players.get(playerId);

        const knightIndex = player.devCards.findIndex(
            card =>
                card.type === "knight" &&
                !card.boughtThisTurn
        );

        if (knightIndex === -1) {
            return false;
        }

        player.devCards.splice(knightIndex, 1);
        player.devCardPlayed = true;
        player.knightsPlayed++;
        this.game.victoryPoints.updateLargestArmy();
        
        return this.game.robber.startKnightRobberPlacement();
    }

    playRoadBuilding() {
        const playerId = this.game.currentPlayerId;

        if (!this.canPlayDevCard(playerId)) {
            return false;
        }

        const player = this.game.players.get(playerId);

        const cardIndex = player.devCards.findIndex(
            card =>
                card.type === "road_building" &&
                !card.boughtThisTurn
        );

        if (cardIndex === -1) {
            return false;
        }

        player.devCards.splice(cardIndex, 1);

        player.devCardPlayed = true;
        player.roadBuildingRemaining = 2;

        return true;
    }

    playMonopoly(resource) {
        const playerId = this.game.currentPlayerId;

        if (!this.canPlayDevCard(playerId)) {
            return false;
        }

        const player = this.game.players.get(playerId);

        const cardIndex = player.devCards.findIndex(
            card =>
                card.type === "monopoly" &&
                !card.boughtThisTurn
        );

        if (cardIndex === -1) {
            return false;
        }

        const validResources = [
            "wood",
            "brick",
            "wheat",
            "sheep",
            "ore"
        ];

        if (!validResources.includes(resource)) {
            return false;
        }

        player.devCards.splice(cardIndex, 1);

        for (const otherPlayer of this.game.players.values()) {
            if (otherPlayer.id === playerId) {
                continue;
            }

            const amount = otherPlayer.resources[resource];

            if (amount > 0) {
                otherPlayer.removeResource(resource, amount);
                player.addResource(resource, amount);
            }
        }

        player.devCardPlayed = true;

        return true;
    }

    playInvention() {
        const playerId = this.game.currentPlayerId;

        if (!this.canPlayDevCard(playerId)) {
            return false;
        }

        const player = this.game.players.get(playerId);

        const cardIndex = player.devCards.findIndex(
            card =>
                card.type === "invention" &&
                !card.boughtThisTurn
        );

        if (cardIndex === -1) {
            return false;
        }

        player.devCards.splice(cardIndex, 1);

        player.devCardPlayed = true;
        player.inventionActive = true;

        return true;
    }

    resolveInvention(resources) {
        const playerId = this.game.currentPlayerId;
        const player = this.game.players.get(playerId);

        if (!player) {
            return false;
        }

        if (!player.inventionActive) {
            return false;
        }

        if (!resources || typeof resources !== "object") {
            return false;
        }

        const validResources = [
            "wood",
            "brick",
            "wheat",
            "sheep",
            "ore"
        ];

        let total = 0;

        for (const resource of validResources) {
            const amount = resources[resource] ?? 0;

            if (!Number.isInteger(amount) || amount < 0) {
                return false;
            }

            if (amount > this.game.bank.resources[resource]) {
                return false;
            }

            total += amount;
        }

        if (total !== 2) {
            return false;
        }

        for (const resource of validResources) {
            const amount = resources[resource] ?? 0;

            if (amount > 0) {
                this.game.bank.removeResource(resource, amount);
                player.addResource(resource, amount);
            }
        }

        player.inventionActive = false;

        return true;
    }
}

module.exports = DevCardManager;