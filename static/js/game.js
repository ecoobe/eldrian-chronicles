class Game {
    constructor() {
        this.states = {
            magic: 0,
            lira_trust: 0,
            currentChapter: 'chapter1',
            inventory: []
        };
    }

    async loadChapter(chapterId) {
        const response = await fetch(`/chapters/${chapterId}.json`);
        const chapter = await response.json();
        this.renderChapter(chapter);
    }

    renderChapter(chapter) {
        // Фон
        document.getElementById('game-container').style.backgroundImage = 
            `url('/backgrounds/${chapter.background}')`;
        
        // Текст
        document.getElementById('text-display').innerHTML = chapter.text;
        
        // Выборы
        const choicesBox = document.getElementById('choices');
        choicesBox.innerHTML = chapter.choices
            .filter(choice => !choice.hidden || this.checkCondition(choice.condition))
            .map(choice => `
                <button class="choice-btn" 
                        ${this.checkRequirements(choice.requires) ? '' : 'disabled'}
                        onclick="game.selectChoice('${choice.next}')">
                    ${choice.text}
                </button>
            `).join('');
    }

    checkRequirements(requires) {
        if (!requires) return true;
        return Object.entries(requires).every(([key, val]) => this.states[key] >= val);
    }

    checkCondition(condition) {
        // Логика для скрытых выборов
        return condition ? this.states[condition] : true;
    }

    selectChoice(nextChapter) {
        this.states.currentChapter = nextChapter;
        this.loadChapter(nextChapter);
    }

    init() {
        this.loadChapter(this.states.currentChapter);
    }
}

const game = new Game();
game.init();