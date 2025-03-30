export class SpellSystem {
    constructor(game) {
        this.game = game;
        this.modal = document.getElementById('spell-modal');
        this.spellChoices = document.getElementById('spell-choices');
        this.initModal();
    }

    initModal() {
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
        
        document.getElementById('close-spell-modal')?.addEventListener('click', () => {
            this.closeModal();
        });
    }

    showSpells(spells) {
        if (!spells || Object.keys(spells).length === 0) return;

        this.spellChoices.innerHTML = '';
        Object.entries(spells).forEach(([name, data]) => {
            const btn = this.createSpellButton(name, data);
            this.spellChoices.appendChild(btn);
        });
        
        this.modal.classList.remove('hidden');
    }

    createSpellButton(name, data) {
        const btn = document.createElement('div');
        btn.className = `spell-choice ${this.game.checkRequirements(data) ? '' : 'disabled'}`;
        btn.textContent = data.name || name;
        
        if (this.game.checkRequirements(data)) {
            btn.onclick = () => {
                this.game.systems.magic.castSpell(name);
                this.closeModal();
            };
        }
        
        return btn;
    }

    closeModal() {
        this.modal.classList.add('hidden');
    }
}