document.getElementById('start-game-btn').addEventListener('click', initGame);

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
        this.isLoading = false;
    }

    async loadChapter(chapterId) {
        if (this.isLoading || this.states.currentChapter === chapterId) {
            console.log('Загрузка уже выполняется');
            return;
        }
        
        this.isLoading = true;
        try {
            console.log(`[DEBUG] Loading chapter: ${chapterId}`);
            const response = await fetch(`/chapters/${chapterId}.json?t=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            
            const chapter = await response.json();
            this.states.currentChapter = chapterId;
            this.renderChapter(chapter);
            
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('text-display').innerHTML = 
                `<p style="color:red">Ошибка: ${error.message}</p>`;
        } finally {
            this.isLoading = false;
        }
    }

    renderChapter(chapter) {
        const textDisplay = document.getElementById('text-display');
        const choicesBox = document.getElementById('choices');
        
        if (!textDisplay || !choicesBox) {
            console.error('Критические элементы DOM не найдены');
            return;
        }

        // Обновление фона
        const gameContainer = document.getElementById('game-container');
        gameContainer.style.backgroundImage = `url('/backgrounds/${chapter.background}')`;

        // Обновление текста
        textDisplay.innerHTML = chapter.text;

        // Очистка кнопок
        choicesBox.innerHTML = '';

        // Создание новых кнопок
        chapter.choices.forEach(choice => {
            if (choice.hidden && !this.checkCondition(choice.condition)) return;

            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = choice.text;
            btn.disabled = !this.checkRequirements(choice.requires || {});

            btn.addEventListener('click', () => {
                console.log('[DEBUG] Выбор:', choice.text);
                this.applyEffects(choice.effects || {});
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
        const elements = {
            healthBar: document.getElementById('health-bar'),
            healthValue: document.getElementById('health-value'),
            magicBar: document.getElementById('magic-bar'),
            magicValue: document.getElementById('magic-value'),
            inventoryCount: document.getElementById('inventory-count'),
            liraTrust: document.getElementById('lira-trust'),
            moralValue: document.getElementById('moral-value')
        };

        // Проверка элементов
        Object.entries(elements).forEach(([name, element]) => {
            if (!element) console.error(`Элемент ${name} не найден!`);
        });

        // Обновление значений
        elements.healthBar.style.width = `${this.states.health}%`;
        elements.healthValue.textContent = this.states.health;
        elements.magicBar.style.width = `${this.states.magic}%`;
        elements.magicValue.textContent = this.states.magic;
        elements.inventoryCount.textContent = `${this.states.inventory.length}/10`;
        elements.liraTrust.textContent = this.states.lira_trust;
        elements.moralValue.textContent = this.states.moral;
    }

    init() {
        this.loadChapter(this.states.currentChapter);
    }
}

const game = new Game(); // Перемещено перед использованием

document.getElementById('start-game-btn').addEventListener('click', () => {
    initGame();
});

let isGameInitialized = false;

function initGame() {
    if (isGameInitialized) {
        console.log('Игра уже запущена');
        return;
    }
    
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('start-game-btn').disabled = true;
    
    game.init();
    isGameInitialized = true;
}
