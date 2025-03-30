import { Game } from './core/Game.js';

const game = new Game();

function initGame() {
    const mainMenu = document.getElementById('main-menu');
    const gameContainer = document.getElementById('game-container');
    
    if (!mainMenu || !gameContainer) {
        console.error('Critical DOM elements missing!');
        return;
    }

    mainMenu.classList.add('hidden');
    gameContainer.classList.remove('hidden');

    game.loadChapter('chapter1')
        .catch(error => {
            console.error('Game initialization failed:', error);
            mainMenu.classList.remove('hidden');
            gameContainer.classList.add('hidden');
        });
}

document.getElementById('start-game-btn').addEventListener('click', initGame);
document.getElementById('endings-btn').addEventListener('click', () => {
    // Реализация галереи концовок
});