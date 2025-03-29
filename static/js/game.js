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
            gold: 10,
            health: 100,
            currentChapter: 'chapter1',
            inventory: [],
            endings_unlocked: [],
			willpower: 5,
            persuasion: 0,
            intimidation: 0,
            revealedChapters: []
        };
        this.isLoading = false;
        this.currentChapterData = null;
        this.preloadBackgrounds();
    }

    preloadBackgrounds() {
        const backgrounds = [
            'village_burning.webp',
            'burning_house.webp',
            'forest.webp',
            'main_menu.webp',
            'altar.webp',
            'shadow_portal.webp'
        ];
        backgrounds.forEach(bg => {
            new Image().src = `/backgrounds/${bg}`;
        });
    }

    async loadChapter(chapterId) {
        if (!chapterId) {
            this.showError("Не указан ID главы");
            return;
        }

        if (this.isLoading) return;
        this.isLoading = true;

        try {
            let path;
            if (chapterId.startsWith('ending_')) {
                path = `/endings/${chapterId}.json`;
            } else {
                path = `/chapters/${chapterId}.json`;
            }

            console.log(`[DEBUG] Загрузка: ${path}`);
            const response = await fetch(`${path}?t=${Date.now()}`);
            
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            const data = await response.json();

            this.states.currentChapter = chapterId;
            await this.renderChapter(data);

        } catch (error) {
            console.error("Ошибка загрузки:", error);
            this.showError(`Ошибка в ${chapterId}: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    async renderChapter(data) {
        const textDisplay = document.getElementById('text-display');
        const choicesBox = document.getElementById('choices');
        
        textDisplay.innerHTML = '';
        choicesBox.innerHTML = '';

        // Обработка вариантов главы
        let content = data;
        if (data.variants) {
            content = data.variants.find(v => this.checkVariantConditions(v)) || data;
        }

        await this.startBgTransition(content);
        await this.typewriterEffect(content.text);
        this.showChoicesWithDelay(content.choices || []);
        this.updateStatsDisplay();
    }

    checkVariantConditions(variant) {
        if (!variant.trigger) return true;
        if (variant.trigger.default) return true;
        
        return Object.entries(variant.trigger).every(([key, value]) => {
            if (key === 'inventory') {
                return Array.isArray(value) 
                    ? value.every(item => this.states.inventory.includes(item))
                    : this.states.inventory.includes(value);
            }
            return this.states[key] >= value;
        });
    }

    async startBgTransition(content) {
        return new Promise(resolve => {
            const gameContainer = document.getElementById('game-container');
            gameContainer.classList.add('changing-bg');

            setTimeout(async () => {
                try {
                    await this.loadBackground(content.background);
                } catch (error) {
                    console.error('Ошибка фона:', error);
                }
                gameContainer.classList.remove('changing-bg');
                resolve();
            }, 1200);
        });
    }

    loadBackground(background) {
        return new Promise((resolve, reject) => {
            const gameContainer = document.getElementById('game-container');
            const bgImage = new Image();
            
            bgImage.onload = () => {
                gameContainer.style.backgroundImage = `url('${bgImage.src}')`;
                resolve();
            };
            
            bgImage.onerror = () => {
                gameContainer.style.backgroundImage = 'url("/backgrounds/main_menu.webp")';
                reject(new Error(`Не удалось загрузить фон: ${background}`));
            };

            bgImage.src = `/backgrounds/${background}`;
        });
    }

    async typewriterEffect(text) {
        const textDisplay = document.getElementById('text-display');
        textDisplay.innerHTML = '<span class="typewriter-cursor"></span>';
        let index = 0;
        let lastUpdate = 0;
        const SPEED_PER_CHAR = 60;

        return new Promise((resolve) => {
            const animate = (timestamp) => {
                if (!lastUpdate) lastUpdate = timestamp;
                const delta = timestamp - lastUpdate;
                
                if (delta >= SPEED_PER_CHAR && index < text.length) {
                    textDisplay.insertBefore(
                        document.createTextNode(text[index]), 
                        textDisplay.lastChild
                    );
                    index++;
                    lastUpdate = timestamp;
                }
                
                if (index < text.length) {
                    currentAnimationFrame = requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            currentAnimationFrame = requestAnimationFrame(animate);
        });
    }

    showChoicesWithDelay(choices) {
		const visibleChoices = choices.filter(choice => {
			if (choice.hidden) {
				return this.checkRequirements(choice.requires || {});
			}
			return true;
		});
		
        const choicesBox = document.getElementById('choices');
        choicesBox.innerHTML = '';

        choices.forEach((choice, i) => {
            setTimeout(() => {
                const btn = this.createChoiceButton(choice);
                this.fadeInElement(btn);
                choicesBox.appendChild(btn);
            }, i * 400);
        });
    }

    createChoiceButton(choice) {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice.text;
        btn.disabled = !this.checkRequirements(choice.requires || {});
        btn.style.opacity = '0';
        btn.onclick = () => this.handleChoice(choice);
        return btn;
    }

    fadeInElement(element) {
        let opacity = 0;
        const DURATION = 800;
        const startTime = performance.now();
        
        const animate = (timestamp) => {
            const progress = timestamp - startTime;
            opacity = Math.min(progress / DURATION, 1);
            element.style.opacity = opacity;
            
            if (opacity < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    handleChoice(choice) {
        if (!choice.next) {
            this.showError('Нет следующей главы');
            return;
        }

        this.applyEffects(choice.effects || {});
        
        if (choice.next.startsWith('ending_')) {
            this.showEnding(choice.next);
        } else {
            this.loadChapter(choice.next);
        }
    }

	async showEnding(endingId) {
        try {
            const response = await fetch(`/endings/${endingId}.json`);
            const ending = await response.json();
            
            this.renderEnding(ending);
            this.states.endings_unlocked.push(endingId);
            
        } catch (error) {
            this.showError(`Ошибка концовки: ${error.message}`);
        }
    }

	renderEnding(ending) {
        const gameContainer = document.getElementById('game-container');
        gameContainer.style.backgroundImage = `url('/backgrounds/${ending.background}')`;
        
        const endingHTML = `
            <div class="ending-box">
                <h2>${ending.title || 'КОНЕЦ'}</h2>
                <p>${ending.text}</p>
                <button onclick="location.reload()">Новая игра</button>
            </div>
        `;
        
        document.getElementById('text-display').innerHTML = endingHTML;
        document.getElementById('choices').innerHTML = '';
    }

    checkRequirements(requires) {
		return Object.entries(requires || {}).every(([key, value]) => {
			// Обработка сравнений
			if (key === 'revealed') {
				return this.states.revealedChapters.includes(value);
			}
			if (typeof value === 'object') {
				const operator = Object.keys(value)[0];
				const compareValue = value[operator];
				switch(operator) {
					case '<': return this.states[key] < compareValue;
					case '>': return this.states[key] > compareValue;
					case '=': return this.states[key] === compareValue;
				}
			}
			
			// Проверка инвентаря
			if (key === 'inventory') {
				return Array.isArray(value) 
					? value.every(item => this.states.inventory.includes(item))
					: this.states.inventory.includes(value);
			}
			
			// Проверка числовых значений
			return this.states[key] >= value;
		});
	}

    applyEffects(effects) {
        Object.entries(effects).forEach(([key, value]) => {
            if (key === 'inventory') {
                this.states.inventory.push(...[].concat(value));
            } else if (this.states.hasOwnProperty(key)) {
                this.states[key] = Math.max(0, this.states[key] + value);
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
}

const game = new Game();

function initGame() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    
    game.states = {
        magic: 0,
        lira_trust: 0,
        health: 100,
        currentChapter: 'chapter1',
        inventory: [],
        endings_unlocked: []
    };
    
    game.loadChapter('chapter1');
}