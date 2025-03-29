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
        this.currentChapterData = null;
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
            await this.renderChapter(chapter);

        } catch (error) {
            console.error("Ошибка загрузки:", error);
            this.showError(`Ошибка в главе ${chapterId}: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    async renderChapter(chapter) {
        this.currentChapterData = chapter;
        const textDisplay = document.getElementById('text-display');
        const choicesBox = document.getElementById('choices');
        
        // Сброс предыдущего контента
        textDisplay.innerHTML = '';
        choicesBox.innerHTML = '';

        // 1. Анимация фона
        await this.startBgTransition(chapter);

        // 2. Анимация текста
        await this.typewriterEffect(chapter.text);

        // 3. Показ кнопок
        this.showChoicesWithDelay(chapter.choices || []);

        // 4. Обновление статистики
        this.updateStatsDisplay();
    }

    async startBgTransition(chapter) {
        return new Promise((resolve) => {
            const gameContainer = document.getElementById('game-container');
            gameContainer.classList.add('changing-bg');

            setTimeout(async () => {
                try {
                    await this.loadBackground(chapter.background);
                } catch (error) {
                    console.error('Ошибка загрузки фона:', error);
                }
                gameContainer.classList.remove('changing-bg');
                resolve();
            }, 800);
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

        return new Promise((resolve) => {
            const animate = () => {
                if (index < text.length) {
                    textDisplay.insertBefore(
                        document.createTextNode(text[index]), 
                        textDisplay.lastChild
                    );
                    index++;
                    currentAnimationFrame = requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            currentAnimationFrame = requestAnimationFrame(animate);
        });
    }

    showChoicesWithDelay(choices) {
        const choicesBox = document.getElementById('choices');
        choicesBox.innerHTML = '';

        choices.forEach((choice, i) => {
            setTimeout(() => {
                const btn = this.createChoiceButton(choice);
                this.fadeInElement(btn);
                choicesBox.appendChild(btn);
            }, i * 200);
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
        const animate = () => {
            opacity += 0.1;
            element.style.opacity = opacity;
            if (opacity < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    handleChoice(choice) {
        if (!choice.next) {
            this.showError('Следующая глава не указана');
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
        return Object.entries(requires).every(([key, value]) => {
            if (key === 'inventory') {
                return this.states.inventory.length < value;
            }
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
        inventory: []
    };
    
    game.loadChapter('chapter1');
}