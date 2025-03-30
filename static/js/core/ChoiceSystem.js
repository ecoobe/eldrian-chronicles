import { showError, updateStatsDisplay } from '../utils/helpers.js';

export class ChoiceSystem {
    constructor(game) {
        this.game = game;
        this.activeChoices = new Set();
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
            this.applyChoiceEffects(choice.effects);
            await this.handleChoiceOutcome(choice);
        } catch (error) {
            showError(`Choice processing failed: ${error.message}`);
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
        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
        
        switch(key) {
            case 'health':
                state.health = clamp(state.health + value, 0, 100);
                break;
            case 'sanity':
            case 'fate':
                state[key] = clamp(state[key] + value, 0, 10);
                break;
            case 'inventory':
                this.handleInventoryOperation(value);
                break;
            default:
                if (state.hasOwnProperty(key)) {
                    state[key] = Math.max(state[key] + value, 0);
                }
        }
    }

    handleInventoryOperation(operation) {
        const { action, items } = operation;
        const inventory = this.game.states.inventory;
        
        if (!Array.isArray(items)) {
            throw new Error('Inventory items must be an array');
        }

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
                throw new Error(`Invalid inventory action: ${action}`);
        }
    }

    async handleChoiceOutcome(choice) {
        if (choice.reveal) {
            await this.revealChapter(choice.reveal);
        } else if (choice.next) {
            await this.game.loadChapter(choice.next);
        } else {
            throw new Error('Choice has no valid outcome');
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
        button.textContent = 'Continue...';
        button.addEventListener('click', () => 
            this.game.loadChapter(this.getDefaultNextChapter())
        );
        container.appendChild(button);
    }

    getDefaultNextChapter() {
        return this.game.currentChapterData?.default_next || 'chapter1';
    }

    handleChoiceError(error, container) {
        console.error('Choice system error:', error);
        container.innerHTML = `<div class="error">${error.message}</div>`;
        setTimeout(() => {
            container.innerHTML = '';
            this.game.loadChapter('chapter1');
        }, 2000);
    }

    checkRequirements(requires) {
        if (!requires) return true;
        
        if (requires.any) {
            return requires.any.some(condition => 
                this.parseCondition(condition)
            );
        }

        return Object.entries(requires).every(([key, value]) => {
            const stateValue = this.game.states[key];
            
            if (key.endsWith('_status')) {
                return stateValue === value;
            }
            
            if (typeof value === 'string' && value.includes('+')) {
                return stateValue >= parseInt(value);
            }

            if (key === 'revealed') {
                return this.game.states.revealedChapters.includes(value);
            }
            
            if (key === 'not_revealed') {
                return !this.game.states.revealedChapters.includes(value);
            }
            
            if (typeof value === 'object') {
                const operator = Object.keys(value)[0];
                const compareValue = value[operator];
                return this.compareValues(stateValue, operator, compareValue);
            }
            
            if (key === 'inventory') {
                return this.checkInventoryCondition(value);
            }
            
            if (key === 'not_inventory') {
                return !this.checkInventoryCondition(value);
            }
            
            return stateValue >= value;
        });
    }
}