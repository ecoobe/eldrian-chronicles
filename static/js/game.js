// game.js
document.getElementById('start-game-btn').addEventListener('click', () => {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    game.init();
});

class Game {
    constructor() {
        this.states = {
            magic: 0,
            lira_trust: 0,
            kyle_trust: 0,
            elina_trust: 0,
            moral: 50,
            endings_unlocked: [],
            health: 100,
            currentChapter: 'chapter1',
            inventory: []
        };
    }

    async loadChapter(chapterId) {
        try {
            const response = await fetch(`/chapters/${chapterId}.json`);
            const chapter = await response.json();
            this.renderChapter(chapter);
        } catch (error) {
            console.error('Error loading chapter:', error);
        }
    }

    renderChapter(chapter) {
        const gameContainer = document.getElementById('game-container');
        gameContainer.style.backgroundImage = `url('/backgrounds/${chapter.background}')`;
        
        document.getElementById('text-display').innerHTML = chapter.text;
        
        const choicesBox = document.getElementById('choices');
        choicesBox.innerHTML = '';
        
        // Обновляем статистики
        this.updateStatsDisplay();
        
        chapter.choices.forEach(choice => {
            if (choice.hidden && !this.checkCondition(choice.condition)) return;

            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerHTML = choice.text;
            
            btn.disabled = !this.checkRequirements(choice.requires);
            
            btn.addEventListener('click', () => {
                this.applyEffects(choice.effects || {});
                this.states.currentChapter = choice.next;
                this.loadChapter(choice.next);
            });
            
            choicesBox.appendChild(btn);
        });
    }

    checkRequirements(requires) {
        if (!requires) return true;
        return Object.entries(requires).every(([key, value]) => {
            if (key === 'inventory') {
                return Array.isArray(value) 
                    ? value.every(item => this.states.inventory.includes(item))
                    : this.states.inventory.includes(value);
            }
            return this.states[key] >= value;
        });
    }

    checkCondition(condition) {
        if (!condition) return true;
        
        if (condition.startsWith('inventory.includes')) {
            const item = condition.match(/'([^']+)'/)[1];
            return this.states.inventory.includes(item);
        }
        
        return this.states[condition] !== undefined;
    }

    applyEffects(effects) {
        Object.entries(effects).forEach(([key, value]) => {
            if (key === 'inventory') {
                this.states.inventory.push(...[].concat(value));
            } else if (key === 'health') {
                this.states.health = Math.max(0, this.states.health + value);
            } else {
                this.states[key] += value;
            }
        });
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        // Обновление прогресс-баров
        document.getElementById('health-bar').style.width = `${this.states.health}%`;
        document.getElementById('magic-bar').style.width = `${Math.min(this.states.magic * 10, 100)}%`;
        document.getElementById('inventory-count').textContent = `${this.states.inventory.length}/10`;
    }

    init() {
        this.loadChapter(this.states.currentChapter);
    }
}

const game = new Game();