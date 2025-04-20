const cells = document.querySelectorAll('.cell');
const resetButton = document.getElementById('reset');
const modeRadios = document.querySelectorAll('input[name="mode"]');
const playerRadios = document.querySelectorAll('input[name="player"]');
const themeRadios = document.querySelectorAll('input[name="theme"]');
const langRadios = document.querySelectorAll('input[name="lang"]');
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;
let aiMode = true;
let playerRole = 'X';
let computerRole = 'O';
const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

// Локализация
const i18n = {
    ru: {
        gameTitle: "Крестики-нолики",
        restart: "Начать заново",
        modeAI: "Против ИИ",
        modeTwoPlayers: "Два игрока",
        playerLabel: "Ваша роль",
        themeClassic: "☀️ Светлая тема",
        themeDark: "🌙 Тёмная тема",
        xWins: "Победил X!",
        oWins: "Победил O!",
        draw: "Ничья!",
        version: "v1.0.1 Stable",
        startPlayer: "Игрок первый",
        startComputer: "Компьютер первый"
    },
    en: {
        gameTitle: "Tic-Tac-Toe",
        restart: "Restart",
        modeAI: "VS AI",
        modeTwoPlayers: "Two players",
        playerLabel: "Your role",
        themeClassic: "☀️ Light theme",
        themeDark: "🌙 Dark theme",
        xWins: "X wins!",
        oWins: "O wins!",
        draw: "Draw!",
        version: "v1.0.1 Stable",
        startPlayer: "Player first",
        startComputer: "Computer first"
    }
};
let currentLang = 'ru';

// Функции блокировки и разблокировки игрового поля
function lockGameField() {
    cells.forEach(cell => cell.setAttribute('disabled', true));
}

function unlockGameField() {
    cells.forEach(cell => cell.removeAttribute('disabled'));
}

// Обработчик клика по ячейке
function handleCellClick(event) {
    if (!gameActive) return;
    const clickedCell = event.target;
    const index = parseInt(clickedCell.dataset.index);
    if (board[index] !== '') return;
    updateBoard(clickedCell, index);
    handleResultValidation();
    if (aiMode && gameActive && currentPlayer === computerRole) {
        lockGameField();
        setTimeout(aiMove, 300);
    }
}

// Обновление доски
function updateBoard(clickedCell, index) {
    board[index] = currentPlayer;
    clickedCell.textContent = currentPlayer;
    soundManager.play('move');
}

// Проверка результата
function handleResultValidation() {
    let roundWon = false;
    for (let condition of winningConditions) {
        const [a, b, c] = condition;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            roundWon = true;
            break;
        }
    }
    if (roundWon) {
        announce(currentPlayer === 'X' ? i18n[currentLang].xWins : i18n[currentLang].oWins);
        gameActive = false;
        highlightWinningCombo();
        soundManager.play('win');
        return;
    }
    if (!board.includes('')) {
        announce(i18n[currentLang].draw);
        gameActive = false;
        soundManager.play('draw');
        return;
    }
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
}

// Объявление победителя или ничьи
function announce(message) {
    document.getElementById('gameTitle').textContent = message;
}

// Перезапуск игры
function resetGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    aiMode = document.querySelector('input[name="mode"]:checked').value === 'ai';
    const startOrderGroup = document.getElementById('startOrderGroup');
    startOrderGroup.style.display = aiMode ? 'block' : 'none';
    playerRole = document.querySelector('input[name="player"]:checked').value;
    computerRole = playerRole === 'X' ? 'O' : 'X';
    if (aiMode) {
        const startOrder = document.querySelector('input[name="startOrder"]:checked').value;
        currentPlayer = startOrder === 'player' ? playerRole : computerRole;
        if (currentPlayer === computerRole) {
            lockGameField();
            setTimeout(aiMove, 300);
        } else {
            unlockGameField();
        }
    } else {
        currentPlayer = playerRole;
        unlockGameField();
    }
    cells.forEach(cell => {
        cell.textContent = '';
        cell.removeAttribute('disabled');
        cell.classList.remove('win-cell');
        cell.style.transform = 'scale(1)';
        cell.style.boxShadow = 'none';
    });
    announce(i18n[currentLang].gameTitle);
}

// Ход компьютера
function aiMove() {
    let bestScore = -Infinity, move;
    for (let i = 0; i < board.length; i++) {
        if (board[i] === '') {
            board[i] = computerRole;
            const score = minimax(board, 0, false);
            board[i] = '';
            if (score > bestScore) [bestScore, move] = [score, i];
        }
    }
    if (move !== undefined) {
        updateBoard(cells[move], move);
        handleResultValidation();
    }
    if (gameActive) unlockGameField();
}

// Минимаксный алгоритм
function minimax(newBoard, depth, isMaximizing) {
    if (checkWin(newBoard, computerRole)) return 10 - depth;
    if (checkWin(newBoard, playerRole)) return depth - 10;
    if (isBoardFull(newBoard)) return 0;
    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < newBoard.length; i++) {
            if (newBoard[i] === '') {
                newBoard[i] = computerRole;
                const score = minimax(newBoard, depth + 1, false);
                newBoard[i] = '';
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < newBoard.length; i++) {
            if (newBoard[i] === '') {
                newBoard[i] = playerRole;
                const score = minimax(newBoard, depth + 1, true);
                newBoard[i] = '';
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

// Проверка победы
function checkWin(board, player) {
    return winningConditions.some(condition => condition.every(index => board[index] === player));
}

// Проверка заполненности доски
function isBoardFull(board) {
    return !board.includes('');
}

// Подсветка выигрышной комбинации
function highlightWinningCombo() {
    winningConditions.forEach(condition => {
        if (condition.every(index => board[index] === currentPlayer)) {
            condition.forEach(index => {
                cells[index].classList.add('win-cell');
                cells[index].style.transition = 'all 0.5s ease';
                cells[index].style.transform = 'scale(1.1)';
                cells[index].style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.8)';
            });
        }
    });
}

// Смена языка
function setLanguage(lang) {
    currentLang = lang;
    document.getElementById('gameTitle').textContent = i18n[lang].gameTitle;
    document.getElementById('reset').textContent = i18n[lang].restart;
    document.querySelector('label[for="mode-ai"]').textContent = i18n[lang].modeAI;
    document.querySelector('label[for="mode-twoPlayers"]').textContent = i18n[lang].modeTwoPlayers;
    document.querySelector('label[for="player-X"]').textContent = `X (${i18n[lang].playerLabel})`;
    document.querySelector('label[for="player-O"]').textContent = `O (${i18n[lang].playerLabel})`;
    document.querySelector('label[for="theme-classic"]').textContent = i18n[lang].themeClassic;
    document.querySelector('label[for="theme-dark"]').textContent = i18n[lang].themeDark;
    document.querySelector('label[for="start-player"]').textContent = i18n[lang].startPlayer;
    document.querySelector('label[for="start-computer"]').textContent = i18n[lang].startComputer;
    document.querySelector('footer span[data-i18n="version"]').textContent = i18n[lang].version;
    localStorage.setItem('language', lang);
}

// Обработчики настроек
langRadios.forEach(radio => radio.addEventListener('change', () => {
    const selectedLang = document.querySelector('input[name="lang"]:checked').value;
    setLanguage(selectedLang);
}));

themeRadios.forEach(radio => radio.addEventListener('change', () => {
    const selectedTheme = document.querySelector('input[name="theme"]:checked').value;
    if (selectedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', selectedTheme);
}));

modeRadios.forEach(radio => radio.addEventListener('change', resetGame));
playerRadios.forEach(radio => radio.addEventListener('change', resetGame));
document.querySelectorAll('input[name="startOrder"]').forEach(radio => 
    radio.addEventListener('change', resetGame)
);

// Инициализация игры
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('language') || 'ru';
    setLanguage(savedLang);
    document.querySelector(`input[name="lang"][value="${savedLang}"]`).checked = true;
    const initialMode = document.querySelector('input[name="mode"]:checked').value;
    const startOrderGroup = document.getElementById('startOrderGroup');
    startOrderGroup.style.display = initialMode === 'ai' ? 'block' : 'none';
    resetGame();
});

// Звуковые эффекты
class SoundManager {
    constructor() {
        this.sounds = {
            move: new Audio('sounds/beep-07.wav'),
            win: new Audio('sounds/success-01.wav'),
            draw: new Audio('sounds/fail-01.wav')
        };
    }
    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play().catch(err => console.warn('Audio playback failed:', err));
        }
    }
}

const soundManager = new SoundManager();
cells.forEach(cell => cell.addEventListener('click', handleCellClick));
resetButton.addEventListener('click', resetGame);