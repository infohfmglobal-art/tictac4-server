// multiplayer.js
// TicTac4 Online Multiplayer (Render-ready)
// Uses your live backend: https://tictac4-server.onrender.com

import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

const SERVER_URL = "https://tictac4-server.onrender.com";

export class MultiplayerManager {
  constructor({ onMatchStart, onOpponentMove, onMatchOver, onStatus, onLogOutcome }) {
    this.socket = null;
    this.roomId = null;
    this.symbol = null;
    this.connected = false;

    this.onMatchStart = onMatchStart;     // (symbol) => void
    this.onOpponentMove = onOpponentMove; // (index, symbol) => void
    this.onMatchOver = onMatchOver;       // (resultObj) => void
    this.onStatus = onStatus;             // (text) => void
    this.onLogOutcome = onLogOutcome;     // (roomId, result, winner) => void

    this.connect();
  }

  connect() {
    this.socket = io(SERVER_URL, { transports: ["websocket"] });

    this.socket.on("connect", () => {
      this.connected = true;
      this._status(`Connected to server`);
    });

    this.socket.on("disconnect", () => {
      this.connected = false;
      this._status(`Disconnected`);
    });

    // Assigned to a room and symbol
    this.socket.on("roomAssigned", ({ roomId, symbol }) => {
      this.roomId = roomId;
      this.symbol = symbol;
      this._status(`Match found. You are ${symbol}.`);
      if (this.onMatchStart) this.onMatchStart(symbol);
    });

    // Opponent move arrived
    this.socket.on("moveMade", ({ index, symbol }) => {
      if (this.onOpponentMove) this.onOpponentMove(index, symbol);
    });

    // Match completed (win/draw)
    this.socket.on("gameOver", (payload) => {
      // payload: { winner: "X" | "O" | "draw" }
      if (this.onLogOutcome) {
        const result = payload.winner === "draw" ? "draw" : "win";
        const winner = payload.winner === "draw" ? null : payload.winner;
        this.onLogOutcome(this.roomId, result, winner);
      }
      if (this.onMatchOver) this.onMatchOver(payload);
    });
  }

  joinMatch(preferredSymbol = "X") {
    if (!this.connected) {
      this._status("Connecting...");
    }
    this._status("Waiting for opponent…");
    this.socket.emit("joinMatch", { preferredSymbol });
  }

  makeMove(index) {
    if (!this.roomId) return;
    this.socket.emit("makeMove", { index, roomId: this.roomId });
  }

  _status(text) {
    if (this.onStatus) this.onStatus(text);
    console.log(`🌍 [MP]: ${text}`);
  }
}
