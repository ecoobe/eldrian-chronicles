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
            health: 100,
            currentChapter: 'chapter1',
            inventory: [],
            moral: 50 // 0-100 (50 - нейтральный)
        };
    }

    async loadChapter(chapterId) {
        try {
            const response = await fetch(`/chapters/${chapterId}.json`);
            const chapter = await response.json();
            this.renderChapter(chapter);
        } catch (error) {
            console.error('Error loading chapter:', error);
        }
    }

    renderChapter(chapter) {
        // Update background
        const gameContainer = document.getElementById('game-container');
        gameContainer.style.backgroundImage = `url('/backgrounds/${chapter.background}')`;

        // Update text
        document.getElementById('text-display').innerHTML = chapter.text;

        // Clear previous choices
        const choicesBox = document.getElementById('choices');
        choicesBox.innerHTML = '';

        // Create new choices
        chapter.choices.forEach(choice => {
            // Check hidden condition
            if (choice.hidden && !this.checkCondition(choice.condition)) return;

            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.innerHTML = choice.text;

            // Check requirements
            if (choice.requires && !this.checkRequirements(choice.requires)) {
                btn.disabled = true;
                btn.innerHTML += ` (Требуется: ${this.parseRequirements(choice.requires)})`;
            }

            // Add click handler
            btn.addEventListener('click', () => {
                if (choice.effects) this.applyEffects(choice.effects);
                this.states.currentChapter = choice.next;
                this.loadChapter(choice.next);
            });

            choicesBox.appendChild(btn);
        });

        // Update stats display
        document.getElementById('magic-level').textContent = this.states.magic;
        document.getElementById('lira-trust').textContent = this.states.lira_trust;
    }

    checkRequirements(requires) {
        if (!requires) return true;
        return Object.entries(requires).every(([key, val]) => {
            if (key === 'inventory') {
                return this.states.inventory.includes(val);
            }
            return this.states[key] >= val;
        });
    }

    checkCondition(condition) {
        if (!condition) return true;
        
        // Inventory check
        if (condition.startsWith('inventory.includes')) {
            const item = condition.match(/'([^']+)'/)[1];
            return this.states.inventory.includes(item);
        }
        
        // State check
        return this.states[condition] !== undefined ? this.states[condition] : false;
    }

    applyEffects(effects) {
        Object.entries(effects).forEach(([key, value]) => {
            if (key === 'inventory') {
                if (Array.isArray(value)) {
                    this.states.inventory.push(...value);
                } else {
                    this.states.inventory.push(value);
                }
            } else if (key === 'moral') {
                this.states.moral = Math.max(0, Math.min(100, this.states.moral + value));
            } else {
                this.states[key] = (this.states[key] || 0) + value;
            }
		document.getElementById('inventory').textContent = 
        this.states.inventory.join(', ') || 'пусто';
        });
    }

    parseRequirements(requires) {
        return Object.entries(requires).map(([key, val]) => {
            if (key === 'inventory') return val;
            return `${key} ≥ ${val}`;
        }).join(', ');
    }

    init() {
        this.loadChapter(this.states.currentChapter);
    }

	async loadChapter(chapterId) {
		try {
			const response = await fetch(`/chapters/${chapterId}.json`);
			if (!response.ok) throw new Error(`Глава ${chapterId} не найдена`);
			const chapter = await response.json();
			this.renderChapter(chapter);
		} catch (error) {
			console.error('Ошибка:', error);
			document.getElementById('text-display').innerHTML = 
				`<p style="color: red">Ошибка загрузки главы: ${error.message}</p>`;
		}
	}
}

const game = new Game();
game.init();