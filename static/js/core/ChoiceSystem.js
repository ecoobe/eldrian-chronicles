import { 
    showError, 
    updateStatsDisplay, 
    showDialogue, 
    updateCharacterSprite 
} from '../utils/helpers.js';

export class ChoiceSystem {
    constructor(game) {
        this.game = game;
        this.activeChoices = new Set();
        this.mathClamp = (num, min, max) => Math.min(Math.max(num, min), max);
    }

    showChoices(choices, container) {
        try {
            this.validateContainer(container);
            this.clearPreviousChoices();
            
            const filteredChoices = this.filterAvailableChoices(choices);
            
            if (filteredChoices.length === 0) {
                this.showFallbackChoice(container);
                return;
            }

            this.renderChoices(filteredChoices, container);
        } catch (error) {
            this.handleChoiceError(error, container);
        }
    }

    validateContainer(container) {
        if (!(container instanceof HTMLElement)) {
            throw new Error('Invalid choices container element');
        }
    }

    clearPreviousChoices() {
        this.activeChoices.forEach(choice => {
            choice.button.removeEventListener('click', choice.handler);
        });
        this.activeChoices.clear();
    }

    filterAvailableChoices(choices) {
        return choices.filter(choice => 
            this.checkRequirements(choice.requirements || {}) &&
            this.validateChoiceStructure(choice)
        );
    }

    validateChoiceStructure(choice) {
        const isValid = Boolean(
            choice.text &&
            (choice.next || choice.reveal || choice.effects)
        );
        
        if (!isValid) {
            console.warn('Invalid choice structure:', choice);
        }
        return isValid;
    }

    renderChoices(choices, container) {
        choices.forEach((choice, index) => {
            const button = this.createChoiceButton(choice);
            this.animateButtonAppearance(button, index);
            container.appendChild(button);
            this.registerChoice(choice, button);
        });
    }

    createChoiceButton(choice) {
        const button = document.createElement('button');
        button.className = 'choice-btn';
        button.textContent = choice.text;
        button.dataset.choiceId = choice.id || crypto.randomUUID();
        
        if (choice.hidden) {
            button.classList.add('hidden-choice');
        }
        
        return button;
    }

    animateButtonAppearance(button, index) {
        requestAnimationFrame(() => {
            button.style.transitionDelay = `${index * 100}ms`;
            button.classList.add('visible');
        });
    }

    registerChoice(choice, button) {
        const handler = () => this.processChoice(choice);
        button.addEventListener('click', handler);
        this.activeChoices.add({ button, handler });
    }

    async processChoice(choice) {
        try {
            this.applyChoiceEffects(choice.effects || {});
            this.handleCharacterReaction(choice);
            await this.handleChoiceOutcome(choice);
        } catch (error) {
            showError(`Ошибка обработки выбора: ${error.message}`);
        }
    }

    handleCharacterReaction(choice) {
        try {
            const chapterData = this.game.currentChapterData;
            if (!chapterData) return;

            // Обработка основных персонажей
            if (choice.characters?.length && chapterData.characters?.main) {
                choice.characters.forEach(charId => {
                    const character = chapterData.characters.main.find(c => c.id === charId);
                    if (character) this.processCharacterInteraction(character);
                });
            }

            // Динамические взаимодействия
            const dynamicConfig = chapterData.dynamic_elements?.character_interactions;
            if (dynamicConfig && choice.arc) {
                Object.entries(dynamicConfig).forEach(([charId, config]) => {
                    if (config.on_select?.trigger_arc === choice.arc) {
                        this.triggerDynamicInteraction(charId, config.on_select);
                    }
                });
            }
        } catch (error) {
            console.error('Character reaction error:', error);
        }
    }

    processCharacterInteraction(character) {
        try {
            if (character.mood && character.sprite) {
                updateCharacterSprite(character.id, `${character.sprite}_${character.mood}`);
            }

            if (character.dialogue) {
                showDialogue({
                    speaker: character.id,
                    text: character.dialogue,
                    position: character.position || 'center'
                });
            }

            if (character.position) {
                this.animateCharacterSelection(character.id);
            }
        } catch (error) {
            console.error('Character interaction failed:', error);
        }
    }

    animateCharacterSelection(characterId) {
        try {
            const element = document.querySelector(`[data-character="${characterId}"]`);
            if (element) {
                element.classList.add('choice-active');
                setTimeout(() => element.classList.remove('choice-active'), 500);
            }
        } catch (error) {
            console.error('Animation error:', error);
        }
    }

    triggerDynamicInteraction(charId, interaction) {
        try {
            if (!interaction) return;

            // Обновление спрайта
            if (interaction.sprite_change) {
                updateCharacterSprite(charId, interaction.sprite_change);
            }

            // Диалог
            if (interaction.dialogue) {
                showDialogue({
                    speaker: charId,
                    text: interaction.dialogue,
                    mood: interaction.mood || 'neutral'
                });
            }

            // Эффекты
            if (interaction.effects) {
                Object.entries(interaction.effects).forEach(([key, value]) => {
                    this.updateGameState(key, value);
                });
                updateStatsDisplay(this.game.states);
            }
        } catch (error) {
            console.error('Dynamic interaction error:', error);
        }
    }

    applyChoiceEffects(effects = {}) {
        Object.entries(effects).forEach(([key, value]) => {
            this.updateGameState(key, value);
        });
        updateStatsDisplay(this.game.states);
    }

    updateGameState(key, value) {
        const state = this.game.states;
        
        switch(key) {
            case 'health':
                state.health = this.mathClamp(state.health + value, 0, 100);
                break;
                
            case 'sanity':
            case 'fate':
                state[key] = this.mathClamp(state[key] + value, 0, 10);
                break;
                
            case 'inventory':
                this.handleInventoryOperation(value);
                break;
                
            default:
                if (state.hasOwnProperty(key)) {
                    const newValue = state[key] + value;
                    state[key] = typeof state[key] === 'number' 
                        ? Math.max(newValue, 0) 
                        : newValue;
                }
        }
    }

    handleInventoryOperation(operation) {
        try {
            const { action, items } = operation || {};
            if (!action || !items) {
                throw new Error('Invalid inventory operation');
            }

            const inventory = this.game.states.inventory;
            
            switch(action) {
                case 'add':
                    items.forEach(item => {
                        if (!inventory.includes(item)) inventory.push(item);
                    });
                    break;
                    
                case 'remove':
                    this.game.states.inventory = inventory.filter(
                        item => !items.includes(item)
                    );
                    break;
                    
                default:
                    throw new Error(`Unknown inventory action: ${action}`);
            }
        } catch (error) {
            showError(`Inventory error: ${error.message}`);
        }
    }

    async handleChoiceOutcome(choice) {
        if (choice.reveal) {
            await this.revealChapter(choice.reveal);
        } else if (choice.next) {
            await this.game.loadChapter(choice.next);
        } else {
            throw new Error('Invalid choice outcome');
        }
    }

    async revealChapter(chapterId) {
        if (!this.game.states.revealedChapters.includes(chapterId)) {
            this.game.states.revealedChapters.push(chapterId);
        }
        await this.game.loadChapter(chapterId);
    }

    showFallbackChoice(container) {
        const button = document.createElement('button');
        button.className = 'choice-btn visible';
        button.textContent = 'Продолжить...';
        button.addEventListener('click', () => 
            this.game.loadChapter(this.getDefaultNextChapter())
        );
        container.appendChild(button);
    }

    getDefaultNextChapter() {
        return this.game.currentChapterData?.default_next || 'chapter1';
    }

    handleChoiceError(error, container) {
        console.error('Ошибка системы выбора:', error);
        container.innerHTML = `<div class="error">${error.message}</div>`;
        setTimeout(() => {
            container.innerHTML = '';
            this.game.loadChapter('chapter1').catch(console.error);
        }, 3000);
    }

    checkRequirements(requires) {
        if (!requires) return true;
        
        if (requires.any) {
            return requires.any.some(condition => 
                this.parseCondition(condition)
            );
        }

        return Object.entries(requires).every(([key, value]) => {
            return this.checkSingleRequirement(key, value);
        });
    }

    checkSingleRequirement(key, value) {
        const state = this.game.states;
        
        if (key === 'inventory') {
            return this.checkInventoryCondition(value);
        }
        
        if (key === 'not_inventory') {
            return !this.checkInventoryCondition(value);
        }
        
        if (key === 'revealed') {
            return state.revealedChapters.includes(value);
        }
        
        if (key === 'not_revealed') {
            return !state.revealedChapters.includes(value);
        }
        
        if (typeof value === 'object') {
            return this.checkComplexCondition(key, value);
        }
        
        return state[key] >= value;
    }

    checkComplexCondition(key, condition) {
        const stateValue = this.game.states[key];
        const operator = Object.keys(condition)[0];
        const requiredValue = condition[operator];
        
        return this.compareValues(stateValue, operator, requiredValue);
    }

    parseCondition(condition) {
        const match = condition.match(/(\w+)([<>=!]+)(\d+)/);
        if (!match) return false;
        
        const [_, key, operator, value] = match;
        return this.compareValues(
            this.game.states[key] || 0,
            operator,
            parseInt(value)
        );
    }

    compareValues(a, operator, b) {
        switch(operator) {
            case '>=': return a >= b;
            case '<=': return a <= b;
            case '>': return a > b;
            case '<': return a < b;
            case '==': return a === b;
            case '!=': return a !== b;
            default: return false;
        }
    }

    checkInventoryCondition(items) {
        const inventory = this.game.states.inventory;
        return [].concat(items).every(item => 
            inventory.includes(item)
        );
    }
}