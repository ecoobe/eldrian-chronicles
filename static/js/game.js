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
        if (this.isLoading) return;
        
        this.isLoading = true;
        try {
            const response = await fetch(`/chapters/${chapterId}.json`);
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            
            const chapter = await response.json();
            this.renderChapter(chapter);
            
        } catch (error) {
            console.error('Error loading chapter:', error);
            this.showError(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    renderChapter(chapter) {
        const textDisplay = document.getElementById('text-display');
        const choicesBox = document.getElementById('choices');
        
        // Очистка предыдущего контента
        textDisplay.innerHTML = chapter.text || "[Текст главы отсутствует]";
        choicesBox.innerHTML = '';

        // Добавление кнопок выбора
        chapter.choices?.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = choice.text;
            
            // Обработчик выбора
            btn.addEventListener('click', () => {
                this.applyEffects(choice.effects || {});
                this.loadChapter(choice.next);
            });

            choicesBox.appendChild(btn);
        });

        // Принудительное обновление интерфейса
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

		elements.healthBar.style.width = `${this.states.health}%`;
        elements.healthValue.textContent = this.states.health;
        elements.magicBar.style.width = `${this.states.magic}%`;
        elements.magicValue.textContent = this.states.magic;
        elements.inventoryCount.textContent = `${this.states.inventory.length}/10`;
        elements.liraTrust.textContent = this.states.lira_trust;
        elements.moralValue.textContent = this.states.moral;

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
	showError(message) {
        const textDisplay = document.getElementById('text-display');
        textDisplay.innerHTML = `<p class="error">ОШИБКА: ${message}</p>`;
    }

    init() {
        this.loadChapter(this.states.currentChapter);
    }
}

const game = new Game();

function initGame() {
    // Сбрасываем состояние
    game.states = {
        magic: 0,
        lira_trust: 0,
        health: 100,
        currentChapter: 'chapter1',
        inventory: []
    };
    
    // Переключаем видимость через стили
    document.getElementById('main-menu').style.display = 'none';
    const gameContainer = document.getElementById('game-container');
    gameContainer.classList.remove('hidden');
    gameContainer.style.display = 'block';
    
    // Принудительный рендеринг
    game.updateStatsDisplay();
    game.loadChapter('chapter1');
}
