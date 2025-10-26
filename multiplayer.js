import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";

export class MultiplayerManager {
  constructor(serverUrl, onMoveReceived, onGameStart) {
    this.serverUrl = serverUrl;
    this.onMoveReceived = onMoveReceived;
    this.onGameStart = onGameStart;
    this.socket = null;
    this.symbol = null;
    this.room = null;
  }

  connect() {
    this.socket = io(this.serverUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });

    this.socket.on("connect", () => {
      console.log("✅ Connected to multiplayer server:", this.serverUrl);
      this.socket.emit("joinAutoRoom");
    });

    this.socket.on("assignSymbol", (symbol) => {
      this.symbol = symbol;
      console.log("🎮 You are:", symbol);
      if (this.onGameStart) this.onGameStart(symbol);
    });

    this.socket.on("move", (data) => {
      console.log("📩 Opponent move received:", data);
      if (this.onMoveReceived) this.onMoveReceived(data);
    });

    this.socket.on("roomJoined", (room) => {
      this.room = room;
      console.log("🏠 Joined room:", room);
    });

    this.socket.on("disconnect", () => {
      console.warn("⚠️ Disconnected from server. Trying to reconnect...");
    });

    this.socket.on("connect_error", (err) => {
      console.error("❌ Connection error:", err.message);
    });
  }

  sendMove(index, symbol) {
    if (!this.socket) {
      console.error("Socket not connected.");
      return;
    }
    console.log("📤 Sending move:", index, symbol);
    this.socket.emit("move", { index, symbol });
  }
}
