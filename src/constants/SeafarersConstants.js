const HEADING_FOR_NEW_SHORES_MAP = [
    "XXOO",
    "OOOXX",
    "OXXOXO",
    "OXXXOXO",
    "XXXXOO",
    "XXXOX",
    "XXOX"
];

const HEADING_FOR_NEW_SHORES_PORT_LOCATIONS = [
    { row: 2, column: 1, side: 4 },
    { row: 2, column: 2, side: 1 },
    { row: 4, column: 0, side: 3 },
    { row: 4, column: 0, side: 5 },
    { row: 4, column: 3, side: 0 },
    { row: 6, column: 0, side: 4 },
    { row: 6, column: 1, side: 1 },
    { row: 6, column: 1, side: 3 },
];

const THE_FOUR_ISLANDS_I_MAP = [
    "OOXX",
    "XXOXX",
    "XXOXXO",
    "OOOOOOO",
    "XXXOXX",
    "XXOXX",
    "XOOO",
];

const THE_FOUR_ISLANDS_I_PORT_LOCATIONS = [
    { row: 1, column: 1, side: 2 },
    { row: 1, column: 4, side: 0 },
    { row: 2, column: 0, side: 5 },
    { row: 2, column: 4, side: 3 },
    { row: 4, column: 0, side: 0 },
    { row: 4, column: 0, side: 3 },
    { row: 4, column: 5, side: 2 },
    { row: 5, column: 1, side: 2 },
    { row: 5, column: 3, side: 5 },
];

const THE_FOUR_ISLANDS_II_MAP = [
    "XOXX",
    "XOXXX",
    "XXOXXO",
    "OOOXOOO",
    "XXOOXX",
    "XXXOX",
    "XXOX",
];

const THE_FOUR_ISLANDS_II_PORT_LOCATIONS = [
    { row: 1, column: 0, side: 4 },
    { row: 1, column: 4, side: 2 },
    { row: 2, column: 0, side: 2 },
    { row: 3, column: 3, side: 5 },
    { row: 4, column: 0, side: 3 },
    { row: 4, column: 5, side: 2 },
    { row: 4, column: 5, side: 5 },
    { row: 5, column: 1, side: 0 },
    { row: 6, column: 0, side: 4 },
];

const THE_SIX_ISLANDS_MAP = [
    "XXOXOXX",
    "XXOXXOXX",
    "XXOXXOOXO",
    "OOOOOOOOOO",
    "OXOOXXOXX",
    "XXOXXOXX",
    "XXOXOXX",
];

const THE_SIX_ISLANDS_PORT_LOCATIONS = [
    { row: 0, column: 1, side: 5 },
    { row: 0, column: 3, side: 0 },
    { row: 0, column: 6, side: 0 },

    { row: 1, column: 1, side: 2 },
    { row: 1, column: 6, side: 3 },

    { row: 2, column: 1, side: 3 },

    { row: 5, column: 0, side: 4 },
    { row: 5, column: 3, side: 3 },
    { row: 5, column: 7, side: 1 },

    { row: 6, column: 1, side: 0 },
    { row: 6, column: 5, side: 3 },
];

const GOO_LAGOON_MAP = [
    "XXXOOXX",
    "XXOOXOXX",
    "XXOXXXOXO",
    "XOOXXXXOXO",
    "XXOXXXOXX",
    "XXOOOOXX",
    "XXXXOXX",
];

const GOO_LAGOON_PORT_LOCATIONS = [

    // left solo tile port spam
    { row: 3, column: 0, side: 1 },
    { row: 3, column: 0, side: 3 },
    { row: 3, column: 0, side: 4 },
    { row: 3, column: 0, side: 5 },

    // right ridge port spam
    { row: 2, column: 7, side: 1 },
    { row: 3, column: 8, side: 1 },

    // top left
    { row: 0, column: 1, side: 5 },
    { row: 0, column: 2, side: 0 },
    { row: 1, column: 0, side: 5 },

    // bottom left
    { row: 5, column: 0, side: 3 },
    { row: 6, column: 1, side: 3 },
    { row: 6, column: 2, side: 2 },
    { row: 6, column: 3, side: 2 },

    // top right
    { row: 0, column: 5, side: 5 },
    { row: 0, column: 6, side: 1 },

    // bottom right
    { row: 5, column: 7, side: 2 },
    { row: 6, column: 5, side: 2 },
];

const SEAFARERS_MAPS = {
    HEADING_FOR_NEW_SHORES: {
        id: "HEADING_FOR_NEW_SHORES",
        name: "Heading for New Shores",
        map: HEADING_FOR_NEW_SHORES_MAP,
        portLocations: HEADING_FOR_NEW_SHORES_PORT_LOCATIONS
    },

    THE_FOUR_ISLANDS_I: {
        id: "THE_FOUR_ISLANDS_I",
        name: "The Four Islands I",
        map: THE_FOUR_ISLANDS_I_MAP,
        portLocations: THE_FOUR_ISLANDS_I_PORT_LOCATIONS
    },

    THE_FOUR_ISLANDS_II: {
        id: "THE_FOUR_ISLANDS_II",
        name: "The Four Islands II",
        map: THE_FOUR_ISLANDS_II_MAP,
        portLocations: THE_FOUR_ISLANDS_II_PORT_LOCATIONS
    },

    THE_SIX_ISLANDS: {
        id: "THE_SIX_ISLANDS",
        name: "The Six Islands",
        map: THE_SIX_ISLANDS_MAP,
        portLocations: THE_SIX_ISLANDS_PORT_LOCATIONS
    },

    GOO_LAGOON: {
        id: "GOO_LAGOON",
        name: "Goo Lagoon",
        map: GOO_LAGOON_MAP,
        portLocations: GOO_LAGOON_PORT_LOCATIONS
    }
};

module.exports = {
    SEAFARERS_MAPS
};