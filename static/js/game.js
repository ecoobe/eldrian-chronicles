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
        this.clearChoiceTimers();

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
                this.parseComplexCondition(condition)
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

    parseComplexCondition(condition) {
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
            fateValue: document.getElementById('fate-value')
        };

        elements.healthBar.style.width = `${this.states.health}%`;
        elements.healthValue.textContent = this.states.health;
        elements.magicBar.style.width = `${this.states.magic}%`;
        elements.magicValue.textContent = this.states.magic;
        elements.inventoryCount.textContent = `${this.states.inventory.length}/10`;
        elements.liraTrust.textContent = this.states.lira_trust;
        elements.moralValue.textContent = this.states.moral;
        elements.goldValue.textContent = this.states.gold;
        elements.sanityValue.textContent = this.states.sanity;
        elements.fateValue.textContent = this.states.fate;
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
    
    game.loadChapter('chapter1');
}

function showEndingsGallery() {
    // Реализация галереи концовок
    console.log("Показать галерею концовок");
}