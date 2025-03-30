import { Game } from './core/Game.js';

const game = new Game();

document.getElementById('start-game-btn').addEventListener('click', () => {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    game.loadChapter('chapter1');
});