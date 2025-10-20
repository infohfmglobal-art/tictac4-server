import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve privacy.html and other static files
app.use(express.static(__dirname));


const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// tiny health route
app.get("/", (_, res) => res.send("TicTac4 server is running."));
app.get("/health", (_, res) => res.json({ ok: true }));

// simple room state
const rooms = new Map();

io.on("connection", (socket) => {
  socket.on("hello", ({ name }) => {
    socket.data.name = name || "Guest";
    socket.emit("profile", { id: socket.id, name: socket.data.name });
  });

  socket.on("joinQueue", ({ stake=0, bestOf=3, symbolPref="" }) => {
    const waiting = [...rooms.values()].find(r => !r.full && r.stake===stake && r.bestOf===bestOf);
    if (waiting) {
      const youIdx = 1;
      const youSym = symbolPref || (waiting.players[0].symbol === "X" ? "O" : "X");
      const opp = waiting.players[0];
      waiting.players.push({ id: socket.id, name: socket.data.name, symbol: youSym });
      waiting.full = true;

      // notify both
      io.to(opp.id).emit("matchFound", {
        opponent: { name: socket.data.name, symbol: youSym },
        youIndex: 0, youSymbol: opp.symbol, bestOf, pot: stake*2
      });
      io.to(socket.id).emit("matchFound", {
        opponent: { name: opp.name, symbol: opp.symbol },
        youIndex: youIdx, youSymbol: youSym, bestOf, pot: stake*2
      });

      startRound(waiting);
    } else {
      const sym = symbolPref || (Math.random() < 0.5 ? "X" : "O");
      rooms.set(socket.id, {
        id: socket.id, stake, bestOf,
        full: false,
        board: Array(9).fill(-1),
        turn: 0,
        wins: [0,0],
        players: [{ id: socket.id, name: socket.data.name, symbol: sym }]
      });
      socket.emit("queued", { stake, bestOf, position: 1 });
    }
  });

  socket.on("place", ({ index }) => {
    const room = findRoom(socket.id);
    if (!room || !room.full) return;
    if (room.board[index] !== -1) return;
    const turnPlayer = room.players[room.turn];
    if (turnPlayer.id !== socket.id) return;

    room.board[index] = room.turn;
    room.players.forEach(p => io.to(p.id).emit("moveApplied", { index, symbolIndex: room.turn }));

    if (check(room.board, room.turn)) {
      room.wins[room.turn]++;
      const need = Math.floor(room.bestOf/2)+1;
      room.players.forEach(p => io.to(p.id).emit("roundOver", {
        roundNumber: room.wins[0]+room.wins[1], winnerIndex: room.turn, wins: room.wins, need
      }));
      if (room.wins[room.turn] >= need) {
        room.players.forEach(p => io.to(p.id).emit("matchOver", {
          winnerIndex: room.turn, pot: room.stake*2
        }));
        rooms.delete(room.id);
      } else {
        startRound(room);
      }
    } else if (!room.board.includes(-1)) {
      const need = Math.floor(room.bestOf/2)+1;
      room.players.forEach(p => io.to(p.id).emit("roundOver", {
        roundNumber: room.wins[0]+room.wins[1], winnerIndex: "draw", wins: room.wins, need
      }));
      startRound(room);
    } else {
      room.turn = room.turn ? 0 : 1;
      room.players.forEach(p => io.to(p.id).emit("turn", { turnIndex: room.turn }));
    }
  });

  socket.on("disconnect", () => {
    const room = findRoom(socket.id);
    if (room) {
      room.players.forEach(p => io.to(p.id).emit("errorMsg", { message: "Opponent disconnected." }));
      rooms.delete(room.id);
    }
  });
});

function startRound(room){
  room.board = Array(9).fill(-1);
  room.turn = Math.floor(Math.random()*2);
  room.players.forEach(p => io.to(p.id).emit("roundState", {
    roundNumber: room.wins[0]+room.wins[1]+1,
    board: room.board,
    turnIndex: room.turn
  }));
}
function check(b, s){
  const L=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return L.some(a => a.every(i => b[i]===s));
}
function findRoom(id){
  for (const r of rooms.values()) if (r.players.some(p=>p.id===id)) return r;
  return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ TicTac4 Server on :${PORT}`));
