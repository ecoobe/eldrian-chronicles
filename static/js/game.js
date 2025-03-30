document.getElementById('start-game-btn').addEventListener('click', initGame);
let currentAnimationFrame = null;

class MagicSystem {
    constructor(game) {
        this.game = game;
        this.leyLines = {
            "blood": { strength: 0.7, alignment: "chaos" },
            "void": { strength: 1.2, alignment: "eldritch" },
            "nature": { strength: 0.9, alignment: "order" }
        };
    }

    castSpell(spellName) {
        const spell = this.game.currentChapterData?.spells?.[spellName];
        if (!spell) return false;

        const leyLine = this.leyLines[spell.element];
        const power = leyLine.strength * (this.game.states[spell.skill] || 0);
        
        if (power > spell.threshold) {
            this.applySpellEffects(spell.effects);
            this.game.updateStatsDisplay();
            return true;
        }
        
        this.game.showError("Недостаточно силы для этого заклинания!");
        return false;
    }

    applySpellEffects(effects = []) {
        effects.forEach(effect => {
            if (effect.type === 'faction_reaction') {
                this.triggerFactionAI(effect.faction, effect.action);
            } else if (effect.type === 'stat_change') {
                this.game.states[effect.target] = (this.game.states[effect.target] || 0) + effect.value;
            }
        });
    }

    triggerFactionAI(faction, action) {
        const ai = this.game.currentChapterData?.faction_ai?.[faction];
        if (!ai) return;

        if (ai.strategy) {
            const condition = ai.strategy.if?.replace('player_moral', this.game.states.moral) || '';
            if (this.game.parseCondition(condition)) {
                ai.strategy.then?.forEach(response => {
                    console.log(`Фракция ${faction} реагирует: ${response}`);
                    this.game.handleAIResponse(faction, response);
                });
            }
        }
    }
}

class SpellSystem {
    constructor(game) {
        this.game = game;
        this.modal = document.getElementById('spell-modal');
        this.spellChoices = document.getElementById('spell-choices');
        this.closeBtn = document.getElementById('close-spell-modal');
        
        this.closeBtn?.addEventListener('click', () => this.closeModal());
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
    }

    showSpells(spells) {
        if (!spells || typeof spells !== 'object' || Object.keys(spells).length === 0) {
            this.closeModal();
            return;
        }

        this.spellChoices.innerHTML = '';
        
        Object.entries(spells).forEach(([spellName, spellData]) => {
            const spellBtn = document.createElement('div');
            spellBtn.className = 'spell-choice';
            spellBtn.textContent = spellData.name || spellName;
            
            const canCast = this.game.checkSpellRequirements(spellData);
            spellBtn.onclick = canCast ? () => {
                this.game.magicSystem.castSpell(spellName);
                this.closeModal();
            } : null;
            
            if (!canCast) {
                spellBtn.classList.add('disabled');
            }
            
            this.spellChoices.appendChild(spellBtn);
        });
        
        this.modal?.classList.remove('hidden');
    }

    closeModal() {
        this.modal?.classList.add('hidden');
    }
}

class Game {
    constructor() {
        this.states = {
            currentChapter: 'chapter1',
            magic: 0,
            lira_trust: 0,
            kyle_trust: 0,
            elina_trust: 0,
            moral: 50,
            gold: 10,
            health: 100,
            inventory: [],
            endings_unlocked: [],
            willpower: 5,
            persuasion: 0,
            intimidation: 0,
            revealedChapters: [],
            fate: 0,
            sanity: 10,
            church_hostility: 0,
            combat_skill: 0,
            insight: 0
        };

        this.isLoading = false;
        this.currentChapterData = null;
        this.choiceTimers = new Map();
        this.magicSystem = new MagicSystem(this);
        this.factionStates = {};
        this.ecosystem = {
            predators: {},
            prey: {},
            lastUpdate: Date.now()
        };
        
        this.preloadBackgrounds();
    }

    checkSpellRequirements(spellData) {
        return (this.states[spellData.skill] || 0) >= spellData.threshold;
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
        if (!chapterId || typeof chapterId !== 'string') {
            return Promise.reject(new Error(`Некорректный ID главы: ${chapterId}`));
        }

        if (this.isLoading) {
            return Promise.reject("Already loading");
        }

        this.isLoading = true;
        
        try {
            const path = chapterId.startsWith('ending_') 
                ? `/endings/${chapterId}.json` 
                : `/chapters/${chapterId}.json`;

            const response = await fetch(`${path}?t=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            const data = await response.json();
            this.states.currentChapter = chapterId;
            await this.renderChapter(data);
            
            return data;
        } catch (error) {
            console.error("Ошибка загрузки:", error);
            this.showError(`Ошибка в ${chapterId}: ${error.message}`);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

	async loadBackground(background) {
        return new Promise((resolve, reject) => {
            console.log(`[DEBUG] Загрузка фона: /backgrounds/${background}`);
            
            if (!background) {
                reject(new Error("Не указано фоновое изображение"));
                return;
            }

            const gameContainer = document.getElementById('game-container');
            if (!gameContainer) {
                reject(new Error("Игровой контейнер не найден"));
                return;
            }

            const bgImage = new Image();
            bgImage.onload = () => {
                console.log(`[DEBUG] Фон загружен: ${bgImage.src}`);
                gameContainer.style.backgroundImage = `url('${bgImage.src}')`;
                resolve();
            };
            
            bgImage.onerror = () => {
                console.error(`[DEBUG] Ошибка загрузки фона: ${background}`);
                gameContainer.style.backgroundImage = 'url("/backgrounds/main_menu.webp")';
                reject(new Error(`Не удалось загрузить фон: ${background}`));
            };

            bgImage.src = `/backgrounds/${background}`;
        });
    }

    async renderChapter(data) {
        if (!data || typeof data !== 'object') {
            throw new Error("Некорректные данные главы");
        }

        const textDisplay = document.getElementById('text-display');
        const choicesBox = document.getElementById('choices');

        // Сброс состояния
        this.clearChoiceTimers();
        cancelAnimationFrame(currentAnimationFrame);
        
        // Загрузка фона
        try {
            await this.loadBackground(data.background);
        } catch (error) {
            console.error("Ошибка фона:", error.message);
        }

        // Отображение текста
        textDisplay.innerHTML = '<div class="text-content"></div>';
        await this.typewriterEffect(data.text);

        // Обработка вариантов выбора
        const choices = Array.isArray(data.choices) ? data.choices : [];
        this.showChoicesWithDelay(choices);

        this.updateStatsDisplay();
    }

    clearChoiceTimers() {
        this.choiceTimers.forEach(timer => clearTimeout(timer));
        this.choiceTimers.clear();
    }

    async typewriterEffect(text) {
        const textDisplay = document.getElementById('text-display');
        const contentDiv = textDisplay.querySelector('.text-content');
        
        let index = 0;
        const SPEED_PER_MS = 30;
        const cursor = '<span class="typewriter-cursor">|</span>';
        
        return new Promise((resolve) => {
            const animate = () => {
                if (index < text.length) {
                    contentDiv.innerHTML = text.substring(0, index + 1) + cursor;
                    index++;
                    setTimeout(animate, SPEED_PER_MS + Math.random() * 20);
                } else {
                    contentDiv.innerHTML = text;
                    resolve();
                }
            };
            animate();
        });
    }

    showChoicesWithDelay(choices = []) {
        const visibleChoices = choices.filter(choice => {
            try {
                return this.checkRequirements(choice.requires || {});
            } catch (e) {
                console.error("Ошибка проверки условий:", e);
                return false;
            }
        });

        const choicesBox = document.getElementById('choices');
        if (!choicesBox) return;

        choicesBox.innerHTML = '';

        if (visibleChoices.length === 0) {
            this.showAutoContinueButton();
            return;
        }

        visibleChoices.forEach((choice, i) => {
            const btn = this.createChoiceButton(choice);
            choicesBox.appendChild(btn);
            
            setTimeout(() => {
                btn.classList.add('visible');
            }, i * 100);
        });
    }

    createChoiceButton(choice) {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice.text || "Без текста";
        btn.dataset.choiceId = choice.id || Math.random().toString(36).slice(2, 9);
        
        btn.addEventListener('click', () => this.handleChoice(choice));
        
        try {
            btn.disabled = !this.checkRequirements(choice.requires || {});
        } catch (e) {
            console.error("Ошибка требований:", e);
            btn.disabled = true;
        }

        return btn;
    }

    handleChoice(choice) {
        if (!choice?.next) {
            this.showError('Нет следующей главы');
            return;
        }

        this.applyEffects(choice.effects || {});

        if (choice.next === 'reveal_chapter') {
            this.revealChapter(choice.reveal);
        } else if (choice.next.startsWith('ending_')) {
            this.showEnding(choice.next);
        } else {
            this.loadChapter(choice.next);
        }
    }

    showAutoContinueButton() {
		const choicesBox = document.getElementById('choices');
		if (!choicesBox || !this.states.currentChapter) return;
	
		const autoBtn = document.createElement('button');
		autoBtn.className = 'choice-btn visible';
		autoBtn.textContent = 'Продолжить...';
		
		// Изменяем обработчик для загрузки следующей главы
		autoBtn.addEventListener('click', () => {
			const nextChapter = this.getNextChapterId(); // Новый метод
			if (nextChapter) {
				this.loadChapter(nextChapter);
			}
		});
		
		choicesBox.appendChild(autoBtn);
	}
	
	// Добавляем метод для определения следующей главы
	getNextChapterId() {
		// Пример простой логики, должна быть заменена вашей реализацией
		return this.currentChapterData?.default_next || 'chapter2';
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

    parseCondition(condition) {
        const match = condition.match(/(\w+)([<>=]+)(\d+)/);
        if (!match) return false;
        
        const [_, key, op, value] = match;
        const numValue = parseInt(value);
        
        switch(op) {
            case '>=': return this.states[key] >= numValue;
            case '<=': return this.states[key] <= numValue;
            case '<': return this.states[key] < numValue;
            case '>': return this.states[key] > numValue;
            case '=': return this.states[key] === numValue;
            default: return false;
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

    updateStatsDisplay() {
        const elements = {
            healthBar: document.getElementById('health-bar'),
            healthValue: document.getElementById('health-value'),
            magicBar: document.getElementById('magic-bar'),
            magicValue: document.getElementById('magic-value'),
            inventoryCount: document.getElementById('inventory-count'),
            liraTrust: document.getElementById('lira-trust'),
            moralValue: document.getElementById('moral-value'),
            goldValue: document.getElementById('gold-value'),
            sanityValue: document.getElementById('sanity-value'),
            fateValue: document.getElementById('fate-value'),
            combatValue: document.getElementById('combat-value'),
            insightValue: document.getElementById('insight-value'),
            churchHostility: document.getElementById('church-hostility')
        };

        // Обновление прогресс-баров
        if (elements.healthBar) elements.healthBar.style.width = `${this.states.health}%`;
        if (elements.magicBar) elements.magicBar.style.width = `${this.states.magic}%`;

        // Обновление текстовых значений
        const updateElement = (element, value) => {
            if (element) element.textContent = value;
        };

        updateElement(elements.healthValue, this.states.health);
        updateElement(elements.magicValue, this.states.magic);
        updateElement(elements.inventoryCount, `${this.states.inventory.length}/10`);
        updateElement(elements.liraTrust, this.states.lira_trust);
        updateElement(elements.moralValue, this.states.moral);
        updateElement(elements.goldValue, this.states.gold);
        updateElement(elements.sanityValue, this.states.sanity);
        updateElement(elements.fateValue, this.states.fate);
        updateElement(elements.combatValue, this.states.combat_skill);
        updateElement(elements.insightValue, this.states.insight);
        updateElement(elements.churchHostility, this.states.church_hostility);
    }

    revealChapter(chapterId) {
        if (!this.states.revealedChapters.includes(chapterId)) {
            this.states.revealedChapters.push(chapterId);
        }
        this.loadChapter(chapterId);
    }

    async showEnding(endingId) {
        try {
            const response = await fetch(`/endings/${endingId}.json`);
            const ending = await response.json();
            
            const gameContainer = document.getElementById('game-container');
            if (gameContainer) {
                gameContainer.style.backgroundImage = `url('/backgrounds/${ending.background}')`;
            }
            
            const endingHTML = `
                <div class="ending-box">
                    <h2>${ending.title || 'КОНЕЦ'}</h2>
                    <p>${ending.text}</p>
                    <button onclick="location.reload()">Новая игра</button>
                    <button onclick="showEndingsGallery()">Галерея концовок</button>
                </div>
            `;
            
            const textDisplay = document.getElementById('text-display');
            if (textDisplay) textDisplay.innerHTML = endingHTML;
            
            const choicesBox = document.getElementById('choices');
            if (choicesBox) choicesBox.innerHTML = '';
            
            this.states.endings_unlocked.push(endingId);
        } catch (error) {
            this.showError(`Ошибка концовки: ${error.message}`);
        }
    }

    handleAIResponse(faction, response) {
        switch(response) {
            case 'send_zealots':
                this.states.church_hostility += 10;
                break;
            case 'burn_forest':
                this.states.elina_trust -= 5;
                break;
        }
        this.updateStatsDisplay();
    }

    showError(message) {
        const errorHTML = `
            <div class="error-box">
                <h2>🛑 Ошибка</h2>
                <p>${message}</p>
                <button onclick="location.reload()">Перезагрузить</button>
            </div>
        `;
        
        const parser = new DOMParser();
        const errorNode = parser.parseFromString(errorHTML, 'text/html').body.firstChild;
        
        if (document.body) {
            document.body.appendChild(errorNode);
        } else {
            document.write(errorHTML);
        }
    }
}

const game = new Game();
const spellSystem = new SpellSystem(game);

function initGame() {
    const startBtn = document.getElementById('start-game-btn');
    if (!startBtn) return;

    startBtn.disabled = true;
    startBtn.textContent = "Загрузка...";

    const mainMenu = document.getElementById('main-menu');
    const gameContainer = document.getElementById('game-container');

    if (mainMenu) mainMenu.classList.add('hidden');
    if (gameContainer) gameContainer.classList.remove('hidden');

    // Сброс состояния игры
    Object.assign(game.states, {
        currentChapter: 'chapter1',
        magic: 0,
        lira_trust: 0,
        kyle_trust: 0,
        elina_trust: 0,
        moral: 50,
        gold: 10,
        health: 100,
        inventory: [],
        endings_unlocked: [],
        willpower: 5,
        persuasion: 0,
        intimidation: 0,
        revealedChapters: [],
        fate: 0,
        sanity: 10,
        church_hostility: 0,
        combat_skill: 0,
        insight: 0
    });

    game.loadChapter('chapter1')
        .catch(error => {
            console.error("Ошибка запуска:", error);
            if (mainMenu) mainMenu.classList.remove('hidden');
            if (gameContainer) gameContainer.classList.add('hidden');
            game.showError(`Ошибка запуска: ${error.message}`);
        })
        .finally(() => {
            startBtn.disabled = false;
            startBtn.textContent = "Начать Путь";
        });
}

function showEndingsGallery() {
    const endingsHTML = game.states.endings_unlocked.map(ending => 
        `<div class="ending-card">
            <h3>${ending.replace('ending_', '').replace(/_/g, ' ')}</h3>
            <button onclick="game.loadChapter('${ending}')">Посмотреть</button>
        </div>`
    ).join('');
    
    const galleryHTML = `
        <div class="endings-gallery">
            <h2>Галерея концовок</h2>
            <div class="endings-grid">${endingsHTML}</div>
            <button onclick="game.loadChapter(game.states.currentChapter)">Вернуться</button>
        </div>
    `;
    
    const textDisplay = document.getElementById('text-display');
    if (textDisplay) textDisplay.innerHTML = galleryHTML;
}