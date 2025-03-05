// État global du jeu
const gameState = {
    timer: null,
    timeElapsed: 0,
    score: 0,
    foundWords: new Set(),
    isPaused: false,
    selectedCells: [],
    currentWord: '',
    wordList: [],
    gridSize: 10,
    level: 1,
    totalScore: 0,
    highScore: localStorage.getItem('highScore') || 0,
    gameMode: 'classic',
    countdownTime: 180, // 3 minutes en secondes
    countdownTimer: null,
    soundEnabled: true,
    progression: null
};

// Sélection des éléments DOM
const elements = {
    themeSelect: document.getElementById('themes'),
    levelSelect: document.getElementById('levels'),
    wordBoard: document.getElementById('game-board'),
    startBtn: document.getElementById('startBtn'),
    resetBtn: document.getElementById('resetBtn'),
    helpBtn: document.getElementById('helpBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    timerDisplay: document.getElementById('timer'),
    scoreDisplay: document.getElementById('score'),
    foundDisplay: document.getElementById('found'),
    totalDisplay: document.getElementById('total'),
    wordList: document.getElementById('word-list'),
    messageBox: document.getElementById('message'),
    instructionsBtn: document.getElementById('instructionsBtn'),
    instructionsModal: document.getElementById('instructionsModal'),
    closeModalBtn: document.querySelector('.close-modal'),
    gameMode: document.getElementById('gameMode'),
    countdown: document.getElementById('countdown'),
    countdownDisplay: document.querySelector('.countdown'),
    progressBtn: document.getElementById('progressBtn'),
    progressModal: document.getElementById('progressModal'),
    progressCloseBtn: document.querySelector('.progress-modal .close-modal'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    successModal: document.getElementById('successModal'),
    nextLevelBtn: document.getElementById('nextLevelBtn'),
    replayLevelBtn: document.getElementById('replayLevelBtn'),
    finalScore: document.getElementById('finalScore'),
    finalTime: document.getElementById('finalTime'),
    finalWords: document.getElementById('finalWords')
};

// Modifier la configuration des sons
const sounds = {
    success: new Audio('./sounds/success.mp3'),
    error: new Audio('./sounds/error.mp3'),
    complete: new Audio('./sounds/complete.mp3'),
    countdown: new Audio('./sounds/countdown.mp3'),
    timeOver: new Audio('./sounds/timeOver.mp3')
};

// Initialisation du jeu
async function initGame() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    elements.themeToggleBtn.textContent = savedTheme === 'dark' ? '🌙' : '🌓';
    
    preloadSounds();
    resetGameState();
    loadGameState();
    gameState.progression = new ProgressionSystem();
    setupEventListeners();
    
    // Vérifier le fichier words.json au démarrage
    const isWordsFileValid = await checkWordsFile();
    if (!isWordsFileValid) {
        showMessage('Erreur: Impossible de charger le fichier words.json', 'error');
        elements.startBtn.disabled = true;
    }
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    elements.startBtn.addEventListener('click', startGame);
    elements.resetBtn.addEventListener('click', resetGame);
    elements.helpBtn.addEventListener('click', provideHint);
    elements.pauseBtn.addEventListener('click', togglePause);
    elements.levelSelect.addEventListener('change', () => {
        gameState.gridSize = parseInt(elements.levelSelect.value);
    });
    elements.instructionsBtn.addEventListener('click', showInstructions);
    elements.closeModalBtn.addEventListener('click', hideInstructions);
    elements.progressBtn.addEventListener('click', showProgress);
    elements.progressCloseBtn.addEventListener('click', hideProgress);
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    elements.nextLevelBtn.addEventListener('click', startNextLevel);
    elements.replayLevelBtn.addEventListener('click', replayLevel);
    window.addEventListener('click', (e) => {
        if (e.target === elements.instructionsModal) {
            hideInstructions();
        }
        if (e.target === elements.progressModal) {
            hideProgress();
        }
    });
}

// Démarrage du jeu
async function startGame() {
    try {
        // Désactiver les contrôles pendant le chargement
        elements.startBtn.disabled = true;
        elements.levelSelect.disabled = true;
        elements.themeSelect.disabled = true;

        const words = await fetchWords();
        if (!words || words.length === 0) {
            throw new Error('Aucun mot n\'a été chargé');
        }
        
        // Initialiser le jeu avec les mots
        gameState.wordList = words;
        adjustDifficulty();
        
        if (gameState.wordList.length === 0) {
            throw new Error('Aucun mot disponible après ajustement de la difficulté');
        }

        elements.totalDisplay.textContent = gameState.wordList.length;
        
        createGameBoard();
        startTimer();
        updateWordList();

        // Initialiser le mode de jeu
        initGameMode();
        
        showMessage(`Niveau ${gameState.level} - Bonne chance !`, 'info');
        
    } catch (error) {
        console.error('Erreur lors du démarrage du jeu:', error);
        showMessage(`Erreur lors du démarrage du jeu: ${error.message}`, 'error');
        
        // Réactiver les contrôles en cas d'erreur
        elements.startBtn.disabled = false;
        elements.levelSelect.disabled = false;
        elements.themeSelect.disabled = false;
    }
}

// Récupération des mots depuis le fichier JSON
async function fetchWords() {
    try {
        const response = await fetch('./words.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const selectedTheme = elements.themeSelect.value;
        
        // Vérifier si le thème existe et contient des mots
        if (!data[selectedTheme] || !Array.isArray(data[selectedTheme])) {
            throw new Error(`Thème "${selectedTheme}" non trouvé ou invalide`);
        }
        
        return data[selectedTheme];
    } catch (error) {
        console.error('Erreur lors du chargement des mots:', error);
        showMessage('Erreur lors du chargement des mots. Vérifiez que words.json est accessible.', 'error');
        return null;
    }
}

// Création de la grille de jeu
function createGameBoard() {
    const table = document.createElement('table');
    const size = gameState.gridSize;

    for (let i = 0; i < size; i++) {
        const row = document.createElement('tr');
        for (let j = 0; j < size; j++) {
            const cell = document.createElement('td');
            cell.classList.add('empty');
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('mousedown', startSelection);
            cell.addEventListener('mouseover', continueSelection);
            cell.addEventListener('mouseup', endSelection);
            row.appendChild(cell);
        }
        table.appendChild(row);
    }

    elements.wordBoard.innerHTML = '';
    elements.wordBoard.appendChild(table);
    placeWords();
    fillEmptyCells(table);
}

// Placement des mots dans la grille
function placeWords() {
    const directions = [
        [0, 1],   // horizontal
        [1, 0],   // vertical
        [1, 1],   // diagonal
        [-1, 1],  // diagonal inverse
    ];

    const table = elements.wordBoard.querySelector('table');
    if (!table) return;

    // Trier les mots par longueur décroissante
    const sortedWords = [...gameState.wordList].sort((a, b) => b.length - a.length);
    const unplacedWords = [];

    sortedWords.forEach(word => {
        let placed = false;
        let bestPlacement = null;
        let maxOverlap = -1;

        // Essayer toutes les positions possibles
        for (const direction of directions) {
            for (let row = 0; row < gameState.gridSize; row++) {
                for (let col = 0; col < gameState.gridSize; col++) {
                    const placement = {
                        word,
                        direction,
                        startPos: { row, col },
                        overlap: calculateOverlap(table, word, { row, col }, direction)
                    };

                    if (canPlaceWord(table, word, placement.startPos, direction) &&
                        placement.overlap > maxOverlap) {
                        maxOverlap = placement.overlap;
                        bestPlacement = placement;
                        placed = true;
                    }
                }
            }
        }

        if (placed && bestPlacement) {
            placeWordInGrid(table, bestPlacement.word, bestPlacement.startPos, bestPlacement.direction);
        } else {
            unplacedWords.push(word);
        }
    });

    // Si des mots n'ont pas pu être placés, recommencer avec une nouvelle grille
    if (unplacedWords.length > 0) {
        console.warn('Mots non placés, nouvelle tentative:', unplacedWords);
        elements.wordBoard.innerHTML = '';
        createGameBoard();
        return;
    }
}

// Ajouter une fonction pour calculer le chevauchement des mots
function calculateOverlap(table, word, startPos, direction) {
    const [dy, dx] = direction;
    const { row, col } = startPos;
    let overlap = 0;

    // Vérifier si le mot peut être placé à cette position
    if (!isValidPosition(word, startPos, direction)) {
        return -1;
    }

    for (let i = 0; i < word.length; i++) {
        const currentRow = row + (dy * i);
        const currentCol = col + (dx * i);
        const cell = table.rows[currentRow]?.cells[currentCol];

        if (cell && cell.textContent === word[i]) {
            overlap++;
        }
    }

    return overlap;
}

// Ajouter une fonction pour vérifier si la position est valide
function isValidPosition(word, startPos, direction) {
    const [dy, dx] = direction;
    const { row, col } = startPos;
    const endRow = row + (dy * (word.length - 1));
    const endCol = col + (dx * (word.length - 1));

    return endRow >= 0 && 
           endRow < gameState.gridSize && 
           endCol >= 0 && 
           endCol < gameState.gridSize;
}

// Modifier la fonction canPlaceWord pour être plus précise
function canPlaceWord(table, word, startPos, direction) {
    const [dy, dx] = direction;
    const { row, col } = startPos;

    if (!isValidPosition(word, startPos, direction)) {
        return false;
    }

    for (let i = 0; i < word.length; i++) {
        const currentRow = row + (dy * i);
        const currentCol = col + (dx * i);
        const cell = table.rows[currentRow].cells[currentCol];
        
        if (cell.textContent !== '' && 
            cell.textContent !== word[i] && 
            cell.classList.contains('placed')) {
            return false;
        }
    }
    return true;
}

// Placer le mot dans la grille
function placeWordInGrid(table, word, startPos, direction) {
    const [dy, dx] = direction;
    const { row, col } = startPos;

    for (let i = 0; i < word.length; i++) {
        const currentRow = row + (dy * i);
        const currentCol = col + (dx * i);
        const cell = table.rows[currentRow].cells[currentCol];
        cell.textContent = word[i];
        cell.classList.add('placed');
    }
}

// Remplir les cellules vides avec des lettres aléatoires
function fillEmptyCells(table) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < gameState.gridSize; i++) {
        for (let j = 0; j < gameState.gridSize; j++) {
            const cell = table.rows[i].cells[j];
            if (!cell.classList.contains('placed')) {
                cell.textContent = letters[Math.floor(Math.random() * letters.length)];
            }
        }
    }
}

// Gestion de la sélection des lettres
function startSelection(e) {
    if (gameState.isPaused) return;
    gameState.selectedCells = [e.target];
    gameState.currentWord = e.target.textContent;
    e.target.classList.add('selecting');
}

function continueSelection(e) {
    if (!gameState.selectedCells.length || gameState.isPaused) return;
    
    const cell = e.target;
    const lastCell = gameState.selectedCells[gameState.selectedCells.length - 1];
    
    // Vérifier si la cellule est adjacente à la dernière cellule sélectionnée
    const rowDiff = Math.abs(cell.dataset.row - lastCell.dataset.row);
    const colDiff = Math.abs(cell.dataset.col - lastCell.dataset.col);
    
    if ((rowDiff <= 1 && colDiff <= 1) && !gameState.selectedCells.includes(cell)) {
        gameState.selectedCells.push(cell);
        gameState.currentWord += cell.textContent;
        cell.classList.add('selecting');
    }
}

function endSelection() {
    if (gameState.isPaused) return;
    
    const selectedWord = gameState.currentWord;
    if (gameState.wordList.includes(selectedWord) && !gameState.foundWords.has(selectedWord)) {
        handleWordFound(selectedWord);
    } else if (selectedWord.length > 1) {
        playSound('error');
        showMessage('Essayez encore !', 'error');
    }

    gameState.selectedCells.forEach(cell => cell.classList.remove('selecting'));
    gameState.selectedCells = [];
    gameState.currentWord = '';
}

// Gestion des mots trouvés
function handleWordFound(word) {
    gameState.foundWords.add(word);
    gameState.score += word.length * 10;
    
    // Ajouter une animation aux cellules du mot trouvé
    gameState.selectedCells.forEach(cell => {
        cell.classList.add('found-animation');
        setTimeout(() => cell.classList.remove('found-animation'), 1000);
    });
    
    playSound('success');
    updateScoreDisplay();
    updateWordList();
    showMessage(`Mot trouvé : ${word} !`, 'success');
    
    if (gameState.foundWords.size === gameState.wordList.length) {
        playSound('complete');
        createConfetti();
        saveGameState();
        
        // Mettre à jour la progression
        gameState.progression.updateProgress({
            score: gameState.score,
            time: gameState.timeElapsed,
            perfectStreak: gameState.foundWords.size,
            theme: elements.themeSelect.value,
            level: gameState.level
        });
        
        showSuccessModal();
    }
}

// Fonctions utilitaires
function updateScoreDisplay() {
    elements.scoreDisplay.textContent = gameState.score;
    elements.foundDisplay.textContent = gameState.foundWords.size;
}

function updateWordList() {
    elements.wordList.innerHTML = gameState.wordList
        .map(word => `
            <span class="word-item ${gameState.foundWords.has(word) ? 'found' : ''}">
                ${word}
            </span>
        `)
        .join('');
}

function showMessage(message, type = 'info', duration = 3000) {
    elements.messageBox.innerHTML = message.replace(/\n/g, '<br>');
    elements.messageBox.className = `message-box message-${type}`;
    setTimeout(() => elements.messageBox.textContent = '', duration);
}

// Gestion du timer
function startTimer() {
    gameState.timer = setInterval(() => {
        if (!gameState.isPaused) {
            gameState.timeElapsed++;
            updateTimerDisplay();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(gameState.timeElapsed / 60);
    const seconds = gameState.timeElapsed % 60;
    elements.timerDisplay.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Fonctions de contrôle du jeu
function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    elements.pauseBtn.textContent = gameState.isPaused ? '▶️' : '⏸️';
    elements.pauseBtn.setAttribute('data-paused', gameState.isPaused);
    elements.wordBoard.style.opacity = gameState.isPaused ? '0.5' : '1';
    
    // Mettre en pause les sons si nécessaire
    Object.values(sounds).forEach(sound => {
        if (sound && typeof sound.pause === 'function') {
            if (gameState.isPaused) sound.pause();
        }
    });
}

function provideHint() {
    const unFoundWords = gameState.wordList.filter(word => !gameState.foundWords.has(word));
    if (unFoundWords.length) {
        const randomWord = unFoundWords[Math.floor(Math.random() * unFoundWords.length)];
        showMessage(`Indice : Cherchez le mot "${randomWord}"`, 'info');
        gameState.score -= 5; // Pénalité pour l'utilisation d'un indice
        updateScoreDisplay();
    }
}

function endGame() {
    clearInterval(gameState.timer);
    elements.startBtn.disabled = false;
    elements.levelSelect.disabled = false;
    elements.themeSelect.disabled = false;
}

function handleLevelComplete() {
    clearInterval(gameState.timer); // Arrêter le timer actuel
    
    const timeBonus = Math.max(0, 300 - gameState.timeElapsed) * 2;
    const levelScore = gameState.score + timeBonus;
    gameState.totalScore += levelScore;
    
    if (gameState.totalScore > gameState.highScore) {
        gameState.highScore = gameState.totalScore;
        localStorage.setItem('highScore', gameState.highScore);
    }

    showMessage(`
        Niveau ${gameState.level} complété!
        Score du niveau: ${levelScore}
        Bonus temps: ${timeBonus}
        Score total: ${gameState.totalScore}
    `, 'success', 5000);

    gameState.level++;
    
    // Réinitialiser le score du niveau et le temps
    gameState.score = 0;
    gameState.timeElapsed = 0;
    gameState.foundWords.clear();
    
    // Augmenter la difficulté
    if (gameState.level % 2 === 0 && gameState.gridSize < 10) {
        gameState.gridSize += 2;
    }
    
    setTimeout(() => {
        startGame();
    }, 5000);
}

function resetGame() {
    clearInterval(gameState.timer);
    clearInterval(gameState.countdownTimer);
    gameState.level = 1;
    gameState.totalScore = 0;
    gameState.highScore = localStorage.getItem('highScore') || 0;
    resetGameState();
    elements.wordBoard.innerHTML = '';
    elements.wordList.innerHTML = '';
    elements.startBtn.disabled = false;
    elements.levelSelect.disabled = false;
    elements.themeSelect.disabled = false;
    updateScoreDisplay();
    updateTimerDisplay();
    localStorage.removeItem('gameProgress'); // Effacer la sauvegarde
    gameState.countdownTime = 180;
    elements.countdownDisplay.classList.remove('warning', 'danger');
    elements.countdownDisplay.classList.add('hidden');
}

function resetGameState() {
    const currentLevel = gameState.level; // Sauvegarder le niveau actuel
    
    gameState.timer = null;
    gameState.timeElapsed = 0;
    gameState.score = 0;
    gameState.foundWords.clear();
    gameState.isPaused = false;
    gameState.selectedCells = [];
    gameState.currentWord = '';
    gameState.wordList = [];
    
    gameState.level = currentLevel; // Restaurer le niveau
}

// Ajouter ces fonctions
function saveGameState() {
    const saveData = {
        level: gameState.level,
        totalScore: gameState.totalScore,
        highScore: gameState.highScore,
        timeElapsed: gameState.timeElapsed
    };
    localStorage.setItem('gameProgress', JSON.stringify(saveData));
}

function loadGameState() {
    const savedData = localStorage.getItem('gameProgress');
    if (savedData) {
        const data = JSON.parse(savedData);
        gameState.level = data.level;
        gameState.totalScore = data.totalScore;
        gameState.highScore = data.highScore;
        gameState.timeElapsed = data.timeElapsed;
        updateScoreDisplay();
        updateTimerDisplay();
    }
}

// Modifier la fonction adjustDifficulty pour mieux gérer la taille des mots
function adjustDifficulty() {
    const level = gameState.level;
    
    // Ajuster la taille de la grille en fonction du niveau
    if (level <= 3) gameState.gridSize = 4;
    else if (level <= 6) gameState.gridSize = 6;
    else if (level <= 9) gameState.gridSize = 8;
    else gameState.gridSize = 10;
    
    // Filtrer les mots qui peuvent tenir dans la grille
    const validWords = gameState.wordList.filter(word => word.length <= gameState.gridSize);
    
    if (validWords.length === 0) {
        throw new Error('Aucun mot ne peut être placé dans la grille de cette taille');
    }

    // Calculer le nombre de mots pour ce niveau
    const minWords = Math.max(3, Math.floor(3 + level * 0.5));
    const maxWords = Math.min(minWords, validWords.length);
    
    // Sélectionner les mots pour ce niveau
    gameState.wordList = validWords
        .sort(() => Math.random() - 0.5)
        .slice(0, maxWords);
}

// Modifier la fonction playSound pour gérer le chargement des sons
function playSound(soundName) {
    if (!gameState.soundEnabled || !sounds[soundName]) return;
    
    try {
        const sound = sounds[soundName];
        if (sound && sound.readyState >= 2) { // Vérifier si le son est chargé
            sound.currentTime = 0;
            sound.play().catch(err => {
                console.warn('Erreur de lecture du son:', err);
                gameState.soundEnabled = false;
            });
        }
    } catch (error) {
        console.warn('Erreur avec le son:', error);
        gameState.soundEnabled = false;
    }
}

// Ajouter une fonction pour précharger les sons
function preloadSounds() {
    Object.values(sounds).forEach(sound => {
        sound.load();
        // Ajouter des gestionnaires d'erreur pour chaque son
        sound.onerror = () => {
            console.warn('Erreur de chargement du son');
            gameState.soundEnabled = false;
        };
    });
}

// Ajouter une fonction de vérification du fichier words.json
async function checkWordsFile() {
    try {
        const response = await fetch('./words.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Vérifier que tous les thèmes du select existent dans le fichier
        const themes = Array.from(elements.themeSelect.options).map(option => option.value);
        const missingThemes = themes.filter(theme => !data[theme]);
        
        if (missingThemes.length > 0) {
            console.warn('Thèmes manquants dans words.json:', missingThemes);
        }
        
        return true;
    } catch (error) {
        console.error('Erreur lors de la vérification de words.json:', error);
        return false;
    }
}

// Ajouter ces nouvelles fonctions
function showInstructions() {
    elements.instructionsModal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Empêcher le défilement
}

function hideInstructions() {
    elements.instructionsModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Réactiver le défilement
}

// Ajouter un gestionnaire d'échap pour fermer la modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.instructionsModal.style.display === 'block') {
        hideInstructions();
    }
});

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', initGame);

// Ajouter la fonction d'initialisation du mode de jeu
function initGameMode() {
    gameState.gameMode = elements.gameMode.value;
    
    // Réinitialiser les timers
    clearInterval(gameState.timer);
    clearInterval(gameState.countdownTimer);
    
    switch(gameState.gameMode) {
        case 'timeAttack':
            elements.countdownDisplay.classList.remove('hidden');
            startCountdown();
            break;
        case 'zen':
            // Mode zen : pas de timer
            elements.countdownDisplay.classList.add('hidden');
            elements.timerDisplay.parentElement.classList.add('hidden');
            break;
        case 'challenge':
            // Mode challenge : temps réduit
            elements.countdownDisplay.classList.remove('hidden');
            gameState.countdownTime = 120; // 2 minutes
            startCountdown();
            break;
        default:
            // Mode classique
            elements.countdownDisplay.classList.add('hidden');
            startTimer();
    }
}

// Ajouter la fonction de compte à rebours
function startCountdown() {
    updateCountdownDisplay();
    gameState.countdownTimer = setInterval(() => {
        if (!gameState.isPaused) {
            gameState.countdownTime--;
            updateCountdownDisplay();
            
            // Avertissements sonores et visuels
            if (gameState.countdownTime === 30) {
                elements.countdownDisplay.classList.add('warning');
                if (gameState.soundEnabled) playSound('countdown');
            }
            if (gameState.countdownTime === 10) {
                elements.countdownDisplay.classList.remove('warning');
                elements.countdownDisplay.classList.add('danger');
                if (gameState.soundEnabled) playSound('countdown');
            }
            
            // Temps écoulé
            if (gameState.countdownTime <= 0) {
                clearInterval(gameState.countdownTimer);
                if (gameState.soundEnabled) playSound('timeOver');
                handleTimeOver();
            }
        }
    }, 1000);
}

// Ajouter la fonction de mise à jour de l'affichage du compte à rebours
function updateCountdownDisplay() {
    const minutes = Math.floor(gameState.countdownTime / 60);
    const seconds = gameState.countdownTime % 60;
    elements.countdown.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Ajouter la fonction de gestion de fin de temps
function handleTimeOver() {
    gameState.isPaused = true;
    showMessage('Temps écoulé !', 'error');
    
    // Calculer le score final
    const wordsFound = gameState.foundWords.size;
    const totalWords = gameState.wordList.length;
    const finalScore = Math.round((wordsFound / totalWords) * gameState.score);
    
    setTimeout(() => {
        showMessage(`
            Temps écoulé !
            Mots trouvés : ${wordsFound}/${totalWords}
            Score final : ${finalScore}
        `, 'info', 5000);
        
        // Sauvegarder le score si c'est un meilleur score
        if (finalScore > gameState.highScore) {
            gameState.highScore = finalScore;
            localStorage.setItem('highScore', finalScore);
            showMessage('Nouveau meilleur score !', 'success');
        }
    }, 1000);
}

// Ajouter les fonctions de gestion de la modal de progression
function showProgress() {
    elements.progressModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    // Mettre à jour les données de progression avant d'afficher
    gameState.progression.updateAll();
}

function hideProgress() {
    elements.progressModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Modifier la classe ProgressionSystem pour ajouter toutes les méthodes nécessaires
export class ProgressionSystem {
    constructor() {
        this.playerData = this.loadPlayerData();
        this.initializeUI();
    }

    loadPlayerData() {
        const savedData = localStorage.getItem('playerProgress') || '{}';
        return JSON.parse(savedData);
    }

    savePlayerData() {
        localStorage.setItem('playerProgress', JSON.stringify(this.playerData));
    }

    initializeUI() {
        this.updateRank();
        this.displayAchievements();
        this.displayLeaderboard();
    }

    updateProgress(gameData) {
        // Mettre à jour les statistiques du joueur
        if (!this.playerData.stats) {
            this.playerData.stats = {
                totalScore: 0,
                gamesPlayed: 0,
                themesPlayed: [], // Initialiser comme tableau vide
                bestTimes: {}
            };
        }

        // S'assurer que themesPlayed est un tableau
        if (!Array.isArray(this.playerData.stats.themesPlayed)) {
            this.playerData.stats.themesPlayed = [];
        }

        // Mettre à jour les statistiques
        this.playerData.stats.totalScore += gameData.score;
        this.playerData.stats.gamesPlayed++;
        
        // Ajouter le thème s'il n'existe pas déjà
        if (!this.playerData.stats.themesPlayed.includes(gameData.theme)) {
            this.playerData.stats.themesPlayed.push(gameData.theme);
        }

        // Sauvegarder le meilleur temps pour ce niveau
        const levelKey = `level${gameData.level}`;
        if (!this.playerData.stats.bestTimes[levelKey] || 
            gameData.time < this.playerData.stats.bestTimes[levelKey]) {
            this.playerData.stats.bestTimes[levelKey] = gameData.time;
        }

        // Mettre à jour le score dans le tableau des scores
        if (!this.playerData.scores) {
            this.playerData.scores = [];
        }
        
        this.playerData.scores.push({
            score: gameData.score,
            theme: gameData.theme,
            level: gameData.level,
            time: gameData.time,
            date: new Date().toISOString()
        });

        this.savePlayerData();
        this.updateAll();
    }

    updateRank() {
        const totalScore = this.playerData.stats?.totalScore || 0;
        const ranks = [
            { name: 'Débutant', icon: '🌱', minScore: 0 },
            { name: 'Apprenti', icon: '🌿', minScore: 1000 },
            { name: 'Expert', icon: '🌳', minScore: 5000 },
            { name: 'Maître', icon: '🌟', minScore: 10000 },
            { name: 'Légende', icon: '👑', minScore: 20000 }
        ];

        const currentRank = ranks.reduce((prev, curr) => 
            totalScore >= curr.minScore ? curr : prev, ranks[0]);
        const nextRank = ranks.find(rank => rank.minScore > totalScore);

        document.getElementById('rankIcon').textContent = currentRank.icon;
        document.getElementById('rankName').textContent = currentRank.name;
        
        if (nextRank) {
            const progress = ((totalScore - currentRank.minScore) / 
                (nextRank.minScore - currentRank.minScore)) * 100;
            document.getElementById('rankProgress').style.width = `${progress}%`;
            document.getElementById('nextRank').textContent = nextRank.name;
        }
    }

    displayAchievements() {
        const achievements = {
            wordMaster: {
                title: '🎯 Maître des Mots',
                levels: [100, 500, 1000]
            },
            speedster: {
                title: '⚡ Éclair',
                levels: [60, 30, 15]
            },
            perfectionist: {
                title: '✨ Perfectionniste',
                levels: [3, 5, 10]
            }
        };

        const achievementsList = document.getElementById('achievements-list');
        achievementsList.innerHTML = Object.entries(achievements)
            .map(([id, achievement]) => {
                const currentLevel = this.playerData.achievements?.[id] || 0;
                const nextLevel = achievement.levels[currentLevel];
                return `
                    <div class="achievement-card ${nextLevel ? '' : 'locked'}">
                        <div class="achievement-icon">
                            ${currentLevel > 0 ? '🏆' : '🔒'}
                        </div>
                        <div class="achievement-title">${achievement.title}</div>
                        <div class="achievement-progress">
                            ${nextLevel ? `Niveau ${currentLevel + 1}` : 'Complété!'}
                        </div>
                    </div>
                `;
            }).join('');
    }

    displayLeaderboard() {
        const leaderboardList = document.getElementById('leaderboard-list');
        const scores = this.playerData.scores || [];
        
        leaderboardList.innerHTML = scores
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map((score, index) => `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank">${index + 1}</div>
                    <div class="leaderboard-info">
                        <div>${score.theme}</div>
                        <div class="leaderboard-date">
                            ${new Date(score.date).toLocaleDateString()}
                        </div>
                    </div>
                    <div class="leaderboard-score">${score.score}</div>
                </div>
            `).join('') || '<div class="no-scores">Pas encore de scores</div>';
    }

    updateAll() {
        this.updateRank();
        this.displayAchievements();
        this.displayLeaderboard();
    }
}

// Ajouter un gestionnaire d'échap pour la modal de progression
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (elements.progressModal.style.display === 'block') {
            hideProgress();
        }
    }
});

// Fonction pour gérer le thème
function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    elements.themeToggleBtn.textContent = isDark ? '🌓' : '🌙';
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Fonction pour créer l'effet de confetti
function createConfetti() {
    const colors = ['#60a5fa', '#34d399', '#f59e0b', '#ec4899', '#8b5cf6'];
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 2000);
    }
}

// Ajouter la fonction pour afficher la modal de succès
function showSuccessModal() {
    clearInterval(gameState.timer);
    clearInterval(gameState.countdownTimer);
    
    // Mettre à jour les statistiques
    elements.finalScore.textContent = gameState.score;
    elements.finalTime.textContent = formatTime(gameState.timeElapsed);
    elements.finalWords.textContent = `${gameState.foundWords.size}/${gameState.wordList.length}`;
    
    // Afficher la modal
    elements.successModal.style.display = 'block';
}

// Ajouter la fonction pour passer au niveau suivant
function startNextLevel() {
    gameState.level++;
    elements.successModal.style.display = 'none';
    resetGameState();
    startGame();
}

// Ajouter la fonction pour rejouer le niveau
function replayLevel() {
    elements.successModal.style.display = 'none';
    resetGameState();
    startGame();
}

// Ajouter la fonction formatTime
function formatTime(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
