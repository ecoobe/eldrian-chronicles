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
            console.log(`[DEBUG] Loading chapter: ${chapterId}`);
            const response = await fetch(`/chapters/${chapterId}.json?t=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            const chapter = await response.json();
            this.renderChapter(chapter);
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('text-display').innerHTML = 
                `<p style="color: red">Ошибка загрузки: ${error.message}</p>`;
        }
    }

    renderChapter(chapter) {
        console.log('[DEBUG] Rendering chapter:', chapter);
        
        // Обновление фона
        const gameContainer = document.getElementById('game-container');
        gameContainer.style.backgroundImage = `url('/backgrounds/${chapter.background}')`;
        
        // Обновление текста
        document.getElementById('text-display').innerHTML = chapter.text;
        
        // Очистка старых кнопок
        const choicesBox = document.getElementById('choices');
        choicesBox.innerHTML = '';
        
        // Создание новых кнопок
        chapter.choices.forEach(choice => {
            if (choice.hidden && !this.checkCondition(choice.condition)) return;

            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = choice.text;
            btn.disabled = !this.checkRequirements(choice.requires || {});

            btn.addEventListener('click', () => {
                console.log('[DEBUG] Choice selected:', choice);
                this.applyEffects(choice.effects || {});
                this.states.currentChapter = choice.next;
                this.loadChapter(choice.next);
            });

            choicesBox.appendChild(btn);
        });

        this.updateStatsDisplay();
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
            const item = condition.match(/'([^']+)'/)?.[1];
            return item ? this.states.inventory.includes(item) : false;
        }
        return this.states[condition] !== undefined;
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
        document.getElementById('inventory-count').textContent = 
            `${this.states.inventory.length}/10`;
        document.getElementById('lira-trust').textContent = this.states.lira_trust;
        document.getElementById('moral-value').textContent = this.states.moral;
        
        console.log('[DEBUG] Updated stats:', this.states);
    }

    init() {
        this.loadChapter(this.states.currentChapter);
    }
}

const game = new Game();