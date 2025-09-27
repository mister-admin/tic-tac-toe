/* Main script - robust, minimal external assumptions.
   - Loads manifest (if present) for language list with fallback
   - Dynamically renders language buttons
   - Segmented buttons (immediate apply)
   - Panels: toggle, close on outside click, Esc, repeat click
   - Theme auto-detect + immediate animated transition
   - SoundManager (graceful)
   - Restored game logic + minimax AI
*/

const APP_VERSION = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'v1.0.0';

// DOM refs (safe queries)
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

const authorEl = document.getElementById('author');
const appVersionEl = document.getElementById('appVersion');
const repoLink = document.getElementById('repoLink');

if (authorEl) authorEl.textContent = 'Mr. Admin';
if (appVersionEl) appVersionEl.textContent = APP_VERSION;

// STATE
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

// sound manager
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
    s.play().catch(()=>{ /* ignore autoplay policy errors */ });
  }
}
const soundManager = new SoundManager();

// i18n
let translations = {};
let availableLangs = [];
let currentLang = localStorage.getItem('ttt_lang') || (navigator.language && navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en');

function setStatusTemplate(msg){
  if (typeof msg === 'string') { statusEl.textContent = msg; return; }
  const tpl = translations['ready'] || 'Ready — {p}';
  statusEl.textContent = tpl.replace('{p}', currentPlayer);
  const subtitle = document.getElementById('subtitle');
  if (subtitle) subtitle.textContent = statusEl.textContent;
}

// load language manifest (fallback to ru/en)
async function loadLangList(){
  try {
    const res = await fetch('lang/manifest.json', {cache:'no-store'});
    if (res.ok) {
      const manifest = await res.json();
      availableLangs = manifest.map(f => ({code: f.split('.')[0], file: f}));
      return;
    }
  } catch(e){ /* ignore */ }
  // fallback defaults
  availableLangs = [{code:'ru', file:'ru.json'}, {code:'en', file:'en.json'}];
}

function renderLanguageButtons(){
  if (!languagesContainer) return;
  languagesContainer.innerHTML = '';
  availableLangs.forEach(l => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'seg-btn';
    btn.dataset.value = l.code;
    btn.setAttribute('aria-pressed', l.code === currentLang ? 'true' : 'false');
    btn.textContent = l.code;
    btn.addEventListener('click', () => {
      // visual
      languagesContainer.querySelectorAll('.seg-btn').forEach(s => s.setAttribute('aria-pressed','false'));
      btn.setAttribute('aria-pressed','true');
      loadTranslations(l.code, l.file);
    });
    languagesContainer.appendChild(btn);
  });
}

async function loadTranslations(code, file){
  try {
    const filename = file || `${code}.json`;
    const res = await fetch(`lang/${filename}`, {cache:'no-store'});
    if (!res.ok) throw new Error('not found');
    translations = await res.json();
  } catch(e) {
    // fallback minimal dictionary
    translations = code === 'en' ? {
      "gameTitle":"Tic-Tac-Toe","restart":"Restart","ready":"Ready — {p}","xWins":"X wins!","oWins":"O wins!","draw":"Draw!",
      "settings":"Settings","info":"Info","play":"Play","repo":"GitHub / source","version":"Version","createdByLabel":"Created by",
      "modeAI":"Vs AI","modeTwoPlayers":"Two players","themeClassic":"Light","themeDark":"Dark","startPlayer":"Player","startComputer":"Computer"
    } : {
      "gameTitle":"Крестики-нолики","restart":"Начать заново","ready":"Готово — ходит {p}","xWins":"Победил X!","oWins":"Победил O!","draw":"Ничья!",
      "settings":"Настройки","info":"Инфо","play":"Игра","repo":"GitHub / исходники","version":"Версия","createdByLabel":"Created by",
      "modeAI":"Против ИИ","modeTwoPlayers":"Два игрока","themeClassic":"Светлая","themeDark":"Тёмная","startPlayer":"Игрок","startComputer":"Компьютер"
    };
  }
  currentLang = code;
  localStorage.setItem('ttt_lang', code);
  applyTranslations();
}

function applyTranslations(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if (key && translations[key] !== undefined) el.textContent = translations[key];
  });
  if (repoLink && translations['repo']) repoLink.textContent = translations['repo'];
  setStatusTemplate();
  const title = document.getElementById('appTitle');
  if (title && translations['gameTitle']) title.textContent = translations['gameTitle'];
}

/* Theme */
function applyTheme(name){
  if (name === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  localStorage.setItem('ttt_theme', name);
}

/* segmented controls wiring */
function wireSegmentedControls(){
  document.querySelectorAll('.segmented[data-group]').forEach(container => {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      // set aria pressed
      container.querySelectorAll('.seg-btn').forEach(s => s.setAttribute('aria-pressed','false'));
      btn.setAttribute('aria-pressed','true');
      const group = container.dataset.group;
      const value = btn.dataset.value;
      applySetting(group, value);
    });
  });
}

function applySetting(group, value){
  switch(group){
    case 'mode':
      aiMode = (value === 'ai');
      localStorage.setItem('ttt_mode', value);
      firstMoveRow.style.display = aiMode ? 'block' : 'none';
      resetGame();
      break;
    case 'player':
      playerRole = value;
      computerRole = playerRole === 'X' ? 'O' : 'X';
      localStorage.setItem('ttt_player', value);
      resetGame();
      break;
    case 'theme':
      applyTheme(value);
      localStorage.setItem('ttt_theme', value);
      break;
    case 'startOrder':
      localStorage.setItem('ttt_start', value);
      currentPlayer = (value === 'player') ? playerRole : computerRole;
      resetGame();
      break;
    case 'lang':
      // handled by language buttons
      break;
    default: break;
  }
}

/* Game rendering */
function renderBoard(){
  board.forEach((v,i)=>{
    const el = cells[i];
    el.textContent = v || '';
    el.classList.toggle('x', v === 'X');
    el.classList.toggle('o', v === 'O');
    el.classList.remove('win');
    el.removeAttribute('aria-disabled');
  });
}
function setStatusTemplate(msg){
  if (msg) { statusEl.textContent = msg; if (subtitle) subtitle.textContent = msg; return; }
  const tpl = translations['ready'] || 'Ready — {p}';
  statusEl.textContent = tpl.replace('{p}', currentPlayer);
  const subtitle = document.getElementById('subtitle');
  if (subtitle) subtitle.textContent = statusEl.textContent;
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
  const w = checkWinner();
  if (w) {
    setStatusTemplate(w === 'X' ? (translations.xWins || 'X wins!') : (translations.oWins || 'O wins!'));
    highlightWinner(w);
    soundManager.play('win');
    gameActive = false;
    return;
  }
  if (!board.includes('')) {
    setStatusTemplate(translations.draw || 'Draw!');
    soundManager.play('draw');
    gameActive = false;
    return;
  }
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  setStatusTemplate();
  if (aiMode && gameActive && currentPlayer === computerRole){
    lockBoard();
    setTimeout(aiMove, 300);
  }
}

function highlightWinner(w){
  winningConditions.forEach(cond => {
    if (cond.every(i => board[i] === w)) {
      cond.forEach(i => cells[i].classList.add('win'));
    }
  });
}

/* AI - minimax */
function aiMove(){
  let bestScore = -Infinity, move;
  for (let i=0;i<9;i++){
    if (board[i] === '') {
      board[i] = computerRole;
      const score = minimax(board, 0, false);
      board[i] = '';
      if (score > bestScore){ bestScore = score; move = i; }
    }
  }
  if (move !== undefined){
    movesHistory.push(board.slice());
    board[move] = computerRole;
    renderBoard();
    soundManager.play('move');
    checkAfterMove();
  }
  unlockBoard();
}
function minimax(newBoard, depth, isMax){
  if (checkWin(newBoard, computerRole)) return 10 - depth;
  if (checkWin(newBoard, playerRole)) return depth - 10;
  if (!newBoard.includes('')) return 0;
  if (isMax){
    let best = -Infinity;
    for (let i=0;i<9;i++){
      if (newBoard[i] === ''){
        newBoard[i] = computerRole;
        best = Math.max(best, minimax(newBoard, depth+1, false));
        newBoard[i] = '';
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i=0;i<9;i++){
      if (newBoard[i] === ''){
        newBoard[i] = playerRole;
        best = Math.min(best, minimax(newBoard, depth+1, true));
        newBoard[i] = '';
      }
    }
    return best;
  }
}
function checkWin(b, p){ return winningConditions.some(cond => cond.every(i => b[i] === p)); }
function checkWinner(){
  for (let cond of winningConditions){
    const [a,b,c] = cond;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

function lockBoard(){ cells.forEach(c => c.setAttribute('aria-disabled','true')); }
function unlockBoard(){ cells.forEach(c => c.removeAttribute('aria-disabled')); }

function resetGame(){
  board = Array(9).fill('');
  movesHistory = [];
  gameActive = true;
  readSettingsFromUI();
  // decide starter
  const start = localStorage.getItem('ttt_start') || 'player';
  currentPlayer = (aiMode && start === 'computer') ? computerRole : playerRole;
  renderBoard();
  setStatusTemplate();
  if (aiMode && currentPlayer === computerRole) { lockBoard(); setTimeout(aiMove, 260); } else unlockBoard();
}

function undoMove(){
  if (!movesHistory.length) return;
  board = movesHistory.pop();
  gameActive = true;
  renderBoard();
  setStatusTemplate();
}

function readSettingsFromUI(){
  const m = document.querySelector('.segmented[data-group="mode"] .seg-btn[aria-pressed="true"]');
  aiMode = m ? (m.dataset.value === 'ai') : true;
  const p = document.querySelector('.segmented[data-group="player"] .seg-btn[aria-pressed="true"]');
  playerRole = p ? p.dataset.value : 'X';
  computerRole = playerRole === 'X' ? 'O' : 'X';
}

/* Panels: toggle/close/on outside click/Escape */
function closeAllPanels(){
  if (panelSettings) panelSettings.setAttribute('aria-hidden','true');
  if (panelInfo) panelInfo.setAttribute('aria-hidden','true');
  [navGame, navSettings, navInfo].forEach(b => { if (b) { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); }});
  navGame.classList.add('active'); navGame.setAttribute('aria-pressed','true');
}
function togglePanel(panelEl, navBtn){
  if (!panelEl || !navBtn) return;
  const open = panelEl.getAttribute('aria-hidden') === 'false';
  if (open) {
    panelEl.setAttribute('aria-hidden','true'); navBtn.classList.remove('active'); navBtn.setAttribute('aria-pressed','false'); navGame.classList.add('active'); navGame.setAttribute('aria-pressed','true');
  } else {
    if (panelSettings) panelSettings.setAttribute('aria-hidden','true');
    if (panelInfo) panelInfo.setAttribute('aria-hidden','true');
    panelEl.setAttribute('aria-hidden','false'); [navGame, navSettings, navInfo].forEach(b => { if (b) { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); }});
    navBtn.classList.add('active'); navBtn.setAttribute('aria-pressed','true');
  }
}

/* click handlers */
navGame?.addEventListener('click', ()=> { closeAllPanels(); });
navSettings?.addEventListener('click', ()=> togglePanel(panelSettings, navSettings));
navInfo?.addEventListener('click', ()=> togglePanel(panelInfo, navInfo));
closeSettingsBtn?.addEventListener('click', ()=> { panelSettings.setAttribute('aria-hidden','true'); navSettings.classList.remove('active'); navSettings.setAttribute('aria-pressed','false'); navGame.classList.add('active'); navGame.setAttribute('aria-pressed','true'); });
closeInfoBtn?.addEventListener('click', ()=> { panelInfo.setAttribute('aria-hidden','true'); navInfo.classList.remove('active'); navInfo.setAttribute('aria-pressed','false'); navGame.classList.add('active'); navGame.setAttribute('aria-pressed','true'); });

document.addEventListener('click', (e) => {
  // if click inside panel or on nav -> ignore
  const target = e.target;
  if (panelSettings && panelSettings.contains(target)) return;
  if (panelInfo && panelInfo.contains(target)) return;
  if (navSettings && navSettings.contains(target)) return;
  if (navInfo && navInfo.contains(target)) return;
  if (navGame && navGame.contains(target)) return;
  // otherwise close panels if any open
  if ((panelSettings && panelSettings.getAttribute('aria-hidden') === 'false') || (panelInfo && panelInfo.getAttribute('aria-hidden') === 'false')) {
    closeAllPanels();
  }
});
document.addEventListener('keydown', (e)=> { if (e.key === 'Escape') closeAllPanels(); });

/* Wire cells & keyboard */
cells.forEach(c => {
  c.addEventListener('click', handleCellClick);
  c.addEventListener('keydown', (e)=> {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCellClick({ currentTarget: c }); }
  });
});

/* reset & undo */
resetBtn?.addEventListener('click', resetGame);
undoBtn?.addEventListener('click', undoMove);

/* segmented wiring */
wireSegmentedControls();

/* INIT */
(async function init(){
  // load languages list
  await loadLangList();
  renderLanguageButtons();

  // set initial pressed states from localStorage or defaults
  // mode
  const savedMode = localStorage.getItem('ttt_mode') || 'ai';
  const modeBtn = document.querySelector(`.segmented[data-group="mode"] .seg-btn[data-value="${savedMode}"]`);
  if (modeBtn) modeBtn.setAttribute('aria-pressed','true');

  // player
  const savedPlayer = localStorage.getItem('ttt_player') || 'X';
  const playerBtn = document.querySelector(`.segmented[data-group="player"] .seg-btn[data-value="${savedPlayer}"]`);
  if (playerBtn) playerBtn.setAttribute('aria-pressed','true');

  // theme
  const savedTheme = localStorage.getItem('ttt_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const themeBtn = document.querySelector(`.segmented[data-group="theme"] .seg-btn[data-value="${savedTheme}"]`);
  if (themeBtn) themeBtn.setAttribute('aria-pressed','true');
  applyTheme(savedTheme);

  // startOrder
  const savedStart = localStorage.getItem('ttt_start') || 'player';
  const startBtn = document.querySelector(`.segmented[data-group="startOrder"] .seg-btn[data-value="${savedStart}"]`);
  if (startBtn) startBtn.setAttribute('aria-pressed','true');

  // show/hide firstMoveRow
  const curMode = document.querySelector('.segmented[data-group="mode"] .seg-btn[aria-pressed="true"]')?.dataset.value || savedMode;
  firstMoveRow.style.display = curMode === 'ai' ? 'block' : 'none';

  // load translations for currentLang
  const langObj = availableLangs.find(l => l.code === currentLang) || availableLangs[0] || {code:'ru', file:'ru.json'};
  await loadTranslations(currentLang, langObj.file);

  // set repo text if available
  if (repoLink && translations['repo']) repoLink.textContent = translations['repo'];
  // set created by label if translation present
  const createdEls = document.querySelectorAll('[data-i18n="createdByLabel"]');
  createdEls.forEach(e => { if (translations['createdByLabel']) e.textContent = translations['createdByLabel']; });
  // set version label translations if present
  const verEls = document.querySelectorAll('[data-i18n="version"]');
  verEls.forEach(e => { if (translations['version']) e.textContent = translations['version']; });

  // read settings
  readSettingsFromUI();

  // start
  resetGame();
})();
