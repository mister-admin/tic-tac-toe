/* Main logic:
   - restores original game logic (minimax)
   - loads i18n from lang/*.json
   - autosets theme & language (with localStorage override)
   - UI: bottom nav, slide panels, settings apply
   - accessible keyboard controls, focus, and animations
*/

/* ---- DOM refs ---- */
const cells = Array.from(document.querySelectorAll('.cell'));
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const undoBtn = document.getElementById('undoBtn');

const navGame = document.getElementById('nav-game');
const navSettings = document.getElementById('nav-settings');
const navInfo = document.getElementById('nav-info');

const panelSettings = document.getElementById('panel-settings');
const panelInfo = document.getElementById('panel-info');

const applySettingsBtn = document.getElementById('applySettings');
const closeSettingsBtn = document.getElementById('closeSettings');
const closeInfoBtn = document.getElementById('closeInfo');

const appVersionEl = document.getElementById('appVersion');
if (typeof APP_VERSION !== 'undefined') appVersionEl.textContent = APP_VERSION;

/* ---- State ---- */
let board = Array(9).fill('');
let currentPlayer = 'X';
let gameActive = true;
let aiMode = true;
let playerRole = 'X';
let computerRole = 'O';
let movesHistory = []; // for undo (basic)
const winningConditions = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

/* ---- i18n ---- */
let translations = {};
let currentLang = localStorage.getItem('ttt_lang') || detectBrowserLang();
async function loadTranslations(lang='ru') {
  try {
    const res = await fetch(`lang/${lang}.json`);
    if (!res.ok) throw new Error('fetch failed');
    translations = await res.json();
  } catch (err) {
    // fallback embedded minimal texts
    translations = (lang === 'en') ? {
      "gameTitle":"Tic-Tac-Toe","play":"Play","settings":"Settings","info":"Info","restart":"Restart",
      "mode":"Mode","modeAI":"Vs AI","modeTwoPlayers":"Two players","role":"Role","themeLabel":"Theme",
      "themeClassic":"Light","themeDark":"Dark","language":"Language","firstMove":"First move",
      "startPlayer":"Player","startComputer":"Computer","apply":"Apply","close":"Close",
      "version":"Version","ready":"Ready — {p} to move","xWins":"X wins!","oWins":"O wins!","draw":"Draw!"
    } : {
      "gameTitle":"Крестики-нолики","play":"Игра","settings":"Настройки","info":"Инфо","restart":"Начать заново",
      "mode":"Режим","modeAI":"Против ИИ","modeTwoPlayers":"Два игрока","role":"Роль","themeLabel":"Тема",
      "themeClassic":"Светлая","themeDark":"Тёмная","language":"Язык","firstMove":"Первый ход",
      "startPlayer":"Игрок","startComputer":"Компьютер","apply":"Применить","close":"Закрыть",
      "version":"Версия","ready":"Готово — ходит {p}","xWins":"Победил X!","oWins":"Победил O!","draw":"Ничья!"
    };
  }
  applyTranslations();
}

function applyTranslations(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if (key && translations[key]) el.textContent = translations[key];
  });
  // status line
  setStatusTemplate();
  // version
  if (APP_VERSION) document.querySelectorAll('[data-i18n="version"]').forEach(()=>{}); // handled separately
}

function detectBrowserLang(){
  const nav = navigator.language || navigator.userLanguage || 'ru';
  return nav.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

/* ---- Theme auto-detection & persistence ---- */
const savedTheme = localStorage.getItem('ttt_theme');
if (savedTheme) applyTheme(savedTheme);
else {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

function applyTheme(name){
  if (name === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  localStorage.setItem('ttt_theme', name);
}

/* ---- UI helpers ---- */
function setStatusTemplate(msg){
  if (msg) { statusEl.textContent = msg; return; }
  const tpl = translations['ready'] || 'Ready — {p}';
  statusEl.textContent = tpl.replace('{p}', currentPlayer);
}

/* ---- GAME logic (restored & improved) ---- */
function renderBoard(){
  board.forEach((val, idx)=>{
    const el = cells[idx];
    el.textContent = val || '';
    el.classList.toggle('x', val === 'X');
    el.classList.toggle('o', val === 'O');
    el.classList.remove('win');
    el.removeAttribute('aria-disabled');
  });
}

function handleCellClick(e){
  if (!gameActive) return;
  const idx = Number(e.currentTarget.dataset.index);
  if (board[idx] !== '') return;
  // register move
  movesHistory.push(board.slice());
  board[idx] = currentPlayer;
  renderBoard();
  playMoveEffect(idx);
  checkAfterMove();
}

function playMoveEffect(idx){
  const el = cells[idx];
  el.animate([{ transform:'scale(.9)'},{ transform:'scale(1)' }], { duration:180, easing:'ease-out' });
}

/* After move */
function checkAfterMove(){
  const winner = checkWinner();
  if (winner) {
    announce(winner === 'X' ? translations.xWins || 'X wins!' : translations.oWins || 'O wins!');
    highlightWinner(winner);
    gameActive = false;
    return;
  }
  if (!board.includes('')) {
    announce(translations.draw || 'Draw!');
    gameActive = false;
    return;
  }
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  setStatusTemplate();
  if (aiMode && gameActive && currentPlayer === computerRole) {
    lockBoard();
    setTimeout(aiMove, 260);
  }
}

function announce(msg){
  setStatusTemplate(msg);
}

function highlightWinner(winner) {
  winningConditions.forEach(cond => {
    if (cond.every(i => board[i] === winner)) {
      cond.forEach(i => cells[i].classList.add('win'));
    }
  });
}

/* AI (minimax) */
function aiMove(){
  let bestScore = -Infinity;
  let move = undefined;
  for (let i=0;i<9;i++){
    if (board[i] === '') {
      board[i] = computerRole;
      const score = minimax(board, 0, false);
      board[i] = '';
      if (score > bestScore) { bestScore = score; move = i; }
    }
  }
  if (move !== undefined) {
    movesHistory.push(board.slice());
    board[move] = computerRole;
    renderBoard();
    playMoveEffect(move);
    checkAfterMove();
  }
  unlockBoard();
}

function minimax(newBoard, depth, isMaximizing){
  if (checkWin(newBoard, computerRole)) return 10 - depth;
  if (checkWin(newBoard, playerRole)) return depth - 10;
  if (!newBoard.includes('')) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i=0;i<newBoard.length;i++){
      if (newBoard[i] === '') {
        newBoard[i] = computerRole;
        best = Math.max(best, minimax(newBoard, depth+1, false));
        newBoard[i] = '';
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i=0;i<newBoard.length;i++){
      if (newBoard[i] === '') {
        newBoard[i] = playerRole;
        best = Math.min(best, minimax(newBoard, depth+1, true));
        newBoard[i] = '';
      }
    }
    return best;
  }
}

function checkWin(b, p){
  return winningConditions.some(cond => cond.every(i => b[i] === p));
}

function checkWinner(){
  for (let cond of winningConditions) {
    const [a,b,c] = cond;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

/* Lock/unlock board (UI) */
function lockBoard(){
  cells.forEach(c => c.setAttribute('aria-disabled', 'true'));
}
function unlockBoard(){
  cells.forEach(c => c.removeAttribute('aria-disabled'));
}

/* Reset & undo */
function resetGame(){
  board = Array(9).fill('');
  movesHistory = [];
  gameActive = true;
  // read settings current picks to set player/computer roles & aiMode
  readSettingsToState();
  // determine who starts
  if (aiMode) {
    const start = document.querySelector('input[name="startOrder"]:checked')?.value || 'player';
    currentPlayer = (start === 'player') ? playerRole : computerRole;
  } else {
    currentPlayer = playerRole;
  }
  renderBoard();
  setStatusTemplate();
  if (aiMode && currentPlayer === computerRole) {
    lockBoard();
    setTimeout(aiMove, 260);
  } else unlockBoard();
}

function undoMove(){
  if (!movesHistory.length) return;
  board = movesHistory.pop();
  gameActive = true;
  renderBoard();
  setStatusTemplate();
}

/* ---- Settings wiring ---- */
function readSettingsToState(){
  aiMode = document.querySelector('input[name="mode"]:checked')?.value === 'ai';
  playerRole = document.querySelector('input[name="player"]:checked')?.value || 'X';
  computerRole = playerRole === 'X' ? 'O' : 'X';
}

/* Apply settings button handler */
applySettingsBtn?.addEventListener('click', ()=>{
  // lang
  const selLang = document.querySelector('input[name="lang"]:checked')?.value;
  if (selLang) {
    currentLang = selLang;
    localStorage.setItem('ttt_lang', selLang);
    loadTranslations(currentLang);
  }
  // theme
  const selTheme = document.querySelector('input[name="theme"]:checked')?.value || 'light';
  applyTheme(selTheme);
  // Apply other settings
  readSettingsToState();
  resetGame();
  closePanel(panelSettings);
});

/* panel open/close */
function openPanel(panel){
  panel.setAttribute('aria-hidden', 'false');
}
function closePanel(panel){
  panel.setAttribute('aria-hidden', 'true');
}

/* Bottom nav logic */
function clearNavActive(){
  [navGame, navSettings, navInfo].forEach(b=> {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
}
navGame?.addEventListener('click', ()=>{
  clearNavActive();
  navGame.classList.add('active'); navGame.setAttribute('aria-pressed','true');
  closePanel(panelSettings); closePanel(panelInfo);
});
navSettings?.addEventListener('click', ()=>{
  clearNavActive();
  navSettings.classList.add('active'); navSettings.setAttribute('aria-pressed','true');
  openPanel(panelSettings); closePanel(panelInfo);
});
navInfo?.addEventListener('click', ()=>{
  clearNavActive();
  navInfo.classList.add('active'); navInfo.setAttribute('aria-pressed','true');
  openPanel(panelInfo); closePanel(panelSettings);
});
closeSettingsBtn?.addEventListener('click', ()=>{ closePanel(panelSettings); clearNavActive(); navGame.classList.add('active'); navGame.setAttribute('aria-pressed','true'); });
closeInfoBtn?.addEventListener('click', ()=>{ closePanel(panelInfo); clearNavActive(); navGame.classList.add('active'); navGame.setAttribute('aria-pressed','true'); });

/* keyboard support for cells */
cells.forEach(c=>{
  c.addEventListener('click', handleCellClick);
  c.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); handleCellClick({ currentTarget: c });
    }
  });
});

/* reset & undo handlers */
resetBtn.addEventListener('click', resetGame);
undoBtn.addEventListener('click', undoMove);

/* initial boot */
(async function init(){
  // load translations
  await loadTranslations(currentLang);
  // set language radios UI
  const langRadio = document.querySelector(`input[name="lang"][value="${currentLang}"]`);
  if (langRadio) langRadio.checked = true;

  // pull saved theme into inputs
  const curTheme = localStorage.getItem('ttt_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const themeRadio = document.querySelector(`input[name="theme"][value="${curTheme}"]`);
  if (themeRadio) themeRadio.checked = true;

  // show/hide firstMove depending on aiMode radio initial
  const mode = document.querySelector('input[name="mode"]:checked')?.value || 'ai';
  document.getElementById('firstMoveRow').style.display = (mode === 'ai') ? 'block' : 'none';
  // attach change listeners to mode radio to show/hide
  document.querySelectorAll('input[name="mode"]').forEach(r=>{
    r.addEventListener('change', (e)=> {
      const val = e.target.value;
      document.getElementById('firstMoveRow').style.display = (val === 'ai') ? 'block' : 'none';
    });
  });

  // set language of title
  document.getElementById('appTitle').textContent = translations.gameTitle || document.getElementById('appTitle').textContent;

  // initial settings read
  readSettingsToState();

  // if there is saved language in storage, ensure radio selected
  const storedLang = localStorage.getItem('ttt_lang');
  if (storedLang) {
    const r = document.querySelector(`input[name="lang"][value="${storedLang}"]`);
    if (r) r.checked = true;
  }

  // set nav initial active
  clearNavActive();
  navGame?.classList.add('active'); navGame?.setAttribute('aria-pressed','true');

  // initial reset
  resetGame();
})();
