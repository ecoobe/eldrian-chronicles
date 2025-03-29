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
        if (this.isLoading || this.states.currentChapter === chapterId) return;
        this.isLoading = true;

        try {
            const response = await fetch(`/chapters/${chapterId}.json`);
            const chapter = await response.json();
            this.states.currentChapter = chapterId;
            this.renderChapter(chapter);
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('text-display').innerHTML = `
                <p style="color:red">Ошибка загрузки: ${error.message}</p>
            `;
        } finally {
            this.isLoading = false;
        }
    }

    renderChapter(chapter) {
        const textDisplay = document.getElementById('text-display');
        const choicesBox = document.getElementById('choices');
        if (!textDisplay || !choicesBox) return;

        textDisplay.innerHTML = chapter.text;
        choicesBox.innerHTML = '';

        chapter.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = choice.text;
            btn.onclick = () => {
                this.applyEffects(choice.effects || {});
                this.loadChapter(choice.next);
            };
            choicesBox.appendChild(btn);
        });

        document.getElementById('health-bar').style.width = `${this.states.health}%`;
        document.getElementById('health-value').textContent = this.states.health;
    }

    applyEffects(effects) {
        Object.entries(effects).forEach(([key, value]) => {
            if (key === 'health') {
                this.states.health = Math.max(0, this.states.health + value);
            }
        });
    }
}

// Инициализация после объявления класса
const game = new Game();

document.getElementById('start-game-btn').addEventListener('click', () => {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    game.loadChapter('chapter1');
});