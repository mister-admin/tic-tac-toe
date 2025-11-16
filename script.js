/* Main logic — всё оригинальное + Liquid Glass улучшения */

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
let movesHistory = [];
const winningConditions = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

/* ---- i18n, theme, etc — всё как было ---- */
// ... (весь оригинальный код до функции renderBoard остаётся без изменений)

/* ---- НОВАЯ renderBoard с анимированными SVG X/O ---- */
function renderBoard(animateIndex = null) {
  cells.forEach((el, idx) => {
    const val = board[idx];
    el.classList.toggle('x', val === 'X');
    el.classList.toggle('o', val === 'O');
    el.classList.remove('animate-in');
    el.innerHTML = '';

    if (val) {
      if (val === 'X') {
        el.innerHTML = `
          <svg class="mark mark-x" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            <line x1="15" y1="15" x2="85" y2="85" class="draw-line"/>
            <line x1="85" y1="15" x2="15" y2="85" class="draw-line line2"/>
          </svg>`;
      } else {
        el.innerHTML = `
          <svg class="mark mark-o" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            <circle cx="50" cy="50" r="42" class="draw-circle"/>
          </svg>`;
      }
      if (animateIndex === idx) {
        requestAnimationFrame(() => el.classList.add('animate-in'));
      }
    }
    el.classList.remove('win');
    el.removeAttribute('aria-disabled');
  });
}

/* ---- handleCellClick — добавляем анимацию новой метки ---- */
function handleCellClick(e){
  if (!gameActive) return;
  const idx = Number(e.currentTarget.dataset.index);
  if (board[idx] !== '') return;

  movesHistory.push(board.slice());
  board[idx] = currentPlayer;
  renderBoard(idx);            // ← передаём индекс для анимации
  playMoveEffect(idx);
  checkAfterMove();
}

/* ---- aiMove — тоже с анимацией ---- */
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
    renderBoard(move);           // ← анимация для хода ИИ
    playMoveEffect(move);
    checkAfterMove();
  }
  unlockBoard();
}

/* ---- resetGame — очищаем анимацию ---- */
function resetGame(){
  board = Array(9).fill('');
  movesHistory = [];
  gameActive = true;
  cells.forEach(c => c.classList.remove('animate-in'));
  readSettingsToState();

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

/* ---- Liquid ripple на мышке ---- */
document.querySelectorAll('.liquid-interaction').forEach(el => {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);
  });

  el.addEventListener('mouseenter', () => el.classList.add('hovered'));
  el.addEventListener('mouseleave', () => el.classList.remove('hovered'));
});

/* ---- init — всё как было + наш код уже выше ---- */
(async function init(){
  await loadTranslations(currentLang);

  const langRadio = document.querySelector(`input[name="lang"][value="${currentLang}"]`);
  if (langRadio) langRadio.checked = true;

  const curTheme = localStorage.getItem('ttt_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const themeRadio = document.querySelector(`input[name="theme"][value="${curTheme}"]`);
  if (themeRadio) themeRadio.checked = true;

  const mode = document.querySelector('input[name="mode"]:checked')?.value || 'ai';
  document.getElementById('firstMoveRow').style.display = (mode === 'ai') ? 'block' : 'none';

  document.querySelectorAll('input[name="mode"]').forEach(r=>{
    r.addEventListener('change', (e)=> {
      document.getElementById('firstMoveRow').style.display = (e.target.value === 'ai') ? 'block' : 'none';
    });
  });

  readSettingsToState();

  const storedLang = localStorage.getItem('ttt_lang');
  if (storedLang) {
    const r = document.querySelector(`input[name="lang"][value="${storedLang}"]`);
    if (r) r.checked = true;
  }

  clearNavActive();
  navGame.classList.add('active'); navGame.setAttribute('aria-pressed','true');

  resetGame();
})();