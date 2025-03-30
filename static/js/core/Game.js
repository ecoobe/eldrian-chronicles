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
			console.log('Loading chapter from:', path); // Логирование пути
			
			const response = await fetch(`${path}?t=${Date.now()}`);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${await response.text()}`);
			}
	
			const rawData = await response.text();
			console.log('Raw response:', rawData); // Логирование сырых данных
			
			this.currentChapterData = JSON.parse(rawData);
			this.validateChapterData();
			
			this.states.currentChapter = chapterId;
			await this.renderChapter();
		} catch (error) {
			console.error('Full error details:', error); // Детальное логирование
			this.handleLoadingError(error);
		}
	}

    getChapterPath(chapterId) {
        return chapterId.startsWith('ending_') 
            ? `/endings/${chapterId}.json` 
            : `/chapters/${chapterId}.json`;
    }

    validateChapterData() {
        const requiredFields = ['id', 'text', 'background'];
        
        if (!this.currentChapterData) {
            throw new Error('Chapter data is empty');
        }
        
        const missingFields = requiredFields.filter(field => !(field in this.currentChapterData));
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
    }

    handleLoadingError(error) {
        console.error('Loading error:', error);
        showError(`Loading failed: ${error.message}`);
        document.getElementById('main-menu')?.classList.remove('hidden');
        document.getElementById('game-container')?.classList.add('hidden');
    }

    async renderChapter() {
        try {
            const textDisplay = document.getElementById('text-display');
            const choicesBox = document.getElementById('choices');

            this.clearChoiceTimers();
            await loadBackground(this.currentChapterData.background);
            
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
            let lastUpdate = 0;
            
            const animate = (timestamp) => {
                if (index >= text.length) {
                    contentDiv.textContent = text;
                    resolve();
                    return;
                }

                if (timestamp - lastUpdate > 30) {
                    contentDiv.textContent = text.substring(0, index + 1);
                    index++;
                    lastUpdate = timestamp;
                }

                requestAnimationFrame(animate);
            };

            requestAnimationFrame(animate);
        });
    }

    handleRenderingError(error) {
        console.error('Rendering error:', error);
        showError(`Rendering error: ${error.message}`);
        this.loadChapter('chapter1').catch(console.error);
    }

    clearChoiceTimers() {
        this.choiceTimers.forEach(timer => clearTimeout(timer));
        this.choiceTimers.clear();
    }

    preloadBackgrounds() {
        this.preloadConfig.backgrounds.forEach(bg => {
            const img = new Image();
            img.onerror = () => console.error(`Failed to preload background: ${bg}`);
            img.src = `/backgrounds/${bg}`;
        });
    }
}