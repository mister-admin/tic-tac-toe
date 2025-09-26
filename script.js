// main logic with i18n and UI improvements
// config.js must be loaded before this and provide APP_VERSION

// DOM refs
const cells = Array.from(document.querySelectorAll('.cell'));
const resetButton = document.getElementById('reset');
const modeRadios = document.querySelectorAll('input[name="mode"]');
const playerRadios = document.querySelectorAll('input[name="player"]');
const themeRadios = document.querySelectorAll('input[name="theme"]');
const langRadios = document.querySelectorAll('input[name="lang"]');
const startOrderGroupEl = document.getElementById('startOrderGroup');
const statusText = document.getElementById('statusText');
const appVersionEl = document.getElementById('appVersion');
const appTitleEl = document.getElementById('appTitle');
const gameTitleStatus = document.getElementById('gameTitleStatus');

// App state
let board = Array(9).fill('');
let currentPlayer = 'X';
let gameActive = true;
let aiMode = true;
let playerRole = 'X';
let computerRole = 'O';
const winningConditions = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

// i18n
const i18n = {
  ru: {
    gameTitle: "Крестики-нолики",
    restart: "Начать заново",
    modeAI: "Против ИИ",
    modeTwoPlayers: "Два игрока",
    role: "Роль",
    themeLabel: "Тема",
    themeClassic: "Светлая",
    themeDark: "Тёмная",
    language: "Язык",
    settings: "Настройки",
    firstMove: "Первый ход",
    startPlayer: "Игрок",
    startComputer: "Компьютер",
    ready: "Готово — ходит {p}",
    xWins: "Победил X!",
    oWins: "Победил O!",
    draw: "Ничья!",
    version: APP_VERSION || 'v1.0.0'
  },
  en: {
    gameTitle: "Tic-Tac-Toe",
    restart: "Restart",
    modeAI: "VS AI",
    modeTwoPlayers: "Two players",
    role: "Role",
    themeLabel: "Theme",
    themeClassic: "Light",
    themeDark: "Dark",
    language: "Language",
    settings: "Settings",
    firstMove: "First move",
    startPlayer: "Player",
    startComputer: "Computer",
    ready: "Ready — {p} to move",
    xWins: "X wins!",
    oWins: "O wins!",
    draw: "Draw!",
    version: APP_VERSION || 'v1.0.0'
  }
};
let currentLang = localStorage.getItem('language') || 'ru';

// --- UTIL: translate all data-i18n elements ---
function applyTranslations(lang){
  const dict = i18n[lang] || i18n.ru;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    // allow template replacement for status
    let text = dict[key] !== undefined ? dict[key] : el.textContent;
    el.textContent = text;
  });

  // Replace placeholders where needed
  updateStatusText();
  // update title elements
  appTitleEl.textContent = dict.gameTitle;
  gameTitleStatus.textContent = dict.gameTitle;
  // version
  appVersionEl.textContent = dict.version;
  localStorage.setItem('language', lang);
}

// helper to set status line
function updateStatusText(){
  const dict = i18n[currentLang];
  const tpl = dict.ready || 'Ready — {p}';
  statusText.textContent = tpl.replace('{p}', currentPlayer);
}

// Lock/unlock UI (cells)
function lockGameField(){ cells.forEach(c => c.setAttribute('disabled','true')); }
function unlockGameField(){ cells.forEach(c => c.removeAttribute('disabled')); }

// update board visually
function renderBoard(){
  board.forEach((val, idx) => {
    cells[idx].textContent = val;
    cells[idx].classList.toggle('win-cell', false);
  });
}

// click handler
function handleCellClick(e){
  if (!gameActive) return;
  const idx = Number(e.target.dataset.index);
  if (board[idx]) return;
  makeMove(idx, currentPlayer);
  postMove();
}

// perform move
function makeMove(idx, player){
  board[idx] = player;
  renderBoard();
  // simple pop animation
  cells[idx].animate([{transform:'scale(.9)'},{transform:'scale(1)'}], {duration:180, easing:'ease-out'});
}

// after move checks, swap or check win
function postMove(){
  const winner = checkWinner();
  if (winner) {
    announce(winner === 'X' ? i18n[currentLang].xWins : i18n[currentLang].oWins);
    highlightWinningCombo(winner);
    gameActive = false;
    return;
  }
  if (!board.includes('')) {
    announce(i18n[currentLang].draw);
    gameActive = false;
    return;
  }
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateStatusText();

  if (aiMode && currentPlayer === computerRole && gameActive){
    lockGameField();
    setTimeout(aiMove, 320);
  }
}

function announce(text){
  statusText.textContent = text;
  // also briefly show in title
  gameTitleStatus.textContent = text;
}

// reset
function resetGame(){
  board = Array(9).fill('');
  currentPlayer = playerRole;
  gameActive = true;
  renderBoard();
  if (aiMode && currentPlayer === computerRole){
    lockGameField();
    setTimeout(aiMove, 300);
  } else {
    unlockGameField();
  }
  applyTranslations(currentLang);
}

// AI (simple minimax like before)
function aiMove(){
  // simpler: first try win/block, else center, corners, sides
  // quick but effective heuristic minimax: reuse minimax from previous code
  let bestScore = -Infinity, move;
  for (let i = 0; i < board.length; i++){
    if (board[i] === ''){
      board[i] = computerRole;
      const score = minimax(board.slice(), 0, false);
      board[i] = '';
      if (score > bestScore){ bestScore = score; move = i; }
    }
  }
  if (move !== undefined){
    makeMove(move, computerRole);
    postMove();
  }
  if (gameActive) unlockGameField();
}

// minimax implementation
function minimax(b, depth, isMaximizing){
  if (checkWin(b, computerRole)) return 10 - depth;
  if (checkWin(b, playerRole)) return depth - 10;
  if (!b.includes('')) return 0;
  if (isMaximizing){
    let best = -Infinity;
    for (let i=0;i<b.length;i++){
      if (b[i]===''){
        b[i]=computerRole;
        best = Math.max(best, minimax(b, depth+1, false));
        b[i]='';
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i=0;i<b.length;i++){
      if (b[i]===''){
        b[i]=playerRole;
        best = Math.min(best, minimax(b, depth+1, true));
        b[i]='';
      }
    }
    return best;
  }
}

function checkWin(boardArr, player){
  return winningConditions.some(cond => cond.every(i => boardArr[i] === player));
}
function checkWinner(){
  for (let cond of winningConditions){
    const [a,b,c] = cond;
    if (board[a] && board[a] === board[b] && board[a] === board[c]){
      return board[a];
    }
  }
  return null;
}
function highlightWinningCombo(winner){
  winningConditions.forEach(cond => {
    if (cond.every(i => board[i] === winner)){
      cond.forEach(i => cells[i].classList.add('win-cell'));
    }
  });
}

// Language / theme / mode event wiring
langRadios.forEach(radio => radio.addEventListener('change', () => {
  currentLang = document.querySelector('input[name="lang"]:checked').value;
  applyTranslations(currentLang);
}));

themeRadios.forEach(radio => radio.addEventListener('change', () => {
  const sel = document.querySelector('input[name="theme"]:checked').value;
  if (sel === 'dark') document.body.classList.add('dark-theme');
  else document.body.classList.remove('dark-theme');
  localStorage.setItem('theme', sel);
}));

modeRadios.forEach(radio => radio.addEventListener('change', () => {
  aiMode = document.querySelector('input[name="mode"]:checked').value === 'ai';
  // show/hide first-move controls
  startOrderGroupEl.style.display = aiMode ? 'block' : 'none';
  resetGame();
}));

playerRadios.forEach(radio => radio.addEventListener('change', () => {
  playerRole = document.querySelector('input[name="player"]:checked').value;
  computerRole = playerRole === 'X' ? 'O' : 'X';
  resetGame();
}));

document.querySelectorAll('input[name="startOrder"]').forEach(r => r.addEventListener('change', () => {
  const start = document.querySelector('input[name="startOrder"]:checked').value;
  currentPlayer = start === 'player' ? playerRole : computerRole;
  resetGame();
}));

// cell clicks
cells.forEach(c => c.addEventListener('click', handleCellClick));
cells.forEach(c => c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handleCellClick(e); }));

resetButton.addEventListener('click', resetGame);

// init
document.addEventListener('DOMContentLoaded', () => {
  // restore lang & theme
  currentLang = localStorage.getItem('language') || currentLang;
  const savedTheme = localStorage.getItem('theme') || 'classic';
  if (savedTheme === 'dark') document.body.classList.add('dark-theme');

  // apply version from config
  if (typeof APP_VERSION !== 'undefined'){
    i18n.ru.version = APP_VERSION;
    i18n.en.version = APP_VERSION;
  }

  // initial UI visibility for start order
  aiMode = document.querySelector('input[name="mode"]:checked').value === 'ai';
  startOrderGroupEl.style.display = aiMode ? 'block' : 'none';

  // player/computer roles
  playerRole = document.querySelector('input[name="player"]:checked').value;
  computerRole = playerRole === 'X' ? 'O' : 'X';

  applyTranslations(currentLang);
  resetGame();
});
