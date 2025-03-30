import { showError, updateStatsDisplay } from '../utils/helpers.js';

export class ChoiceSystem {
    constructor(game) {
        this.game = game;
    }

    showChoices(choices, container) {
        container.innerHTML = '';
        const visibleChoices = choices.filter(choice => 
            this.checkRequirements(choice.requires || {})
        );

        if (visibleChoices.length === 0) {
            this.showAutoContinue(container);
            return;
        }

        visibleChoices.forEach((choice, i) => {
            const btn = this.createButton(choice);
            setTimeout(() => btn.classList.add('visible'), i * 100);
            container.appendChild(btn);
        });
    }

    createButton(choice) {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice.text;
        btn.dataset.choiceId = choice.id || Math.random().toString(36).slice(2, 9);
        
        btn.addEventListener('click', () => this.handleChoice(choice));
        return btn;
    }

    handleChoice(choice) {
        if (!choice?.next) {
            showError('Нет следующей главы');
            return;
        }

        this.applyEffects(choice.effects || {});

        if (choice.next === 'reveal_chapter') {
            this.revealChapter(choice.reveal);
        } else {
            this.game.loadChapter(choice.next);
        }
    }

    applyEffects(effects) {
        Object.entries(effects).forEach(([key, value]) => {
            const states = this.game.states;
            
            switch(key) {
                case 'fate':
                    states.fate = Math.clamp(states.fate + value, 0, 10);
                    break;
                case 'sanity':
                    states.sanity = Math.clamp(states.sanity + value, 0, 10);
                    break;
                case 'inventory_add':
                    states.inventory.push(...[].concat(value));
                    break;
                case 'inventory_remove':
                    states.inventory = states.inventory.filter(item => 
                        ![].concat(value).includes(item)
                    );
                    break;
                default:
                    if (states.hasOwnProperty(key)) {
                        states[key] = Math.max(0, states[key] + value);
                    }
            }
        });
        
        updateStatsDisplay(this.game.states);
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

    parseCondition(condition) {
        const match = condition.match(/(\w+)([<>=]+)(\d+)/);
        if (!match) return false;
        
        const [_, key, op, value] = match;
        return this.compareValues(
            this.game.states[key], 
            op, 
            parseInt(value)
        );
    }

    compareValues(a, operator, b) {
        switch(operator) {
            case '>=': return a >= b;
            case '<=': return a <= b;
            case '<': return a < b;
            case '>': return a > b;
            case '=': return a === b;
            default: return false;
        }
    }

    checkInventoryCondition(value) {
        return Array.isArray(value)
            ? value.every(item => this.game.states.inventory.includes(item))
            : this.game.states.inventory.includes(value);
    }

    showAutoContinue(container) {
        const btn = document.createElement('button');
        btn.className = 'choice-btn visible';
        btn.textContent = 'Продолжить...';
        btn.onclick = () => this.game.loadChapter(this.getNextChapter());
        container.appendChild(btn);
    }

    getNextChapter() {
        return this.game.currentChapterData?.default_next || 'chapter2';
    }

    revealChapter(chapterId) {
        if (!this.game.states.revealedChapters.includes(chapterId)) {
            this.game.states.revealedChapters.push(chapterId);
        }
        this.game.loadChapter(chapterId);
    }
}