const { GAME_PHASES, SETUP_SUBPHASES, GAMEPLAY_SUBPHASES } = require("../constants/GameConstants");
const generateBoard = require("../../src/board/BoardGenerator");

const Bank = require("./Bank");
const SetupManager = require("./SetupManager");
const ResourceManager = require("./ResourceManager");
const BuildManager = require("./BuildManager");
const RobberManager = require("./RobberManager");
const TradeManager = require("./TradeManager");
const ProductionManager = require("./ProductionManager");
const TurnManager = require("./TurnManager");
const VictoryPointManager = require("./VictoryPointManager");
const DevCardManager = require("./DevCardManager");

class Game {
    constructor() {
        this.boardLayout = [3, 4, 5, 4, 3];
        this.board = generateBoard(this.boardLayout);
        this.players = new Map();
        this.bank = new Bank();
        this.bankResourceCount = 19;
        this.currentPlayerId = null;
        this.diceRoll = null;
        this.currentTrade = null;
        this.discardRequirements = new Map();
        this.robberTileId = null;
        this.robberVictims = [];
        this.robberSafetyNumber = 7;
        this.victoryPointsNeeded = 10;
        this.winner = null;

        this.phase = GAME_PHASES.LOBBY;
        this.subphase = SETUP_SUBPHASES.ROLL_FOR_TURN_ORDER;
        this.setupSettlementVertexId = null;

        this.colors = [
            "red",
            "blue",
            "#51d657",
            "orange",
            "#fa53ec",
            "#00ffff"
        ];

        this.turnOrderRolls = new Map();
        this.setupTurnOrder = [];
        this.setupTurnIndex = 0;

        this.setup = new SetupManager(this);
        this.resources = new ResourceManager(this);
        this.build = new BuildManager(this);
        this.robber = new RobberManager(this);
        this.robber.initializeRobber();
        this.trade = new TradeManager(this);
        this.production = new ProductionManager(this);
        this.turn = new TurnManager(this);
        this.victoryPoints = new VictoryPointManager(this);
        this.devCards = new DevCardManager(this);
    }

    addPlayer(player) {
        this.players.set(player.id, player);
    }

    // Bank.js

    setBankResourceCount(amount) {
        this.bank.setResourceCount(amount);
        this.bankResourceCount = amount;
    }

    // ProductionManager.js

    rollProductionDice() {
        return this.production.rollProductionDice();
    }

    // VictoryPointManager.js

    updatePlayerVictoryPoints(playerId) {
        return this.victoryPoints.updatePlayerVictoryPoints(playerId);
    }

    updateLongestRoad() {
        return this.victoryPoints.updateLongestRoad();
    }

    // DevCardManager.js

    // drawDevCard(playerId) {
    //     return this.devCards.drawCard(playerId);
    // }

    buyDevCard(playerId) {
        return this.devCards.buyDevCard(playerId);
    }

    // BuildManager.js

    canBuildRoad(edgeId) {
        return this.build.canBuildRoad(edgeId);
    }

    canBuildSetupRoad(edgeId) {
        return this.build.canBuildSetupRoad(edgeId);
    }

    getBuildableRoads() {
        return this.build.getBuildableRoads();
    }

    placeRoad(edgeId) {
        return this.build.placeRoad(edgeId);
    }

    canBuildSettlement(vertexId) {
        return this.build.canBuildSettlement(vertexId);
    }

    getBuildableSettlements() {
        return this.build.getBuildableSettlements();
    }

    placeSettlement(vertexId) {
        return this.build.placeSettlement(vertexId);
    }

    claimPort(vertexId) {
        return this.build.claimPort(vertexId);
    }

    canBuildCity(vertexId) {
        return this.build.canBuildCity(vertexId);
    }

    getBuildableCities() {
        return this.build.getBuildableCities();
    }

    placeCity(vertexId) {
        return this.build.placeCity(vertexId);
    }

    getBuildAvailability(playerId) {
        return this.build.getBuildAvailability(playerId);
    }

    // TurnManager.js

    endTurn() {
        return this.turn.endTurn();
    }

    // ResourceManager.js

    giveResourceToPlayer(playerId, resource, amount) {
        return this.resources.giveResourceToPlayer(
            playerId,
            resource,
            amount
        );
    }

    returnResourceToBank(playerId, resource, amount) {
        return this.resources.returnResourceToBank(
            playerId,
            resource,
            amount
        );
    }

    canAfford(playerId, cost) {
        return this.resources.canAfford(
            playerId,
            cost
        );
    }

    payCost(playerId, cost) {
        return this.resources.payCost(
            playerId,
            cost
        );
    }

    // RobberManager.js

    moveRobber(tileId) {
        return this.robber.moveRobber(tileId);
    }

    stealResource(victimId) {
        return this.robber.stealResource(victimId);
    }

    discardResources(playerId, resources) {
        return this.robber.discardResources(
            playerId,
            resources
        );
    }

    // DevCardManager.js

    playKnight() {
        return this.devCards.playKnight();
    }

    playRoadBuilding() {
        return this.devCards.playRoadBuilding();
    }

    playMonopoly(resource) {
        return this.devCards.playMonopoly(resource);
    }

    playInvention() {
        return this.devCards.playInvention();
    }

    resolveInvention(resources) {
        return this.devCards.resolveInvention(resources);
    }

    // TradeManager.js

    bankTrade(offeredResources, wantedResources) {
        return this.trade.bankTrade(
            offeredResources,
            wantedResources
        );
    }

    createTrade(offeredResources, wantedResources) {
        return this.trade.createTrade(
            offeredResources,
            wantedResources
        );
    }

    acceptTrade(playerId) {
        return this.trade.acceptTrade(playerId);
    }

    declineTrade(playerId) {
        return this.trade.declineTrade(playerId);
    }

    resolveTrade(playerId) {
        return this.trade.resolveTrade(playerId);
    }

    cancelTrade(playerId) {
        return this.trade.cancelTrade(playerId);
    }

    // setters

    setRobberSafetyNumber(number) {
        if (!Number.isFinite(number) || number <= 0) {
            this.robberSafetyNumber = 7;
            return;
        }

        this.robberSafetyNumber = number;
    }

    setVictoryPointsNeeded(points) {
        if (!Number.isFinite(points) || points <= 0) {
            this.victoryPointsNeeded = 10;
            return;
        }

        this.victoryPointsNeeded = points;
    }

    setBoardLayout(layout) {
        this.boardLayout = layout;
        this.board = generateBoard(layout);
        this.robber.initializeRobber();
    }

    regenerateBoard() {
        this.board = generateBoard(this.boardLayout);
        this.robber.initializeRobber();
    }

    reset(keepPlayers = false) {
        // Reset board
        this.board = generateBoard(this.boardLayout);

        // Reset bank
        this.bank.setResourceCount(this.bankResourceCount);


        if (keepPlayers) {
            for (const player of this.players.values()) {
            player.victoryPoints = 0;
            player.secretVictoryPoints = 0;

            player.hasLongestRoad = false;
            player.longestRoad = 0;

            player.hasLargestArmy = false;
            player.knightsPlayed = 0;

            player.resources = {
                wood: 0,
                brick: 0,
                wheat: 0,
                sheep: 0,
                ore: 0
            };

            player.ports = [];

            player.devCards = [];
            player.devCardPlayed = false;
            player.roadBuildingRemaining = 0;
            player.inventionActive = false;
        }
        } else {
            // CLEAR ALL PLAYERS FROM THE GAME MAP
            this.players.clear();
        }

        // Reset development card deck
        this.devCards.initializeDeck();

        // Reset robber
        this.robber.initializeRobber();
        this.robberVictims = [];

        // Reset trades and discards
        this.currentTrade = null;
        this.discardRequirements = new Map();

        // Reset turn/setup state
        this.currentPlayerId = null;
        this.diceRoll = null;
        this.turnOrderRolls = new Map();
        this.setupTurnOrder = [];
        this.setupTurnIndex = 0;
        this.setupSettlementVertexId = null;

        // Return to lobby
        this.phase = GAME_PHASES.LOBBY;
        this.subphase = SETUP_SUBPHASES.ROLL_FOR_TURN_ORDER;

        this.winner = null;
    }

    checkWinner() {
        for (const player of this.players.values()) {
            const totalVictoryPoints =
                player.victoryPoints + player.secretVictoryPoints;

            if (totalVictoryPoints >= this.victoryPointsNeeded) {
                this.winner = player.id;
                return player;
            }
        }

        return null;
    }

}

module.exports = Game;