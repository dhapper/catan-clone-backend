const TILE_TYPES = [
    { type: "forest", resource: "wood" },
    { type: "mountain", resource: "ore" },
    { type: "field", resource: "wheat" },
    { type: "hill", resource: "brick" },
    { type: "pasture", resource: "sheep" },
    { type: "desert", resource: null }
];

const BASE_TILES = [
    "forest", "forest", "forest", "forest",
    "pasture", "pasture", "pasture", "pasture",
    "field", "field", "field", "field",
    "hill", "hill", "hill",
    "mountain", "mountain", "mountain",
    "desert"
];

const EXPANSION_TILES = [
    "forest",
    "pasture",
    "field",
    "hill",
    "mountain",
    "forest",
    "pasture",
    "field",
    "hill",
    "mountain",
    "desert"
];

const ALL_TILES = [
    ...BASE_TILES,
    ...EXPANSION_TILES,
    ...EXPANSION_TILES,
    ...EXPANSION_TILES,
    ...EXPANSION_TILES,
    ...EXPANSION_TILES
];

module.exports = {
    TILE_TYPES,
    BASE_TILES,
    EXPANSION_TILES,
    ALL_TILES
};