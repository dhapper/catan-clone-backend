const Game = require("../game/Game");

// No 0/O/1/I/L so codes are easy to read aloud and type
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000;

class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    generateCode() {
        let code;

        do {
            code = "";
            for (let i = 0; i < CODE_LENGTH; i++) {
                code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
            }
        } while (this.rooms.has(code));

        return code;
    }

    createRoom() {
        const code = this.generateCode();

        const room = {
            code,
            game: new Game(),
            socketCount: 0,
            cleanupTimer: null
        };

        this.rooms.set(code, room);
        this.scheduleCleanup(room);

        console.log("Room created:", code);

        return room;
    }

    getRoom(code) {
        if (typeof code !== "string") {
            return null;
        }

        return this.rooms.get(code.trim().toUpperCase()) ?? null;
    }

    addSocket(room) {
        room.socketCount++;

        if (room.cleanupTimer) {
            clearTimeout(room.cleanupTimer);
            room.cleanupTimer = null;
        }
    }

    removeSocket(room) {
        room.socketCount = Math.max(0, room.socketCount - 1);

        if (room.socketCount === 0) {
            this.scheduleCleanup(room);
        }
    }

    scheduleCleanup(room) {
        if (room.cleanupTimer) {
            clearTimeout(room.cleanupTimer);
        }

        room.cleanupTimer = setTimeout(() => {
            if (room.socketCount === 0) {
                this.rooms.delete(room.code);
                console.log("Room deleted (empty):", room.code);
            }
        }, EMPTY_ROOM_TTL_MS);
    }
}

module.exports = RoomManager;
