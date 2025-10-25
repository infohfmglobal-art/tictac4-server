// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Multiplayer socket logic
io.on("connection", (socket) => {
  console.log("A player connected:", socket.id);

  socket.on("move", (data) => {
    console.log("Move received:", data);
    socket.broadcast.emit("move", data); // send to all other players
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`TicTac4 Server running on port ${PORT}`);
});
