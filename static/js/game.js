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
		// Новая логика для сложных условий
		if (condition.includes("&&")) {
		  return condition.split("&&").every(c => this.checkSingleCondition(c.trim()));
		}
		if (condition.includes("||")) {
		  return condition.split("||").some(c => this.checkSingleCondition(c.trim()));
		}
		return this.checkSingleCondition(condition);
	}

	checkCondition(condition) {
		const evaluate = (cond) => {
		  if (cond.all) return cond.all.every(evaluate);
		  if (cond.any) return cond.any.some(evaluate);
		  
		  const [key] = Object.keys(cond);
		  const value = cond[key];
		  
		  // Проверка инвентаря
		  if (key === 'inventory') {
			return Array.isArray(value) 
			  ? value.every(item => this.states.inventory.includes(item))
			  : this.states.inventory.includes(value);
		  }
		  
		  // Проверка отношений
		  if (key.endsWith('_trust') || key === 'moral') {
			const match = value.match(/^([<>]=?|==?)\s*(-?\d+)$/);
			if (match) {
			  const [, operator, num] = match;
			  return this.compareValues(this.states[key], operator, parseInt(num));
			}
			return this.states[key] >= parseInt(value);
		  }
		  
		  return false;
		};
		
		return evaluate(condition);
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

	compareValues(a, operator, b) {
		switch(operator) {
		  case '>': return a > b;
		  case '<': return a < b;
		  case '>=': return a >= b;
		  case '<=': return a <= b;
		  case '==': return a === b;
		  default: return false;
		}
	}
}

const game = new Game();
game.init();