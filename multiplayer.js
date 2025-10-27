import io from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";

export class Multiplayer {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.connected = false;
    this.serverUrl = "https://tictac4-server-2z7d.onrender.com"; // ✅ your live Render URL
  }

  connect() {
    this.socket = io(this.serverUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on("connect", () => {
      console.log("✅ Connected to multiplayer server");
      this.connected = true;
      this.game.showStatus("Connected — Waiting for opponent…");
    });

    this.socket.on("disconnect", () => {
      console.log("⚠️ Disconnected from server");
      this.connected = false;
      this.game.showStatus("Connection lost — Reconnecting…");
    });

    this.socket.on("matchFound", (data) => {
      console.log("🎮 Match found:", data);
      this.symbol = data.symbol;
      this.game.startMultiplayer(data.symbol);
      this.game.showStatus("Opponent found — Your symbol: " + data.symbol);
    });

    this.socket.on("updateBoard", (data) => {
      this.game.updateBoard(data.board, data.turn);
    });

    this.socket.on("gameOver", ({ winner }) => {
      this.game.endGame(winner);
    });

    this.socket.on("opponentLeft", () => {
      this.game.showStatus("Opponent left the game 💤");
    });
  }

  sendMove(index, symbol) {
    if (this.socket && this.connected) {
      this.socket.emit("playerMove", {
        gameId: this.game.currentGameId,
        index,
        symbol,
      });
    }
  }
}
