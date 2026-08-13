const STRUCTURE_TYPES = {
    ROAD: "road",
    SETTLEMENT: "settlement",
    CITY: "city",
    DEVELOPMENT_CARD: "developmentCard"
};

const BUILDING_PRODUCTION = {
    [STRUCTURE_TYPES.SETTLEMENT]: 1,
    [STRUCTURE_TYPES.CITY]: 2
};

const BUILD_COSTS = {
    [STRUCTURE_TYPES.ROAD]: {
        wood: 1,
        brick: 1
    },

    [STRUCTURE_TYPES.SETTLEMENT]: {
        wood: 1,
        brick: 1,
        wheat: 1,
        sheep: 1
    },

    [STRUCTURE_TYPES.CITY]: {
        wheat: 2,
        ore: 3
    },

    [STRUCTURE_TYPES.DEVELOPMENT_CARD]: {
        wheat: 1,
        sheep: 1,
        ore: 1
    }
};

module.exports = {
    STRUCTURE_TYPES,
    BUILDING_PRODUCTION,
    BUILD_COSTS
};