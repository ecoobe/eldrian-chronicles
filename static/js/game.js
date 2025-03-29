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
            console.log('Loading chapter:', chapterId); // Логирование загрузки
            const response = await fetch(`/chapters/${chapterId}.json`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const chapter = await response.json();
            this.renderChapter(chapter);
        } catch (error) {
            console.error('Error loading chapter:', error);
            document.getElementById('text-display').innerHTML = 
                `<p style="color:red">Ошибка загрузки главы: ${error.message}</p>`;
        }
    }

    renderChapter(chapter) {
        const gameContainer = document.getElementById('game-container');
        gameContainer.style.backgroundImage = `url('/backgrounds/${chapter.background}')`;
        
        document.getElementById('text-display').innerHTML = chapter.text;
        this.updateStatsDisplay();
        
        const choicesBox = document.getElementById('choices');
        choicesBox.innerHTML = '';

        chapter.choices.forEach(choice => {
            if (choice.hidden && !this.checkCondition(choice.condition)) return;

            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerHTML = choice.text;
            btn.disabled = !this.checkRequirements(choice.requires || {});
            
            btn.addEventListener('click', () => {
                console.log('Choice selected:', choice.text);
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
        if (typeof condition !== 'string') return false;
        
        if (condition.startsWith('inventory.includes')) {
            const item = condition.match(/'([^']+)'/)?.[1];
            return item ? this.states.inventory.includes(item) : false;
        }
        return false;
    }

    applyEffects(effects) {
        Object.entries(effects).forEach(([key, value]) => {
            if (key === 'inventory') {
                this.states.inventory.push(...[].concat(value));
            } else if (key === 'health') {
                this.states.health = Math.max(0, Math.min(100, this.states.health + value));
            } else if (this.states.hasOwnProperty(key)) {
                this.states[key] += value;
            }
        });
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        // Прогресс-бары
        document.getElementById('health-bar').style.width = `${this.states.health}%`;
        document.getElementById('magic-bar').style.width = `${this.states.magic}%`;
        
        // Текстовые значения
        document.getElementById('health-value').textContent = this.states.health;
        document.getElementById('magic-value').textContent = this.states.magic;
        document.getElementById('lira-trust').textContent = this.states.lira_trust;
        document.getElementById('moral-value').textContent = this.states.moral;
        document.getElementById('inventory-count').textContent = 
            `${this.states.inventory.length}/10`;
    }

    init() {
        this.loadChapter(this.states.currentChapter);
    }
}

const game = new Game();