import { MultiplayerManager } from "./multiplayer.js";

// Simple online status label (auto-injected if not present)
let onlineStatusEl = document.getElementById("onlineStatus");
if (!onlineStatusEl) {
  onlineStatusEl = document.createElement("div");
  onlineStatusEl.id = "onlineStatus";
  onlineStatusEl.style.cssText = `
    position: fixed; left: 16px; top: 16px; 
    padding: 8px 12px; border-radius: 10px;
    background: rgba(0,0,0,0.35); color: #ffd85a; 
    font-weight: 600; font-family: system-ui, sans-serif; z-index: 9998;
  `;
  onlineStatusEl.textContent = "Offline (CPU)";
  document.body.appendChild(onlineStatusEl);
}

// Optional debug logger used below
function logOnlineOutcome(roomId, result, winner) {
  const timestamp = new Date().toISOString();
  console.log(`🌍 [TicTac4 Online]: Room ${roomId} | Result: ${result} | Winner: ${winner || "Draw"} | Time: ${timestamp}`);
}
const SERVER_URL = "https://tictac4-server.onrender.com";
