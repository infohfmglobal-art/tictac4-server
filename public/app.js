const SERVER_URL = "https://tictac4-server.onrender.com"; // Render backend
const socket = io(SERVER_URL, { transports: ["websocket"] });

const board = document.getElementById("board");
const status = document.getElementById("status");
const restartBtn = document.getElementById("restart");
const clickSound = document.getElementById("clickSound");
const winSound = document.getElementById("winSound");

let cells = [];
let currentPlayer = "X";
let gameOver = false;

// Build the board
for (let i = 0; i < 9; i++) {
  const cell = document.createElement("div");
  cell.classList.add("cell");
  cell.addEventListener("click", () => handleClick(i));
  board.appendChild(cell);
  cells.push(cell);
}

restartBtn.addEventListener("click", resetGame);

function handleClick(i) {
  if (gameOver || cells[i].textContent !== "") return;
  cells[i].textContent = currentPlayer;
  clickSound.play();

  if (checkWinner()) {
    status.textContent = `${currentPlayer} Wins!`;
    winSound.play();
    gameOver = true;
    setTimeout(resetGame, 2000);
    return;
  }

  if (cells.every(c => c.textContent !== "")) {
    status.textContent = "Draw!";
    setTimeout(resetGame, 2000);
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  status.textContent = `${currentPlayer}'s Turn`;
}

// Reset game
function resetGame() {
  cells.forEach(cell => cell.textContent = "");
  currentPlayer = "X";
  gameOver = false;
  status.textContent = "New Game!";
}

// Winner logic
function checkWinner() {
  const combos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  return combos.some(([a, b, c]) => {
    return (
      cells[a].textContent &&
      cells[a].textContent === cells[b].textContent &&
      cells[a].textContent === cells[c].textContent
    );
  });
}

// Multiplayer placeholder (to sync later)
socket.on("connect", () => {
  status.textContent = "Connected!";
});
