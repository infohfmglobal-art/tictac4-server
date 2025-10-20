import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ✅ Serve static files like privacy.html
app.use(express.static(__dirname));

// ✅ Health check route
app.get("/", (req, res) => {
  res.send("TicTac4 Server is running ✅");
});

// ✅ Matchmaking + multiplayer logic
let waitingPlayer = null;

io.on("connection", (socket) => {
  console.log("🟢 New player connected:", socket.id);

  socket.on("joinQueue", (name) => {
    console.log(`🎮 Player ${name} joined queue`);
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      const room = `room-${waitingPlayer.id}-${socket.id}`;
      socket.join(room);
      waitingPlayer.join(room);

      const playerX = Math.random() > 0.5 ? socket : waitingPlayer;
      const playerO = playerX === socket ? waitingPlayer : socket;

      playerX.emit("matchFound", { room, symbol: "X", opponent: "Player O" });
      playerO.emit("matchFound", { room, symbol: "O", opponent: "Player X" });
      waitingPlayer = null;
    } else {
      waitingPlayer = socket;
      socket.emit("queued", "Waiting for opponent...");
    }
  });

  socket.on("move", (data) => {
    io.to(data.room).emit("opponentMove", data);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Player disconnected:", socket.id);
    if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;
  });
});

// ✅ Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 TicTac4 Server running on port ${PORT}`);
});
