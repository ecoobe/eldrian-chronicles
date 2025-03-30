import { MagicSystem } from './MagicSystem.js';
import { SpellSystem } from './SpellSystem.js';
import { ChoiceSystem } from './ChoiceSystem.js';
import { loadBackground, updateStatsDisplay, showError } from '../utils/helpers.js';

export class Game {
    constructor() {
        this.states = {
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

        this.systems = {
            magic: new MagicSystem(this),
            spell: new SpellSystem(this),
            choice: new ChoiceSystem(this)
        };

        this.currentChapterData = null;
        this.choiceTimers = new Map();
        this.preloadBackgrounds();
    }

    async loadChapter(chapterId) {
        try {
            const path = chapterId.startsWith('ending_') 
                ? `/endings/${chapterId}.json` 
                : `/chapters/${chapterId}.json`;

            const response = await fetch(`${path}?t=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            
            this.currentChapterData = await response.json();
            this.states.currentChapter = chapterId;
            await this.renderChapter();
        } catch (error) {
            showError(`Ошибка загрузки: ${error.message}`);
            throw error;
        }
    }

    async renderChapter() {
        const textDisplay = document.getElementById('text-display');
        const choicesBox = document.getElementById('choices');

        // Сброс состояния
        this.clearChoiceTimers();
        
        // Загрузка фона
        await loadBackground(this.currentChapterData?.background);

        // Отображение текста
        textDisplay.innerHTML = '<div class="text-content"></div>';
        await this.typewriterEffect(this.currentChapterData.text);

        // Обработка выбора
        this.systems.choice.showChoices(
            this.currentChapterData.choices || [],
            choicesBox
        );

        updateStatsDisplay(this.states);
    }

    typewriterEffect(text) {
        return new Promise(resolve => {
            const contentDiv = document.querySelector('#text-display .text-content');
            let index = 0;
            
            const animate = () => {
                if (index < text.length) {
                    contentDiv.innerHTML = text.substring(0, index + 1) + 
                        '<span class="typewriter-cursor">|</span>';
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

    clearChoiceTimers() {
        this.choiceTimers.forEach(timer => clearTimeout(timer));
        this.choiceTimers.clear();
    }

    preloadBackgrounds() {
        ['main_menu.webp', 'village_doomsday.webp'].forEach(bg => {
            new Image().src = `/backgrounds/${bg}`;
        });
    }
}