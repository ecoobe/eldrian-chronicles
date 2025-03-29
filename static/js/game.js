document.getElementById('start-game-btn').addEventListener('click', initGame);
let currentAnimationFrame = null;

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
		if (!chapterId) {
			this.showError("Не указан ID главы");
			return;
		}
	
		if (this.isLoading) return;
		this.isLoading = true;
	
		try {
			console.log(`[DEBUG] Загрузка главы: ${chapterId}`);
			const response = await fetch(`/chapters/${chapterId}.json?t=${Date.now()}`);
			
			if (!response.ok) {
				throw new Error(`Ошибка HTTP: ${response.status} ${response.statusText}`);
			}
	
			const chapter = await response.json();
			
			if (!chapter?.id) {
				throw new Error("Некорректный формат файла главы");
			}
	
			this.states.currentChapter = chapterId;
			this.renderChapter(chapter);
	
		} catch (error) {
			console.error("Ошибка загрузки:", error);
			this.showError(`Ошибка в главе ${chapterId}: ${error.message}`);
		} finally {
			this.isLoading = false;
		}
	}

    renderChapter(chapter) {
		const textDisplay = document.getElementById('text-display');
		const choicesBox = document.getElementById('choices');
		const gameContainer = document.getElementById('game-container');
	
		// 1. Загрузка фона с обработкой ошибок
		const bgImage = new Image();
		bgImage.src = `/backgrounds/${chapter.background}`;
		
		bgImage.onload = () => {
			console.log('Фон успешно загружен:', bgImage.src);
			gameContainer.style.backgroundImage = `url('${bgImage.src}')`;
		};
		
		bgImage.onerror = () => {
			console.error('Ошибка загрузки фона! Проверьте:', {
				"Ожидаемый путь": `/backgrounds/${chapter.background}`,
				"Фактический путь": bgImage.src,
				"Существует ли файл?": "Проверьте через https://coobe.ru/backgrounds/" + chapter.background
			});
			gameContainer.style.backgroundImage = 'url("/backgrounds/main_menu.webp")'; // Фолбэк
		};
	
		// 2. Обновление текста и кнопок
		textDisplay.innerHTML = chapter.text || "[Текст главы отсутствует]";
		choicesBox.innerHTML = '';
	
		// 3. Создание кнопок выбора
		chapter.choices?.forEach(choice => {
			const btn = document.createElement('button');
			btn.className = 'choice-btn';
			btn.textContent = choice.text;
			btn.onclick = () => this.handleChoice(choice);
			choicesBox.appendChild(btn);
		});
	
		this.updateStatsDisplay();
	}

	handleChoice(choice) {
		if (!choice.next) {
			this.showError('Некорректная глава: next не указан');
			return;
		}
		
		try {
			this.applyEffects(choice.effects || {});
			this.loadChapter(choice.next);
		} catch (error) {
			this.showError(`Ошибка выбора: ${error.message}`);
		}
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
		const errorHTML = `
			<div class="error-box">
				<h2>🛑 Ошибка</h2>
				<p>${message}</p>
				<button onclick="location.reload()">Перезагрузить</button>
			</div>
		`;
		document.body.innerHTML = errorHTML;
	}

    init() {
        this.loadChapter(this.states.currentChapter);
    }

	async renderChapter(chapter) {
        // Анимация затемнения
        this.startBgTransition();
        
        // Анимация текста
        await this.typewriterEffect(chapter.text);
        
        // Показ кнопок с задержкой
        this.showChoicesWithDelay(chapter.choices);
    }

    startBgTransition() {
        const gameContainer = document.getElementById('game-container');
        gameContainer.classList.add('changing-bg');
        setTimeout(() => {
            gameContainer.style.backgroundImage = `url('/backgrounds/${chapter.background}')`;
            gameContainer.classList.remove('changing-bg');
        }, 800);
    }

    async typewriterEffect(text) {
        const textDisplay = document.getElementById('text-display');
        textDisplay.innerHTML = '';
        let index = 0;
        
        return new Promise(resolve => {
            const typing = setInterval(() => {
                textDisplay.innerHTML += text[index];
                if(++index === text.length) {
                    clearInterval(typing);
                    resolve();
                }
            }, 30); // Скорость печати (мс на символ)
        });
    }

    showChoicesWithDelay(choices) {
        const choicesBox = document.getElementById('choices');
        choicesBox.innerHTML = '';
        
        choices.forEach((choice, i) => {
            setTimeout(() => {
                const btn = this.createChoiceButton(choice);
                btn.style.opacity = 0;
                choicesBox.appendChild(btn);
                this.fadeInElement(btn);
            }, i * 200); // Задержка между появлением кнопок
        });
    }

    fadeInElement(element) {
        let opacity = 0;
        const timer = setInterval(() => {
            opacity += 0.1;
            element.style.opacity = opacity;
            if(opacity >= 1) clearInterval(timer);
        }, 50);
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
