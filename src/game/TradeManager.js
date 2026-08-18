const {
    GAME_PHASES,
    GAMEPLAY_SUBPHASES
} = require("../constants/GameConstants");

class TradeManager {
    constructor(game) {
        this.game = game;
    }

    bankTrade(offeredResources, wantedResources) {
        if (this.game.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (
            this.game.subphase !==
            GAMEPLAY_SUBPHASES.ACTION
        ) {
            return false;
        }

        const player =
            this.game.players.get(this.game.currentPlayerId);

        if (!player) {
            return false;
        }

        const resources = Object.keys(player.resources);

        // Validate the resource objects.
        for (const resource of resources) {
            if (
                !Number.isInteger(
                    offeredResources?.[resource] ?? 0
                ) ||
                !Number.isInteger(
                    wantedResources?.[resource] ?? 0
                )
            ) {
                return false;
            }

            if (
                (offeredResources?.[resource] ?? 0) < 0 ||
                (wantedResources?.[resource] ?? 0) < 0
            ) {
                return false;
            }
        }

        // Player must actually have everything they are offering.
        for (const resource of resources) {
            const amount =
                offeredResources[resource] ?? 0;

            if (player.resources[resource] < amount) {
                return false;
            }
        }

        // Determine the player's best trading ratio.
        const tradeRatios = {};

        for (const resource of resources) {
            tradeRatios[resource] = 4;

            for (const port of player.ports) {
                if (
                    port.resource === resource ||
                    port.resource === "any"
                ) {
                    const ratio =
                        Number.parseInt(
                            port.offer.split(":")[0]
                        );

                    tradeRatios[resource] =
                        Math.min(
                            tradeRatios[resource],
                            ratio
                        );
                }
            }
        }

        // Validate offered resources.
        for (const resource of resources) {
            const offered =
                offeredResources[resource] ?? 0;

            if (offered === 0) {
                continue;
            }

            const ratio = tradeRatios[resource];

            if (offered % ratio !== 0) {
                return false;
            }
        }

        const bankDemand = {};

        for (const resource of resources) {
            bankDemand[resource] =
                wantedResources[resource] ?? 0;
        }

        const totalTradeUnits =
            resources.reduce(
                (total, resource) => {
                    const offered =
                        offeredResources[resource] ?? 0;

                    if (offered === 0) {
                        return total;
                    }

                    return (
                        total +
                        offered / tradeRatios[resource]
                    );
                },
                0
            );

        const totalWanted =
            resources.reduce(
                (total, resource) =>
                    total + bankDemand[resource],
                0
            );

        if (totalWanted !== totalTradeUnits) {
            return false;
        }

        // Bank must have everything requested.
        for (const resource of resources) {
            if (
                this.game.bank.resources[resource] <
                bankDemand[resource]
            ) {
                return false;
            }
        }

        // Execute the trade.
        for (const resource of resources) {
            const amount =
                offeredResources[resource] ?? 0;

            if (amount > 0) {
                this.game.returnResourceToBank(
                    this.game.currentPlayerId,
                    resource,
                    amount
                );
            }
        }

        for (const resource of resources) {
            const amount =
                bankDemand[resource];

            if (amount > 0) {
                this.game.giveResourceToPlayer(
                    this.game.currentPlayerId,
                    resource,
                    amount
                );
            }
        }

        return true;
    }

    createTrade(offeredResources, wantedResources) {
        if (this.game.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (
            this.game.subphase !==
            GAMEPLAY_SUBPHASES.ACTION
        ) {
            return false;
        }

        if (this.game.currentTrade) {
            return false;
        }

        const player =
            this.game.players.get(this.game.currentPlayerId);

        if (!player) {
            return false;
        }

        const resources = Object.keys(player.resources);

        for (const resource of resources) {
            const offered =
                offeredResources?.[resource] ?? 0;

            const wanted =
                wantedResources?.[resource] ?? 0;

            if (
                !Number.isInteger(offered) ||
                !Number.isInteger(wanted)
            ) {
                return false;
            }

            if (offered < 0 || wanted < 0) {
                return false;
            }
        }

        for (const resource of resources) {
            const amount =
                offeredResources[resource] ?? 0;

            if (player.resources[resource] < amount) {
                return false;
            }
        }

        const hasOffer = resources.some(
            resource =>
                (offeredResources[resource] ?? 0) > 0
        );

        const hasWanted = resources.some(
            resource =>
                (wantedResources[resource] ?? 0) > 0
        );

        if (!hasOffer || !hasWanted) {
            return false;
        }

        this.game.currentTrade = {
            id: `trade-${Date.now()}`,
            playerId: this.game.currentPlayerId,
            offered: { ...offeredResources },
            wanted: { ...wantedResources },
            acceptedBy: [],
            declinedBy: []
        };

        return true;
    }

    acceptTrade(playerId) {
        if (this.game.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (
            this.game.subphase !==
            GAMEPLAY_SUBPHASES.ACTION
        ) {
            return false;
        }

        if (!this.game.currentTrade) {
            return false;
        }

        if (
            playerId ===
            this.game.currentTrade.playerId
        ) {
            return false;
        }

        const player =
            this.game.players.get(playerId);

        if (!player) {
            return false;
        }

        for (const resource of Object.keys(player.resources)) {
            const amount =
                this.game.currentTrade.wanted[resource] ?? 0;

            if (player.resources[resource] < amount) {
                return false;
            }
        }

        if (
            this.game.currentTrade.acceptedBy.includes(
                playerId
            )
        ) {
            return false;
        }

        this.game.currentTrade.acceptedBy.push(playerId);

        return true;
    }

    declineTrade(playerId) {
        if (!this.game.currentTrade) {
            return false;
        }

        if (
            this.game.currentTrade.playerId ===
            playerId
        ) {
            return false;
        }

        if (
            this.game.currentTrade.acceptedBy.includes(
                playerId
            )
        ) {
            return false;
        }

        if (!this.game.currentTrade.declinedBy) {
            this.game.currentTrade.declinedBy = [];
        }

        if (
            this.game.currentTrade.declinedBy.includes(
                playerId
            )
        ) {
            return false;
        }

        this.game.currentTrade.declinedBy.push(playerId);

        return true;
    }

    resolveTrade(playerId) {
        if (this.game.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (
            this.game.subphase !==
            GAMEPLAY_SUBPHASES.ACTION
        ) {
            return false;
        }

        if (!this.game.currentTrade) {
            return false;
        }

        if (
            this.game.currentTrade.playerId !==
            this.game.currentPlayerId
        ) {
            return false;
        }

        if (
            !this.game.currentTrade.acceptedBy.includes(
                playerId
            )
        ) {
            return false;
        }

        const creator =
            this.game.players.get(
                this.game.currentTrade.playerId
            );

        const recipient =
            this.game.players.get(playerId);

        if (!creator || !recipient) {
            return false;
        }

        for (const [
            resource,
            amount
        ] of Object.entries(
            this.game.currentTrade.offered
        )) {
            if (creator.resources[resource] < amount) {
                return false;
            }
        }

        for (const [
            resource,
            amount
        ] of Object.entries(
            this.game.currentTrade.wanted
        )) {
            if (recipient.resources[resource] < amount) {
                return false;
            }
        }

        // Creator -> recipient
        for (const [
            resource,
            amount
        ] of Object.entries(
            this.game.currentTrade.offered
        )) {
            if (amount > 0) {
                creator.removeResource(
                    resource,
                    amount
                );

                recipient.addResource(
                    resource,
                    amount
                );
            }
        }

        // Recipient -> creator
        for (const [
            resource,
            amount
        ] of Object.entries(
            this.game.currentTrade.wanted
        )) {
            if (amount > 0) {
                recipient.removeResource(
                    resource,
                    amount
                );

                creator.addResource(
                    resource,
                    amount
                );
            }
        }

        this.game.currentTrade = null;

        return true;
    }

    cancelTrade(playerId) {
        if (this.game.phase !== GAME_PHASES.GAMEPLAY) {
            return false;
        }

        if (
            this.game.subphase !==
            GAMEPLAY_SUBPHASES.ACTION
        ) {
            return false;
        }

        if (!this.game.currentTrade) {
            return false;
        }

        if (
            this.game.currentTrade.playerId !==
            playerId
        ) {
            return false;
        }

        this.game.currentTrade = null;

        return true;
    }
}

module.exports = TradeManager;