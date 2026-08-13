const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

const createGameRoutes = require("./src/routes/gameRoutes");
const generateBoard = require("./src/board/BoardGenerator");
const Game = require("./src/game/Game");
const registerSocketHandlers = require("./src/socket/socketHandlers");

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
});

const PORT = 3000;

app.use(cors());
app.use(express.json());

const board = generateBoard([
    3, 4, 5, 4, 3
]);

const game = new Game(board);

app.get("/api/hello", (req, res) => {
    res.json({
        message: "Hello from the Hexland backend!"
    });
});

app.use("/api", createGameRoutes(game, io));

registerSocketHandlers(io, game);

httpServer.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});