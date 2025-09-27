/* Main script
   - modular language loading via lang/manifest.json or directory listing fallback
   - dynamic segmented buttons (no radios) — immediate apply
   - theme auto-detection + animated transition
   - panels toggling + close on outside/Esc/repeat click
   - sound manager (expects sounds/ folder)
   - restored game logic (minimax) and robust UI
*/

const APP_VERSION = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'v1.0.0';

// DOM refs
const cells = Array.from(document.querySelectorAll('.cell'));
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const undoBtn = document.getElementById('undoBtn');

const navGame = document.getElementById('nav-game');
const navSettings = document.getElementById('nav-settings');
const navInfo = document.getElementById('nav-info');

const panelSettings = document.getElementById('panel-settings');
const panelInfo = document.getElementById('panel-info');

const closeSettingsBtn = document.getElementById('closeSettings');
const closeInfoBtn = document.getElementById('closeInfo');

const languagesContainer = document.getElementById('languagesContainer');
const firstMoveRow = document.getElementById('firstMoveRow');

const appTitle = document.getElementById('appTitle');
const subtitle = document.getElementById('subtitle');
const appVersionEl = document.getElementById('appVersion') || document.getElementById('appVersion');
if (appVersionEl) appVersionEl.textContent = APP_VERSION;
const repoLink = document.getElementById('repoLink');

// State
let board = Array(9).fill('');
let currentPlayer = 'X';
let gameActive = true;
let aiMode = true;
let playerRole = 'X';
let computerRole = 'O';
let movesHistory = [];
const winningConditions = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

// i18n
let translations = {};
let availableLangs = []; // array of {code, file}
let currentLang = localStorage.getItem('ttt_lang') || detectBrowserLang();

// Sound manager (restore sounds folder)
class SoundManager {
  constructor() {
    this.sounds = {
      move: new Audio('sounds/beep-07.wav'),
      win: new Audio('sounds/success-01.wav'),
      draw: new Audio('sounds/fail-01.wav')
    };
  }
  play(name) {
    const s = this.sounds[name];
    if (!s) return;
    s.currentTime = 0;
    s.play().catch(()=>{}); // ignore autoplay errors
  }
}
const soundManager = new SoundManager();

// Helpers
function detectBrowserLang(){
  const nav = navigator.language || navigator.userLanguage || 'en';
  return nav.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

function setStatusTemplate(msg){
  if (msg) { statusEl.textContent = msg; return; }
  const tpl = translations['ready'] || 'Ready — {p}';
  statusEl.textContent = tpl.replace('{p}', currentPlayer);
  if (subtitle) subtitle.textContent = statusEl.textContent;
}

function announce(msg){
  setStatusTemplate(msg);
}

// Language loading: try manifest → try directory listing → fallback
async function loadLangList(){
  // 1) manifest.json
  try {
    const res = await fetch('lang/manifest.json', {cache: "no-store"});
    if (res.ok) {
      const manifest = await res.json();
      availableLangs = manifest.map(f => ({ code: (f.split('.')[0]||f), file: f }));
      return;
    }
  } catch(e){ /* continue */ }

  // 2) try to fetch directory listing (works if server exposes it)
  try {
    const res = await fetch('lang/', {cache: "no-store"});
    if (res.ok) {
      const text = await res.text();
      // try to find .json files in returned HTML
      const matches = Array.from(text.matchAll(/["'>]([a-z0-9_-]+\.json)["'<]/ig)).map(m=>m[1]);
      const unique = [...new Set(matches)];
      if (unique.length) {
        availableLangs = unique.map(f => ({ code: f.split('.')[0], file: f }));
        return;
      }
    }
  } catch(e){ /* continue */ }

  // 3) fallback
  availableLangs = [{code:'ru', file:'ru.json'}, {code:'en', file:'en.json'}];
}

// populate language buttons dynamically
function renderLanguageButtons(){
  languagesContainer.innerHTML = '';
  availableLangs.forEach(lang => {
    const btn = document.createElement('button');
    btn.className = 'seg-btn';
    btn.type = 'button';
    btn.dataset.value = lang.code;
    btn.setAttribute('aria-pressed', lang.code === currentLang ? 'true' : 'false');
    btn.textContent = lang.code;
    btn.addEventListener('click', () => {
      // activate visually
      languagesContainer.querySelectorAll('.seg-btn').forEach(s => s.setAttribute('aria-pressed','false'));
      btn.setAttribute('aria-pressed','true');
      // load translations immediately
      loadTranslations(lang.code, lang.file);
    });
    languagesContainer.appendChild(btn);
  });
}

// load translations for a code
async function loadTranslations(code, fileName){
  try {
    const file = fileName || `${code}.json`;
    const res = await fetch(`lang/${file}`, {cache:'no-store'});
    if (!res.ok) throw new Error('no file');
    translations = await res.json();
  } catch (err) {
    // fallback minimal
    translations = code === 'en' ? { gameTitle:'Tic-Tac-Toe', restart:'Restart', ready:'Ready — {p}', xWins:'X wins!', oWins:'O wins!', draw:'Draw!', settings:'Settings', info:'Info', play:'Play', repo:'GitHub / source', version:'Version', createdByLabel:'Created by', themeClassic:'Light', themeDark:'Dark', modeAI:'Vs AI', modeTwoPlayers:'Two players', startPlayer:'Player', startComputer:'Computer' } : { gameTitle:'Крестики-нолики', restart:'Начать заново', ready:'Готово — ходит {p}', xWins:'Победил X!', oWins:'Победил O!', draw:'Ничья!', settings:'Настройки', info:'Инфо', play:'Игра', repo:'GitHub / исходники', version:'Версия', createdByLabel:'Created by', themeClassic:'Светлая', themeDark:'Тёмная', modeAI:'Против ИИ', modeTwoPlayers:'Два игрока', startPlayer:'Игрок', startComputer:'Компьютер' };
  }
  currentLang = code;
  localStorage.setItem('ttt_lang', code);
  applyTranslations();
}

function applyTranslations(){
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key && translations[key] !== undefined) el.textContent = translations[key];
  });
  // repo link text needs translation too
  const repoEl = document.getElementById('repoLink');
  if (repoEl && translations['repo']) repoEl.textContent = translations['repo'];
  // createdBy label
  const cbEls = document.querySelectorAll('[data-i18n="createdByLabel"]');
  cbEls.forEach(e => { if (translations['createdByLabel']) e.textContent = translations['createdByLabel']; });
  // version label
  const verEls = document.querySelectorAll('[data-i18n="version"]');
  verEls.forEach(e => { if (translations['version']) e.textContent = translations['version']; });
  // update status line
  setStatusTemplate();
  // update appTitle
  if (translations['gameTitle']) appTitle.textContent = translations['gameTitle'];
}

// theme
function applyTheme(name){
  // animate theme change by toggling class with small timeout for smoother transition
  if (name === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  localStorage.setItem('ttt_theme', name);
}

// segmented controls logic (immediate apply)
function wireSegmentedControls(){
  // every segmented container with data-group
  document.querySelectorAll('.segmented[data-group]').forEach(container => {
    const group = container.dataset.group;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      const value = btn.dataset.value;
      // set aria-pressed visual state
      container.querySelectorAll('.seg-btn').forEach(s => s.setAttribute('aria-pressed','false'));
      btn.setAttribute('aria-pressed','true');
      // immediate apply
      applySetting(group, value);
    });
  });
}

function applySetting(group, value){
  switch(group){
    case 'mode':
      aiMode = (value === 'ai');
      // show/hide firstMoveRow
      firstMoveRow.style.display = aiMode ? 'block' : 'none';
      resetGame();
      break;
    case 'player':
      playerRole = value;
      computerRole = (playerRole === 'X') ? 'O' : 'X';
      resetGame();
      break;
    case 'theme':
      applyTheme(value);
      break;
    case 'lang':
      // handled elsewhere via dynamic buttons
      break;
    case 'startOrder':
      // set current player starting
      currentPlayer = (value === 'player') ? playerRole : computerRole;
      resetGame();
      break;
    default:
      break;
  }
}

/* ----- Game logic (minimax AI restored) ----- */
function renderBoard(){
  board.forEach((v, idx) => {
    const el = cells[idx];
    el.textContent = v || '';
    el.classList.toggle('x', v === 'X');
    el.classList.toggle('o', v === 'O');
    el.classList.remove('win');
    el.removeAttribute('aria-disabled');
  });
}

function handleCellClick(e){
  if (!gameActive) return;
  const el = e.currentTarget;
  const idx = Number(el.dataset.index);
  if (board[idx] !== '') return;
  movesHistory.push(board.slice());
  board[idx] = currentPlayer;
  renderBoard();
  soundManager.play('move');
  checkAfterMove();
}

function checkAfterMove(){
  const winner = checkWinner();
  if (winner) {
    announce(winner === 'X' ? (translations.xWins || 'X wins!') : (translations.oWins || 'O wins!'));
    highlightWinner(winner);
    soundManager.play('win');
    gameActive = false;
    return;
  }
  if (!board.includes('')) {
    announce(translations.draw || 'Draw!');
    soundManager.play('draw');
    gameActive = false;
    return;
  }
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  setStatusTemplate();
  if (aiMode && gameActive && currentPlayer === computerRole) {
    lockBoard();
    setTimeout(aiMove, 340);
  }
}

function highlightWinner(winner){
  winningConditions.forEach(cond => {
    if (cond.every(i => board[i] === winner)) {
      cond.forEach(i => cells[i].classList.add('win'));
    }
  });
}

function checkWinner(){
  for (let cond of winningConditions){
    const [a,b,c] = cond;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

/* AI */
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
    soundManager.play('move');
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
function checkWin(b, p){ return winningConditions.some(cond => cond.every(i => b[i] === p)); }

function lockBoard(){ cells.forEach(c => c.setAttribute('aria-disabled','true')); }
function unlockBoard(){ cells.forEach(c => c.removeAttribute('aria-disabled')); }

function resetGame(){
  board = Array(9).fill('');
  movesHistory = [];
  gameActive = true;
  // read current settings state from UI
  readSettingsFromUI();
  // determine starter
  if (aiMode) {
    const startOrderBtn = document.querySelector('.segmented[data-group="startOrder"] .seg-btn[aria-pressed="true"]');
    const start = startOrderBtn ? startOrderBtn.dataset.value : 'player';
    currentPlayer = (start === 'player') ? playerRole : computerRole;
  } else {
    currentPlayer = playerRole;
  }
  renderBoard();
  setStatusTemplate();
  if (aiMode && currentPlayer === computerRole) {
    lockBoard();
    setTimeout(aiMove, 260);
  } else {
    unlockBoard();
  }
}

function undoMove(){
  if (!movesHistory.length) return;
  board = movesHistory.pop();
  gameActive = true;
  renderBoard();
  setStatusTemplate();
}

/* read settings from segmented UI buttons */
function readSettingsFromUI(){
  const modeBtn = document.querySelector('.segmented[data-group="mode"] .seg-btn[aria-pressed="true"]');
  aiMode = modeBtn ? (modeBtn.dataset.value === 'ai') : true;

  const playerBtn = document.querySelector('.segmented[data-group="player"] .seg-btn[aria-pressed="true"]');
  playerRole = playerBtn ? playerBtn.dataset.value : 'X';
  computerRole = playerRole === 'X' ? 'O' : 'X';
}

/* Panels toggling & outside click handling */
function closeAllPanels(){
  panelSettings.setAttribute('aria-hidden', 'true');
  panelInfo.setAttribute('aria-hidden', 'true');
  // nav buttons reset
  [navGame, navSettings, navInfo].forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
  // set game nav active
  navGame.classList.add('active'); navGame.setAttribute('aria-pressed','true');
}
function togglePanel(panelEl, navBtn){
  const isOpen = panelEl.getAttribute('aria-hidden') === 'false';
  if (isOpen) { // close
    panelEl.setAttribute('aria-hidden','true');
    navBtn.classList.remove('active'); navBtn.setAttribute('aria-pressed','false');
    navGame.classList.add('active'); navGame.setAttribute('aria-pressed','true');
  } else {
    // close others
    panelSettings.setAttribute('aria-hidden','true');
    panelInfo.setAttribute('aria-hidden','true');
    // open requested
    panelEl.setAttribute('aria-hidden','false');
    [navGame, navSettings, navInfo].forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
    navBtn.classList.add('active'); navBtn.setAttribute('aria-pressed','true');
  }
}

// nav handlers
navGame.addEventListener('click', () => {
  // game = close panels
  closeAllPanels();
});
navSettings.addEventListener('click', () => togglePanel(panelSettings, navSettings));
navInfo.addEventListener('click', () => togglePanel(panelInfo, navInfo));

// close btns
closeSettingsBtn?.addEventListener('click', ()=>{ panelSettings.setAttribute('aria-hidden','true'); navSettings.classList.remove('active'); navSettings.setAttribute('aria-pressed','false'); navGame.classList.add('active'); navGame.setAttribute('aria-pressed','true'); });
closeInfoBtn?.addEventListener('click', ()=>{ panelInfo.setAttribute('aria-hidden','true'); navInfo.classList.remove('active'); navInfo.setAttribute('aria-pressed','false'); navGame.classList.add('active'); navGame.setAttribute('aria-pressed','true'); });

// click outside to close
document.addEventListener('click', (e) => {
  const target = e.target;
  // if click inside panel or nav button -> ignore
  if (panelSettings.contains(target) || panelInfo.contains(target) || navSettings.contains(target) || navInfo.contains(target) || navGame.contains(target)) return;
  // else close if open
  if (panelSettings.getAttribute('aria-hidden') === 'false' || panelInfo.getAttribute('aria-hidden') === 'false') {
    panelSettings.setAttribute('aria-hidden','true');
    panelInfo.setAttribute('aria-hidden','true');
    [navSettings, navInfo].forEach(b=> b.classList.remove('active'));
    navGame.classList.add('active'); navGame.setAttribute('aria-pressed','true');
  }
});

// Esc closes
document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeAllPanels(); });

/* wire cells */
cells.forEach(c=>{
  c.addEventListener('click', handleCellClick);
  c.addEventListener('keydown', (e)=> { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCellClick({ currentTarget: c }); } });
});

/* reset/undo */
resetBtn.addEventListener('click', resetGame);
undoBtn.addEventListener('click', undoMove);

/* segmented wiring */
wireSegmentedControls();

/* init flow */
(async function init(){
  // load languages list (manifest or fallback)
  await loadLangList();
  renderLanguageButtons();

  // load translations for default/current
  const langObj = availableLangs.find(l => l.code === currentLang) || availableLangs[0];
  await loadTranslations(currentLang, langObj ? langObj.file : undefined);

  // pick theme from storage or prefers-color-scheme
  const savedTheme = localStorage.getItem('ttt_theme');
  if (savedTheme) applyTheme(savedTheme);
  else applyTheme(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  // set segmented UI initial pressed states based on defaults or saved
  // mode
  const mode = localStorage.getItem('ttt_mode') || 'ai';
  const modeBtn = document.querySelector(`.segmented[data-group="mode"] .seg-btn[data-value="${mode}"]`);
  if (modeBtn) modeBtn.setAttribute('aria-pressed','true');
  // player
  const p = localStorage.getItem('ttt_player') || 'X';
  const pBtn = document.querySelector(`.segmented[data-group="player"] .seg-btn[data-value="${p}"]`);
  if (pBtn) pBtn.setAttribute('aria-pressed','true');
  // theme segmented (reflect current)
  const theme = localStorage.getItem('ttt_theme') || (document.body.classList.contains('dark') ? 'dark' : 'light');
  const tBtn = document.querySelector(`.segmented[data-group="theme"] .seg-btn[data-value="${theme}"]`);
  if (tBtn) tBtn.setAttribute('aria-pressed','true');
  // firstMove default
  const start = localStorage.getItem('ttt_start') || 'player';
  const sBtn = document.querySelector(`.segmented[data-group="startOrder"] .seg-btn[data-value="${start}"]`);
  if (sBtn) sBtn.setAttribute('aria-pressed','true');

  // show/hide firstMoveRow based on mode
  const modeNow = document.querySelector('.segmented[data-group="mode"] .seg-btn[aria-pressed="true"]')?.dataset.value || 'ai';
  firstMoveRow.style.display = modeNow === 'ai' ? 'block' : 'none';

  // read settings
  readSettingsFromUI();

  // set created by & repo translation
  const author = document.getElementById('author');
  if (author) author.textContent = 'Mr. Admin';
  const repoEl = document.getElementById('repoLink');
  if (repoEl && translations['repo']) repoEl.textContent = translations['repo'];

  // start
  resetGame();
})();
