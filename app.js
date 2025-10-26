/* ========= TicTac4 – Auto-Match Client (Gold & Glass) =========
   - Auto matchmaking via Socket.IO
   - Sounds (click/win/draw) unlocked on first user gesture
   - Turn enforcement and clean status HUD
   - Works with your Render server (multiplayer.js / server.js)
=============================================================== */

(() => {
  // ---- Elements
  const statusEl = document.getElementById('status');
  const boardWrap = document.getElementById('boardWrap');
  const boardEl = document.getElementById('board');
  const youSymEl = document.getElementById('youSym');
  const turnPill = document.getElementById('turnPill');
  const mmPanel = document.getElementById('mmPanel');
  const wakeMsg = document.getElementById('wakeMsg');
  const nameInput = document.getElementById('nameInput');
  const serverInput = document.getElementById('serverInput');
  const btnOnline = document.getElementById('btnOnline');
  const btnCpu = document.getElementById('btnCpu');
  const btnReset = document.getElementById('btnReset');

  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlaySub = document.getElementById('overlaySub');
  const btnAgain = document.getElementById('btnAgain');
  const btnExit = document.getElementById('btnExit');

  // ---- State
  const state = {
    socket: null,
    connected: false,
    roomId: null,
    youIndex: 0, // 0 or 1
    yourSymbol: '?', // "X" or "O"
    turnIndex: 0,
    board: Array(9).fill(-1),
    online: false,
    cpu: false,
    audioReady: false,
  };

  // ---- Sounds (procedural)
  function unlockAudio() {
    if (state.audioReady) return;
    try {
      const ctx = new AudioContext();
      const s = ctx.createOscillator(); const g = ctx.createGain();
      s.connect(g); g.connect(ctx.destination);
      g.gain.value = 0; s.start(); s.stop(ctx.currentTime + 0.01);
      state.audioReady = true;
    } catch(e){ /* ignore */ }
  }
  function tone(freq=520, type='sine', dur=0.09, gain=0.18){
    if (!state.audioReady) return;
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    o.start();
    o.stop(ctx.currentTime + dur);
  }
  const clickSound = () => tone(520,'sine',0.08,0.16);
  const winSound   = () => tone(880,'square',0.28,0.22);
  const loseSound  = () => tone(300,'triangle',0.28,0.22);
  const drawSound  = () => tone(600,'sawtooth',0.22,0.18);

  // Unlock audio on first gesture
  ['click','touchstart','pointerdown'].forEach(ev =>
    document.addEventListener(ev, unlockAudio, { once:true, passive:true })
  );

  // ---- UI helpers
  function setStatus(text){ statusEl.textContent = text; }
  function setTurnPill(text){ turnPill.textContent = text; }

  function showOverlay(resultText, sub='') {
    overlayTitle.textContent = resultText;
    overlaySub.textContent = sub;
    overlay.classList.remove('hidden');
  }
  function hideOverlay(){ overlay.classList.add('hidden'); }

  function showBoard(){ boardWrap.classList.remove('hidden'); }
  function hideBoard(){ boardWrap.classList.add('hidden'); }
  function showMM(){ mmPanel.classList.remove('hidden'); }
  function hideMM(){ mmPanel.classList.add('hidden'); }
  function showWake(){ wakeMsg.classList.remove('hidden'); }
  function hideWake(){ wakeMsg.classList.add('hidden'); }

  // ---- Board UI
  boardEl.innerHTML = '';
  const cells = [];
  for (let i=0;i<9;i++){
    const c = document.createElement('div');
    c.className = 'cell';
    c.dataset.index = i;
    c.addEventListener('click', () => onCellClick(i));
    boardEl.appendChild(c);
    cells.push(c);
  }

  function renderBoard(){
    state.board.forEach((v,i)=>{
      const cell = cells[i];
      cell.textContent = v===-1 ? '' : (v===0?'X':'O');
      cell.classList.toggle('taken', v!==-1);
    });
  }
  function clearGlow(){ cells.forEach(c => c.classList.remove('glow')); }
  function glowLine(a,b,c){ [a,b,c].forEach(i => cells[i].classList.add('glow')); }

  function winLine(board, who){
    const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const line of L){
      if (line.every(i=>board[i]===who)) return line;
    }
    return null;
  }

  // ---- Online flow
  function connectAndQueue() {
    const url = (serverInput.value || '').trim() || window.location.origin;
    const name = (nameInput.value || 'Guest').trim().slice(0,18);

    try{
      state.socket = io(url, { transports:['websocket'], upgrade:false });
    } catch(e){
      setStatus('Socket failed to initialize'); return;
    }

    showWake();
    setStatus('Connecting…');

    state.socket.on('connect', () => {
      hideWake();
      state.connected = true;
      setStatus('Connected — joining queue…');
      // Optional hello payload
      state.socket.emit('hello', { name });
      // Join queue (stake 0, BO1 for quick test; server may override)
      state.socket.emit('joinQueue', { stake:0, bestOf:1, symbolPref:null });
    });

    // Match found
    state.socket.on('matchFound', (data) => {
      // Expect: { youIndex, youSymbol, opponent:{name,symbol}, bestOf, pot }
      state.online = true; state.cpu = false;
      state.youIndex = data.youIndex;
      state.yourSymbol = data.youSymbol;
      youSymEl.textContent = data.youSymbol;
      hideMM(); showBoard(); hideOverlay(); clearGlow();
      state.board = Array(9).fill(-1); renderBoard();
      setStatus(`Matched vs ${data.opponent?.name || 'Player'} — You are ${data.youSymbol}`);
    });

    // Round state snapshot
    state.socket.on('roundState', ({ board, turnIndex }) => {
      state.board = board.slice();
      state.turnIndex = turnIndex;
      renderBoard();
      setTurnPill(state.turnIndex===state.youIndex ? 'Your Turn' : "Opponent's Turn");
    });

    // Opponent or you moved (applied by server)
    state.socket.on('moveApplied', ({ index, symbolIndex }) => {
      state.board[index] = symbolIndex;
      renderBoard();
      clickSound();
    });

    // Server turn toggle
    state.socket.on('turn', ({ turnIndex }) => {
      state.turnIndex = turnIndex;
      setTurnPill(state.turnIndex===state.youIndex ? 'Your Turn' : "Opponent's Turn");
    });

    // Round over
    state.socket.on('roundOver', ({ winnerIndex }) => {
      const line = winLine(state.board, winnerIndex==='draw' ? -99 : winnerIndex);
      if (Array.isArray(line)) glowLine(...line);
      if (winnerIndex === 'draw') {
        drawSound();
        showOverlay('Draw', 'Good game!');
      } else if (winnerIndex === state.youIndex) {
        winSound();
        showOverlay('You Win', 'Nice!');
      } else {
        loseSound();
        showOverlay('You Lose', 'Try again!');
      }
    });

    // Whole match over (some servers use this)
    state.socket.on('matchOver', ({ winnerIndex, pot }) => {
      if (winnerIndex === 'draw') {
        drawSound(); showOverlay('Match Draw', `Pot ${pot ?? 0}`);
      } else if (winnerIndex === state.youIndex) {
        winSound(); showOverlay('Match Won', `+${pot ?? 0} coins`);
      } else {
        loseSound(); showOverlay('Match Lost', `Pot ${pot ?? 0}`);
      }
    });

    // Ultra-simple servers (fallback): just relay 'move'
    state.socket.on('move', ({ index, symbol }) => {
      state.board[index] = (symbol==='X'?0:1);
      renderBoard();
      clickSound();
      // Client-side turn flip as best-effort
      state.turnIndex = (state.turnIndex===0?1:0);
      setTurnPill(state.turnIndex===state.youIndex ? 'Your Turn' : "Opponent's Turn");
    });

    state.socket.on('disconnect', () => {
      state.connected = false;
      setStatus('Disconnected');
      showMM(); hideBoard();
    });

    state.socket.on('errorMsg', ({ message }) => {
      setStatus(`Error: ${message}`);
    });

    // Fail-safe join if connect is slow
    setTimeout(() => {
      if (state.connected) return;
      setStatus('Still connecting… (Render may be waking up)');
    }, 1200);
  }

  // ---- Local CPU (quick placeholder, so the button works)
  function startCPU(){
    state.online = false; state.cpu = true;
    hideMM(); showBoard(); hideOverlay();
    state.board = Array(9).fill(-1); renderBoard();
    state.yourSymbol = 'X'; state.youIndex = 0; state.turnIndex = 0;
    youSymEl.textContent = 'X';
    setStatus('Vs CPU (demo placeholder)');
    setTurnPill('Your Turn');
  }

  // ---- Input handling
  function onCellClick(i){
    // Block if not your turn or occupied
    if (state.board[i] !== -1) return;

    if (state.online){
      if (!state.socket) return;
      if (state.turnIndex !== state.youIndex) return;
      // Emit according to your server contract
      // Preferred:
      state.socket.emit('place', { index:i });
      // Fallback for simple servers:
      state.socket.emit('move', { index:i, symbol: state.youIndex===0?'X':'O' });
      clickSound();
    } else if (state.cpu){
      // Simple local place (no AI here to keep this file focused on online)
      state.board[i] = 0;
      renderBoard();
      clickSound();
    }
  }

  // ---- Reset / Again / Exit
  btnReset.addEventListener('click', () => {
    state.board = Array(9).fill(-1); renderBoard(); clearGlow();
    setTurnPill(state.turnIndex===state.youIndex ? 'Your Turn' : "Opponent's Turn");
  });
  btnAgain.addEventListener('click', () => {
    hideOverlay();
    // Ask server to start another round/match if supported; else re-queue
    if (state.online && state.socket){
      // If your server has "requeue" or "newMatch", emit it. Fallback:
      state.socket.emit('joinQueue', { stake:0, bestOf:1, symbolPref:null });
      setStatus('Re-queued…');
      showMM(); hideBoard();
    } else {
      startCPU();
    }
  });
  btnExit.addEventListener('click', () => {
    hideOverlay();
    showMM(); hideBoard();
    setStatus('Choose Online or CPU to start');
  });

  // ---- Buttons
  btnOnline.addEventListener('click', () => {
    showWake();
    connectAndQueue();
  });
  btnCpu.addEventListener('click', startCPU);

  // ---- Default server input
  serverInput.value = window.location.origin.includes('http')
    ? window.location.origin
    : 'https://tictac4-server.onrender.com';

  // Initial status
  setStatus('Choose Online to auto-match, or CPU for local demo');
})();
