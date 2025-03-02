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
        modeLabel: "Режим игры",
        modeAI: "Против компьютера",
        modeTwoPlayers: "Вдвоём",
        playerLabel: "Играть за",
        themeLabel: "Тема",
        themeClassic: "☀️ Светлая",
        themeDark: "🌙 Тёмная",
        langLabel: "Язык",
        xWins: "Победил X!",
        oWins: "Победил O!",
        draw: "Ничья!",
        footer: "Исходный код на "
    },
    en: {
        gameTitle: "Tic Tac Toe",
        restart: "Restart",
        modeLabel: "Game Mode",
        modeAI: "Against Computer",
        modeTwoPlayers: "Two Players",
        playerLabel: "Play as",
        themeLabel: "Theme",
        themeClassic: "☀️ Light",
        themeDark: "🌙 Dark",
        langLabel: "Language",
        xWins: "X wins!",
        oWins: "O wins!",
        draw: "Draw!",
        footer: "Source code on "
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

    // Обновляем доску и проверяем результат
    updateBoard(clickedCell, clickedCellIndex);
    handleResultValidation();

    // Если игра против компьютера и игра ещё активна
    if (aiMode && gameActive && currentPlayer === computerRole) {
        console.log('AI is making a move...');
        lockGameField(); // Блокируем поле перед ходом компьютера
        setTimeout(aiMove, 500); // Добавляем задержку для ИИ
    } else if (!aiMode) {
        // В режиме "вдвоём" поле не блокируется
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
        announce(currentPlayer === 'X' ? i18n[currentLang].xWins : i18n[currentLang].oWins);
        gameActive = false;
        highlightWinningCombo();
        soundManager.play('win');
        console.log(`${currentPlayer} wins!`);
        return;
    }
    let roundDraw = !board.includes('');
    if (roundDraw) {
        announce(i18n[currentLang].draw);
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
        cell.style.transform = 'scale(1)'; // Сбрасываем анимацию
        cell.style.boxShadow = 'none'; // Сбрасываем тени
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
            condition.forEach(index => {
                cells[index].classList.add('win-cell');
                // Добавляем анимацию победы
                cells[index].style.transition = 'all 0.5s ease';
                cells[index].style.transform = 'scale(1.1)';
                cells[index].style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.8)';
            });
        }
    });
}

// Функция смены языка
function setLanguage(lang) {
    currentLang = lang;
    // Обновляем текст на странице
    document.getElementById('gameTitle').textContent = i18n[lang].gameTitle;
    document.getElementById('reset').textContent = i18n[lang].restart;
    document.querySelector('label[for="mode-ai"]').textContent = i18n[lang].modeAI;
    document.querySelector('label[for="mode-twoPlayers"]').textContent = i18n[lang].modeTwoPlayers;
    document.querySelector('label[for="player-X"]').textContent = `X (${i18n[lang].playerLabel})`;
    document.querySelector('label[for="player-O"]').textContent = `O (${i18n[lang].playerLabel})`;
    document.querySelector('label[for="theme-classic"]').textContent = i18n[lang].themeClassic;
    document.querySelector('label[for="theme-dark"]').textContent = i18n[lang].themeDark;
    document.querySelector('label[for="lang-ru"]').textContent = 'RU';
    document.querySelector('label[for="lang-en"]').textContent = 'EN';
    document.querySelector('footer').innerHTML = `${i18n[lang].footer} <a href="https://github.com/mister-admin/tic-tac-toe" target="_blank">GitHub</a>`;
    // Сохраняем язык в localStorage
    localStorage.setItem('language', lang);
}

// Обработчик изменения языка
langRadios.forEach(radio => radio.addEventListener('change', () => {
    const selectedLang = document.querySelector('input[name="lang"]:checked').value;
    setLanguage(selectedLang);
}));

// При загрузке страницы
const savedLang = localStorage.getItem('language') || 'ru';
setLanguage(savedLang);
document.querySelector(`input[name="lang"][value="${savedLang}"]`).checked = true;

// Остальной код...
