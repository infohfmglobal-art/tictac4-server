import io from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";

export class Multiplayer {
  constructor() {
    this.serverUrl = "https://tictac4-server-27d.onrender.com"; // ✅ Your live Render server
    this.socket = io(this.serverUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.board = null;
    this.status = null;
    this.currentPlayer = null;
    this.gameId = null;

    this.#setupEvents();
  }

  #setupEvents() {
    // Connection success
    this.socket.on("connect", () => {
      console.log("✅ Connected to multiplayer server");
      this.status.innerText = "Connected — waiting for opponent...";
      this.socket.emit("joinGame");
    });

    // Connection error
    this.socket.on("connect_error", (err) => {
      console.error("❌ Connection error:", err.message);
      this.status.innerText = "Connection error — retrying...";
    });

    // Opponent joined
    this.socket.on("matchFound", (data) => {
      console.log("🎮 Match found:", data);
      this.gameId = data.gameId;
      this.currentPlayer = data.symbol;
      this.status.innerText = `Game started! You are "${this.currentPlayer}"`;
    });

    // Board update
    this.socket.on("updateBoard", (data) => {
      const { board, turn } = data;
      this.board = board;
      this.#renderBoard();
      this.status.innerText = `Your turn: ${turn}`;
    });

    // Game result
    this.socket.on("gameOver", (data) => {
      const { winner } = data;
      if (winner === "draw") {
        this.status.innerText = "It's a draw!";
      } else {
        this.status.innerText = `${winner} wins!`;
      }
    });

    // Opponent disconnected
    this.socket.on("opponentLeft", () => {
      this.status.innerText = "Opponent left the game.";
    });
  }

  makeMove(index) {
    if (this.gameId && this.currentPlayer) {
      this.socket.emit("playerMove", {
        gameId: this.gameId,
        index: index,
        symbol: this.currentPlayer,
      });
    }
  }

  #renderBoard() {
    const boardElement = document.getElementById("board");
    if (!boardElement || !this.board) return;

    boardElement.innerHTML = "";
    this.board.forEach((cell, i) => {
      const btn = document.createElement("button");
      btn.className = "cell";
      btn.innerText = cell || "";
      btn.onclick = () => this.makeMove(i);
      boardElement.appendChild(btn);
    });
  }
}
