const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

const createGameRoutes = require("./src/routes/gameRoutes");
const RoomManager = require("./src/rooms/RoomManager");
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

const rooms = new RoomManager();

app.get("/api/hello", (req, res) => {
    res.json({
        message: "Hello from the Hexland backend!"
    });
});

app.use("/api", createGameRoutes(rooms, io));

registerSocketHandlers(io, rooms);

httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running on port ${PORT}`);
});
