// server.js — TicTac4 Multiplayer Backend (Render Ready)
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 10000;

// --- Health Route ---
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/", (req, res) => {
  res.send("TicTac4 server is running ✅");
});

// --- Matchmaking & Game Logic ---
let waitingPlayer = null;
const activeRooms = new Map();

io.on("connection", (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);

  socket.on("joinMatch", ({ preferredSymbol }) => {
    console.log(`🎮 Player ${socket.id} wants to play as ${preferredSymbol}`);

    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      // Pair players
      const roomId = `room_${Date.now()}`;
      const p1 = waitingPlayer;
      const p2 = socket;

      // Randomize symbols if both prefer same
      const symbols = assignSymbols(preferredSymbol);

      p1.join(roomId);
      p2.join(roomId);

      activeRooms.set(roomId, {
        board: Array(9).fill(null),
        players: [p1.id, p2.id],
        symbols,
        turn: symbols.first.id
      });

      p1.emit("roomAssigned", { roomId, symbol: symbols.first.symbol });
      p2.emit("roomAssigned", { roomId, symbol: symbols.second.symbol });

      console.log(`🆚 Room ${roomId} created: ${p1.id} vs ${p2.id}`);

      waitingPlayer = null;
    } else {
      // Wait for opponent
      waitingPlayer = socket;
      console.log(`⏳ Waiting player: ${socket.id}`);
    }
  });

  socket.on("makeMove", ({ index, roomId }) => {
    const room = activeRooms.get(roomId);
    if (!room || room.board[index]) return;

    const currentPlayerId = socket.id;
    const playerSymbol =
      currentPlayerId === room.players[0]
        ? room.symbols.first.symbol
        : room.symbols.second.symbol;

    room.board[index] = playerSymbol;
    room.turn =
      currentPlayerId === room.players[0]
        ? room.players[1]
        : room.players[0];

    io.to(roomId).emit("moveMade", { index, symbol: playerSymbol });

    const result = checkWinner(room.board);
    if (result) {
      io.to(roomId).emit("gameOver", { winner: result });
      console.log(`🏁 Room ${roomId} - Winner: ${result}`);
      activeRooms.delete(roomId);
    } else if (!room.board.includes(null)) {
      io.to(roomId).emit("gameOver", { winner: "draw" });
      console.log(`🤝 Room ${roomId} - Draw`);
      activeRooms.delete(roomId);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Player disconnected: ${socket.id}`);
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
  });
});

// --- Helper Functions ---
function assignSymbols(preferredSymbol) {
  if (preferredSymbol === "O") {
    return {
      first: { id: waitingPlayer.id, symbol: "X" },
      second: { id: null, symbol: "O" }
    };
  }
  return {
    first: { id: waitingPlayer.id, symbol: "X" },
    second: { id: null, symbol: "O" }
  };
}

function checkWinner(board) {
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];
  for (let line of wins) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

server.listen(PORT, () => {
  console.log(`✅ TicTac4 Server on :${PORT}`);
});
