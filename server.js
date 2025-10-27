import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors()); // ✅ allow all origins
app.get("/", (req, res) => res.send("TicTac4 Server is live ✅"));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // ✅ client allowed
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 10000;

let waitingPlayer = null;
const games = {}; // { gameId: { board: [...], players: [socketIds], turn: 'X' } }

// === Socket.IO logic ===
io.on("connection", (socket) => {
  console.log("🎮 Player connected:", socket.id);

  // Auto-match players
  if (waitingPlayer === null) {
    waitingPlayer = socket;
    socket.emit("status", "Waiting for an opponent...");
  } else {
    const player1 = waitingPlayer;
    const player2 = socket;
    const gameId = `${player1.id}-${player2.id}`;
    waitingPlayer = null;

    games[gameId] = {
      board: Array(9).fill(""),
      players: [player1, player2],
      turn: "X",
    };

    player1.emit("matchFound", { gameId, symbol: "X" });
    player2.emit("matchFound", { gameId, symbol: "O" });

    console.log(`✅ Match started: ${gameId}`);
  }

  // Handle player moves
  socket.on("playerMove", (data) => {
    const { gameId, index, symbol } = data;
    const game = games[gameId];
    if (!game) return;

    if (game.board[index] === "" && game.turn === symbol) {
      game.board[index] = symbol;
      game.turn = symbol === "X" ? "O" : "X";
      io.to(game.players[0].id).emit("updateBoard", {
        board: game.board,
        turn: game.turn,
      });
      io.to(game.players[1].id).emit("updateBoard", {
        board: game.board,
        turn: game.turn,
      });

      const winner = checkWinner(game.board);
      if (winner) {
        io.to(game.players[0].id).emit("gameOver", { winner });
        io.to(game.players[1].id).emit("gameOver", { winner });
        delete games[gameId];
      }
    }
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    console.log("❌ Player disconnected:", socket.id);
    if (waitingPlayer?.id === socket.id) waitingPlayer = null;

    for (const [gameId, game] of Object.entries(games)) {
      if (game.players.some((p) => p.id === socket.id)) {
        game.players.forEach((p) => {
          if (p.id !== socket.id) io.to(p.id).emit("opponentLeft");
        });
        delete games[gameId];
      }
    }
  });
});

// === Helper ===
function checkWinner(board) {
  const combos = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of combos) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return board[a];
  }
  return board.every((c) => c) ? "draw" : null;
}

server.listen(PORT, () =>
  console.log(`🚀 TicTac4 server running on port ${PORT}`)
);
