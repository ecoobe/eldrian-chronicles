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
        if (!choice.next) {
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
            if (key === 'fate') {
                this.states.fate = Math.min(10, Math.max(0, this.states.fate + value));
            } else if (key === 'sanity') {
                this.states.sanity = Math.min(10, Math.max(0, this.states.sanity + value));
            } else if (key === 'inventory_add') {
                this.states.inventory.push(...[].concat(value));
            } else if (key === 'inventory_remove') {
                this.states.inventory = this.states.inventory.filter(item => ![].concat(value).includes(item));
            } else if (this.states.hasOwnProperty(key)) {
                this.states[key] = Math.max(0, this.states[key] + value);
            }
        });
        this.updateStatsDisplay();
    }

    checkRequirements(requires) {
        if (!requires) return true;
        
        if (requires.any) {
            return requires.any.some(condition => 
                this.parseCondition(condition)
            );
        }

        return Object.entries(requires).every(([key, value]) => {
            if (key.endsWith('_status')) {
                return this.states[key] === value;
            }
            
            if (typeof value === 'string' && value.includes('+')) {
                return this.states[key] >= parseInt(value);
            }

            if (key === 'revealed') {
                return this.states.revealedChapters.includes(value);
            }
            
            if (key === 'not_revealed') {
                return !this.states.revealedChapters.includes(value);
            }
            
            if (typeof value === 'object') {
                const operator = Object.keys(value)[0];
                const compareValue = value[operator];
                switch(operator) {
                    case '<': return this.states[key] < compareValue;
                    case '>': return this.states[key] > compareValue;
                    case '=': return this.states[key] === compareValue;
                    case '<=': return this.states[key] <= compareValue;
                    case '>=': return this.states[key] >= compareValue;
                }
            }
            
            if (key === 'inventory') {
                return Array.isArray(value) 
                    ? value.every(item => this.states.inventory.includes(item))
                    : this.states.inventory.includes(value);
            }
            
            if (key === 'not_inventory') {
                return Array.isArray(value)
                    ? value.every(item => !this.states.inventory.includes(item))
                    : !this.states.inventory.includes(value);
            }
            
            return this.states[key] >= value;
        });
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
}