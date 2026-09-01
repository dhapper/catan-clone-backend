const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

const createGameRoutes = require("./src/routes/gameRoutes");
const Game = require("./src/game/Game");
const registerSocketHandlers = require("./src/socket/socketHandlers");

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const game = new Game();

app.get("/api/hello", (req, res) => {
    res.json({
        message: "Hello from the Hexland backend!"
    });
});

app.use("/api", createGameRoutes(game, io));

registerSocketHandlers(io, game);

httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running on port ${PORT}`);
});