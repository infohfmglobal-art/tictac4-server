import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";

export class MultiplayerManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.connected = false;
        this.roomId = null;

        // ✅ Your working Render server URL
        this.serverUrl = "https://tictac4-server.onrender.com";
    }

    connect() {
        this.socket = io(this.serverUrl, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });

        this.socket.on("connect", () => {
            console.log("✅ Connected to multiplayer server");
            this.connected = true;
            this.game.updateOnlineStatus("Connected ✅");
            this.socket.emit("join");
        });

        this.socket.on("disconnect", () => {
            console.log("❌ Disconnected from server");
            this.connected = false;
            this.game.updateOnlineStatus("Disconnected 🔴");
        });

        this.socket.on("match_found", (data) => {
            console.log("🎯 Match found:", data);
            this.roomId = data.roomId;
            this.game.playerSymbol = data.symbol;
            this.game.updateOnlineStatus(`Matched ✅ You are "${data.symbol}"`);
            this.game.resetBoard();
        });

        this.socket.on("move", (data) => {
            console.log("⬅️ Move received:", data);
            this.game.applyOpponentMove(data.index);
        });

        this.socket.on("opponent_left", () => {
            console.log("👋 Opponent left");
            this.game.updateOnlineStatus("Opponent left 😢 Searching new match...");
            this.game.resetBoard();
            this.socket.emit("join");
        });
    }

    sendMove(index) {
        if (!this.connected || !this.roomId) return;
        console.log("➡️ Sending move:", index);

        this.socket.emit("move", {
            roomId: this.roomId,
            index: index,
        });
    }
}
