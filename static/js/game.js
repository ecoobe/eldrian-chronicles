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
        const spell = this.game.currentChapterData.spells?.[spellName];
        if (!spell) return false;

        const leyLine = this.leyLines[spell.element];
        const power = leyLine.strength * this.game.states[spell.skill];
        
        if (power > spell.threshold) {
            this.applySpellEffects(spell.effects);
            this.game.updateStatsDisplay();
            return true;
        } else {
            this.game.showError("Недостаточно силы для этого заклинания!");
            return false;
        }
    }

    applySpellEffects(effects) {
        effects.forEach(effect => {
            if (effect.type === 'faction_reaction') {
                this.triggerFactionAI(effect.faction, effect.action);
            } else if (effect.type === 'stat_change') {
                this.game.states[effect.target] += effect.value;
            }
        });
    }

    triggerFactionAI(faction, action) {
        const ai = this.game.currentChapterData.faction_ai?.[faction];
        if (!ai) return;

        if (ai.strategy) {
            const condition = ai.strategy.if.replace('player_moral', this.game.states.moral);
            if (this.game.parseCondition(condition)) {
                ai.strategy.then.forEach(response => {
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
        
        this.closeBtn.addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
    }

    showSpells(spells) {
		// Проверяем что spells - объект и не пустой
		if (!spells || typeof spells !== 'object' || Object.keys(spells).length === 0) {
			this.closeModal();
			return;
		}

        this.spellChoices.innerHTML = '';
        
        Object.entries(spells).forEach(([spellName, spellData]) => {
            const spellBtn = document.createElement('div');
            spellBtn.className = 'spell-choice';
            spellBtn.textContent = spellData.name || spellName;
            spellBtn.onclick = () => {
                this.game.magicSystem.castSpell(spellName);
                this.closeModal();
            };
            
            if (!this.game.checkSpellRequirements(spellData)) {
                spellBtn.classList.add('disabled');
                spellBtn.onclick = null;
            }
            
            this.spellChoices.appendChild(spellBtn);
        });
        
        this.modal.classList.remove('hidden');
    }

    closeModal() {
		console.log('Closing spell modal');
        this.modal.classList.add('hidden');
    }
}

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
        return this.states[spellData.skill] >= spellData.threshold;
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

            const response = await fetch(`${path}?t=${Date.now()}`);
            
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            const data = await response.json();
            this.currentChapterData = data;

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
        this.clearChoiceTimers();
		spellSystem.closeModal();

        let content = data;
        if (data.variants) {
            content = data.variants.find(v => this.checkVariantConditions(v)) || data;
        }

        await this.startBgTransition(content);
        await this.typewriterEffect(content.text);
        this.showChoicesWithDelay(content.choices || []);
        this.updateStatsDisplay();
        this.updateFactionAI();
        this.updateEcosystem();

        if (content.spells && Object.keys(content.spells).length > 0) {
			spellSystem.showSpells(content.spells);
		}
    }

    clearChoiceTimers() {
        this.choiceTimers.forEach(timer => clearTimeout(timer));
        this.choiceTimers.clear();
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
            if (key === 'not_inventory') {
                return Array.isArray(value)
                    ? value.every(item => !this.states.inventory.includes(item))
                    : !this.states.inventory.includes(value);
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
			console.log(`[DEBUG] Пытаюсь загрузить фон: /backgrounds/${background}`);
            const gameContainer = document.getElementById('game-container');
            const bgImage = new Image();
            
            bgImage.onload = () => {
				console.log(`[DEBUG] Фон успешно загружен: ${bgImage.src}`);
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

        visibleChoices.forEach((choice, i) => {
            setTimeout(() => {
                const btn = this.createChoiceButton(choice);
                this.fadeInElement(btn);
                choicesBox.appendChild(btn);
                
                if (choice.timeout) {
                    this.startChoiceTimer(choice, choice.timeout);
                }
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
        
        if (choice.danger) btn.dataset.danger = "true";
        if (choice.hidden) btn.dataset.hidden = "true";
        if (choice.timeout) btn.dataset.timer = choice.timeout;
        
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

    startChoiceTimer(choice, duration) {
        const timer = setTimeout(() => {
            this.autoResolveChoice(choice);
        }, duration * 1000);
        this.choiceTimers.set(choice.id || choice.text, timer);
    }

    autoResolveChoice(choice) {
        console.log(`Автовыбор: ${choice.text}`);
        this.handleChoice(choice);
    }

    handleChoice(choice) {
        if (!choice.next) {
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
                <button onclick="showEndingsGallery()">Галерея концовок</button>
            </div>
        `;
        
        document.getElementById('text-display').innerHTML = endingHTML;
        document.getElementById('choices').innerHTML = '';
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
            goldValue: document.getElementById('gold-value') || { textContent: '' },
            sanityValue: document.getElementById('sanity-value') || { textContent: '' },
            fateValue: document.getElementById('fate-value') || { textContent: '' },
            combatValue: document.getElementById('combat-value') || { textContent: '' },
            insightValue: document.getElementById('insight-value') || { textContent: '' },
            churchHostility: document.getElementById('church-hostility') || { textContent: '' }
        };

        if (elements.healthBar) elements.healthBar.style.width = `${this.states.health}%`;
        if (elements.healthValue) elements.healthValue.textContent = this.states.health;
        if (elements.magicBar) elements.magicBar.style.width = `${this.states.magic}%`;
        if (elements.magicValue) elements.magicValue.textContent = this.states.magic;
        if (elements.inventoryCount) elements.inventoryCount.textContent = `${this.states.inventory.length}/10`;
        if (elements.liraTrust) elements.liraTrust.textContent = this.states.lira_trust;
        if (elements.moralValue) elements.moralValue.textContent = this.states.moral;
        if (elements.goldValue) elements.goldValue.textContent = this.states.gold;
        if (elements.sanityValue) elements.sanityValue.textContent = this.states.sanity;
        if (elements.fateValue) elements.fateValue.textContent = this.states.fate;
        if (elements.combatValue) elements.combatValue.textContent = this.states.combat_skill;
        if (elements.insightValue) elements.insightValue.textContent = this.states.insight;
        if (elements.churchHostility) elements.churchHostility.textContent = this.states.church_hostility;
    }

    updateFactionAI() {
        Object.entries(this.currentChapterData?.faction_ai || {}).forEach(([faction, ai]) => {
            if (!this.factionStates[faction]) {
                this.factionStates[faction] = {
                    mood: ai.mood?.[0] || 'neutral',
                    memory: []
                };
            }
            
            if (this.states.moral > 60 && ai.mood?.includes('benevolent')) {
                this.factionStates[faction].mood = 'benevolent';
            }
        });
    }

    updateEcosystem() {
        const now = Date.now();
        const hoursPassed = (now - this.ecosystem.lastUpdate) / (1000 * 60 * 60);
        
        if (hoursPassed < 1) return;
        
        if (this.currentChapterData?.ecosystem?.predators) {
            Object.entries(this.currentChapterData.ecosystem.predators).forEach(([species, count]) => {
                this.ecosystem.predators[species] = count * (1 - 0.05 * hoursPassed);
            });
        }
        
        this.ecosystem.lastUpdate = now;
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
        document.body.innerHTML = errorHTML;
    }
}

const game = new Game();
const spellSystem = new SpellSystem(game);

function initGame() {
    console.log("[DEBUG] Нажата кнопка 'Начать путь'");
    
    const mainMenu = document.getElementById('main-menu');
    const gameContainer = document.getElementById('game-container');
    
    if (!mainMenu || !gameContainer) {
        console.error("Ошибка: Не найдены необходимые элементы DOM");
        return;
    }

    // Убираем дублирование
    mainMenu.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    spellSystem.closeModal();

    // Инициализация состояния игры
    game.states = {
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
        revealedChapters: [],
        fate: 0,
        sanity: 10,
        church_hostility: 0,
        combat_skill: 0,
        insight: 0
    };
    
    console.log("[DEBUG] Загрузка chapter1...");
    game.loadChapter('chapter1').catch(error => {
        console.error("Ошибка при загрузке главы:", error);
        game.showError(`Не удалось загрузить игру: ${error.message}`);
    });
}

function showEndingsGallery() {
    const endingsHTML = game.states.endings_unlocked.map(ending => 
        `<div class="ending-card">
            <h3>${ending.replace('ending_', '').replace(/_/g, ' ')}</h3>
            <button onclick="game.loadChapter('${ending}')">Посмотреть</button>
        </div>`
    ).join('');
    
    document.getElementById('text-display').innerHTML = `
        <div class="endings-gallery">
            <h2>Галерея концовок</h2>
            <div class="endings-grid">${endingsHTML}</div>
            <button onclick="game.loadChapter(game.states.currentChapter)">Вернуться</button>
        </div>
    `;
}