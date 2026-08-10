const express = require("express");
const cors = require("cors");

const generateBoard = require("./src/board/BoardGenerator");
const Game = require("./src/game/Game");
const Player = require("./src/game/Player");
const createGameRoutes = require("./src/routes/gameRoutes");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const board = generateBoard([5, 4, 3, 2, 3, 4, 5, 4, 3]);

const game = new Game(board);

const player = new Player(
    "p1",
    "Player 1",
    "blue"
);

game.addPlayer(player);
game.currentPlayerId = player.id;

app.get("/api/hello", (req, res) => {
    res.json({
        message: "Hello from the Hexland backend!"
    });
});

app.use("/api", createGameRoutes(game));

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});