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

const i18n = {
    ru: {
        restart: "Начать заново",
        gameTitle: "Крестики-нолики"
    },
    en: {
        restart: "Restart",
        gameTitle: "Tic Tac Toe"
    }
};

let currentLang = 'ru';

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

function handleCellClick(event) {
    const clickedCell = event.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

    console.log(`Clicked cell index: ${clickedCellIndex}`);
    console.log(`Current player: ${currentPlayer}, Game active: ${gameActive}`);

    // Проверяем, можно ли сделать ход
    if (board[clickedCellIndex] !== '' || !gameActive) {
        console.log('Invalid move. Returning...');
        return;
    }

    // Блокируем поле перед обновлением доски
    lockGameField();

    // Обновляем доску и проверяем результат
    updateBoard(clickedCell, clickedCellIndex);
    handleResultValidation();

    // Если игра против компьютера и игра ещё активна
    if (aiMode && gameActive && currentPlayer === computerRole) {
        console.log('AI is making a move...');
        setTimeout(aiMove, 500); // Добавляем задержку для ИИ
    } else {
        // Разблокируем поле, если играем вдвоем или после хода игрока
        unlockGameField();
    }
}

function updateBoard(clickedCell, index) {
    board[index] = currentPlayer;
    clickedCell.textContent = currentPlayer;
    soundManager.play('move');
    console.log(`Updated board at index ${index} with ${currentPlayer}.`);
}

function handleResultValidation() {
    let roundWon = false;
    for (let i = 0; i < winningConditions.length; i++) {
        const winCondition = winningConditions[i];
        let a = board[winCondition[0]];
        let b = board[winCondition[1]];
        let c = board[winCondition[2]];
        if (a === '' || b === '' || c === '') {
            continue;
        }
        if (a === b && b === c) {
            roundWon = true;
            break;
        }
    }
    if (roundWon) {
        announce(currentPlayer === 'X' ? 'Победил X!' : 'Победил O!');
        gameActive = false;
        highlightWinningCombo();
        soundManager.play('win');
        console.log(`${currentPlayer} wins!`);
        return;
    }
    let roundDraw = !board.includes('');
    if (roundDraw) {
        announce("Ничья!");
        gameActive = false;
        soundManager.play('draw');
        console.log('Game ended in a draw.');
        return;
    }
    handlePlayerChange();
    console.log(`Switched player to ${currentPlayer}.`);
}

function handlePlayerChange() {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
}

function announce(message) {
    const messageElement = document.getElementById('gameTitle');
    messageElement.textContent = message;
}

function resetGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = playerRole;
    gameActive = true;
    unlockGameField(); // Разблокируем поле при перезапуске игры
    cells.forEach(cell => {
        cell.textContent = '';
        cell.removeAttribute('disabled');
        cell.classList.remove('win-cell');
    });
    announce(i18n[currentLang].gameTitle);
    console.log('Game reset.');
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

    // Разблокируем поле после хода компьютера
    if (gameActive) {
        unlockGameField();
    }
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
            condition.forEach(index => cells[index].classList.add('win-cell'));
        }
    });
}

function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        el.textContent = i18n[lang][key];
    });
    announce(i18n[currentLang].gameTitle);
}

function toggleTheme() {
    const selectedTheme = document.querySelector('input[name="theme"]:checked').value;
    if (selectedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', selectedTheme);
}

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

themeRadios.forEach(radio => radio.addEventListener('change', toggleTheme));
langRadios.forEach(radio => radio.addEventListener('change', () => {
    const selectedLang = document.querySelector('input[name="lang"]:checked').value;
    setLanguage(selectedLang);
    localStorage.setItem('language', selectedLang);
}));

modeRadios.forEach(radio => radio.addEventListener('change', () => {
    aiMode = radio.value === 'ai';
    resetGame();
}));

playerRadios.forEach(radio => radio.addEventListener('change', () => {
    playerRole = radio.value;
    computerRole = playerRole === 'X' ? 'O' : 'X';
    resetGame();
}));

// При загрузке страницы
const savedTheme = localStorage.getItem('theme') || 'classic';
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    document.querySelector('input[name="theme"][value="dark"]').checked = true;
} else {
    document.querySelector('input[name="theme"][value="classic"]').checked = true;
}

const savedLang = localStorage.getItem('language') || 'ru';
setLanguage(savedLang);
document.querySelector(`input[name="lang"][value="${savedLang}"]`).checked = true;

resetGame();
