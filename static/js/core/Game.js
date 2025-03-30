import { MagicSystem } from './MagicSystem.js';
import { SpellSystem } from './SpellSystem.js';
import { ChoiceSystem } from './ChoiceSystem.js';
import { loadBackground, updateStatsDisplay, showError } from '../utils/helpers.js';

export class Game {
    constructor() {
        this.states = this.initialGameState();
        this.systems = this.initializeSystems();
        this.currentChapterData = null;
        this.choiceTimers = new Map();
        this.preloadConfig = {
            backgrounds: ['main_menu.webp', 'village_doomsday.webp']
        };
        
        this.preloadBackgrounds();
    }

    initialGameState() {
        return {
            currentChapter: 'chapter1',
            magic: 0,
            lira_trust: 0,
            kyle_trust: 0,
            elina_trust: 0,
            moral: 50,
            gold: 10,
            health: 100,
            inventory: [],
            endings_unlocked: [],
            willpower: 5,
            persuasion: 0,
            intimidation: 0,
            revealedChapters: [],
            fate: 0,
            sanity: 10,
            church_hostility: 0,
            combat_skill: 0,
            insight: 0
        };
    }

    initializeSystems() {
        return {
            magic: new MagicSystem(this),
            spell: new SpellSystem(this),
            choice: new ChoiceSystem(this)
        };
    }

    async loadChapter(chapterId) {
        try {
            const path = this.getChapterPath(chapterId);
            const response = await fetch(`${path}?t=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            
            this.currentChapterData = await response.json();
            this.validateChapterData();
            
            this.states.currentChapter = chapterId;
            await this.renderChapter();
        } catch (error) {
            this.handleLoadingError(error);
            throw error;
        }
    }

    getChapterPath(chapterId) {
        return chapterId.startsWith('ending_') 
            ? `/endings/${chapterId}.json` 
            : `/chapters/${chapterId}.json`;
    }

    validateChapterData() {
        if (!this.currentChapterData) {
            throw new Error('Не удалось загрузить данные главы');
        }
        
        if (!this.currentChapterData.text) {
            throw new Error('Глава не содержит текста');
        }
    }

    handleLoadingError(error) {
        console.error('Ошибка загрузки:', error);
        showError(`Ошибка загрузки: ${error.message}`);
        document.getElementById('main-menu')?.classList.remove('hidden');
        document.getElementById('game-container')?.classList.add('hidden');
    }

    async renderChapter() {
        try {
            const textDisplay = document.getElementById('text-display');
            const choicesBox = document.getElementById('choices');

            this.clearChoiceTimers();
            await this.loadBackground(this.currentChapterData.background);
            
            textDisplay.innerHTML = '<div class="text-content"></div>';
            await this.typewriterEffect(this.currentChapterData.text);
            
            this.systems.choice.showChoices(
                this.currentChapterData.choices || [],
                choicesBox
            );
            
            updateStatsDisplay(this.states);
        } catch (error) {
            this.handleRenderingError(error);
        }
    }

    async typewriterEffect(text) {
        return new Promise(resolve => {
            const contentDiv = document.querySelector('#text-display .text-content');
            let index = 0;
            
            const animate = () => {
                if (index < text.length) {
                    contentDiv.innerHTML = `${text.substring(0, index + 1)}
                        <span class="typewriter-cursor">|</span>`;
                    index++;
                    setTimeout(animate, 30 + Math.random() * 20);
                } else {
                    contentDiv.innerHTML = text;
                    resolve();
                }
            };
            
            animate();
        });
    }

    handleRenderingError(error) {
        console.error('Ошибка рендеринга:', error);
        showError(`Ошибка отображения главы: ${error.message}`);
        this.loadChapter('chapter1').catch(console.error);
    }

    clearChoiceTimers() {
        this.choiceTimers.forEach(timer => clearTimeout(timer));
        this.choiceTimers.clear();
    }

    preloadBackgrounds() {
        this.preloadConfig.backgrounds.forEach(bg => {
            new Image().src = `/backgrounds/${bg}`;
        });
    }
}