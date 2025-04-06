const cells = document.querySelectorAll('.cell');
const resetButton = document.getElementById('reset');
const modeRadios = document.querySelectorAll('input[name="mode"]');
const playerRadios = document.querySelectorAll('input[name="player"]');
const themeRadios = document.querySelectorAll('input[name="theme"]');
const langRadios = document.querySelectorAll('input[name="lang"]');
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;
let aiMode = true; // Режим игры: true - против компьютера, false - вдвоём
let playerRole = 'X'; // Роль игрока
let computerRole = 'O'; // Роль компьютера
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
        footer: "Исходный код на ",
        startPlayer: "Игрок",
        startComputer: "Компьютер"
    },
    en: {
        gameTitle: "Tic Tac Toe",
        restart: "Restart",
        modeAI: "VS AI",
        modeTwoPlayers: "Two players",
        playerLabel: "Your role",
        themeClassic: "☀️ Light theme",
        themeDark: "🌙 Dark theme",
        xWins: "X wins!",
        oWins: "O wins!",
        draw: "Draw!",
        footer: "Source code on ",
        startPlayer: "Player",
        startComputer: "Computer"
    }
};
let currentLang = 'ru'; // Текущий язык

// Функция блокировки игрового поля
function lockGameField() {
    cells.forEach(cell => cell.setAttribute('disabled', true));
    console.log('Field locked.');
}

// Функция разблокировки игрового поля
function unlockGameField() {
    cells.forEach(cell => cell.removeAttribute('disabled'));
    console.log('Field unlocked.');
}

// Функция блокировки настроек
function lockSettings() {
    document.querySelectorAll('.settings-group').forEach(group => 
        group.classList.add('disabled')
    );
}

// Функция разблокировки настроек
function unlockSettings() {
    document.querySelectorAll('.settings-group').forEach(group => 
        group.classList.remove('disabled')
    );
}

function handleCellClick(event) {
    const clickedCell = event.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));
    if (board[clickedCellIndex] !== '' || !gameActive) return;

    updateBoard(clickedCell, clickedCellIndex);
    handleResultValidation();

    if (aiMode && gameActive && currentPlayer === computerRole) {
        lockGameField();
        setTimeout(aiMove, 500);
    }
}

function updateBoard(clickedCell, index) {
    board[index] = currentPlayer;
    clickedCell.textContent = currentPlayer;
    soundManager.play('move');
}

function handleResultValidation() {
    let roundWon = false;
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
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
        unlockSettings();
        return;
    }

    if (!board.includes('')) {
        announce(i18n[currentLang].draw);
        gameActive = false;
        soundManager.play('draw');
        unlockSettings();
        return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
}

function announce(message) {
    document.getElementById('gameTitle').textContent = message;
}

function resetGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    unlockSettings();

    if (aiMode) {
        const startOrder = document.querySelector('input[name="startOrder"]:checked').value;
        currentPlayer = startOrder === 'player' ? playerRole : computerRole;

        if (currentPlayer === computerRole) {
            lockGameField();
            setTimeout(aiMove, 500);
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

function aiMove() {
    let bestScore = -Infinity;
    let move;
    for (let i = 0; i < board.length; i++) {
        if (board[i] === '') {
            board[i] = computerRole;
            let score = minimax(board, 0, false);
            board[i] = '';
            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }

    if (move !== undefined) {
        updateBoard(cells[move], move);
        handleResultValidation();
    }

    if (gameActive) unlockGameField();
}

function minimax(newBoard, depth, isMaximizing) {
    if (checkWin(newBoard, computerRole)) return 10 - depth;
    if (checkWin(newBoard, playerRole)) return depth - 10;
    if (isBoardFull(newBoard)) return 0;

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < newBoard.length; i++) {
            if (newBoard[i] === '') {
                newBoard[i] = computerRole;
                let score = minimax(newBoard, depth + 1, false);
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
                let score = minimax(newBoard, depth + 1, true);
                newBoard[i] = '';
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

function checkWin(board, player) {
    return winningConditions.some(condition => condition.every(index => board[index] === player));
}

function isBoardFull(board) {
    return !board.includes('');
}

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
    document.querySelector('footer').innerHTML = `${i18n[lang].footer} <a href="https://github.com/mister-admin/tic-tac-toe" target="_blank">GitHub</a>`;
    localStorage.setItem('language', lang);
}

langRadios.forEach(radio => radio.addEventListener('change', () => {
    const selectedLang = document.querySelector('input[name="lang"]:checked').value;
    setLanguage(selectedLang);
}));

const savedLang = localStorage.getItem('language') || 'ru';
setLanguage(savedLang);
document.querySelector(`input[name="lang"][value="${savedLang}"]`).checked = true;

class SoundManager {
    constructor() {
        this.sounds = {
            move: new Audio('https://www.soundjay.com/button/beep-07.wav'),
            win: new Audio('https://www.soundjay.com/misc/success-01.wav'),
            draw: new Audio('https://www.soundjay.com/misc/fail-01.wav')
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

themeRadios.forEach(radio => radio.addEventListener('change', () => {
    const selectedTheme = document.querySelector('input[name="theme"]:checked').value;
    if (selectedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', selectedTheme);
}));

modeRadios.forEach(radio => radio.addEventListener('change', () => {
    aiMode = radio.value === 'ai';
    const startOrderGroup = document.getElementById('startOrderGroup');
    startOrderGroup.style.display = aiMode ? 'block' : 'none';
    resetGame();
}));

playerRadios.forEach(radio => radio.addEventListener('change', () => {
    playerRole = radio.value;
    computerRole = playerRole === 'X' ? 'O' : 'X';
    resetGame();
}));

document.querySelectorAll('input[name="startOrder"]').forEach(radio => {
    radio.addEventListener('change', () => localStorage.setItem('startOrder', radio.value));
});

const savedStartOrder = localStorage.getItem('startOrder') || 'player';
document.querySelector(`input[name="startOrder"][value="${savedStartOrder}"]`).checked = true;

resetGame();