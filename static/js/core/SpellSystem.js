export class SpellSystem {
    constructor(game) {
        this.game = game;
        this.modal = document.getElementById('spell-modal');
        this.spellChoices = document.getElementById('spell-choices');
        this.closeButton = document.getElementById('close-spell-modal');
        this.initModal();
    }

    initModal() {
        if (!this.modal || !this.closeButton) {
            console.error('Spell modal elements not found');
            return;
        }

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
        
        this.closeButton.addEventListener('click', () => this.closeModal());
    }

    showSpells(spells) {
        if (!this.validateSpells(spells)) return;

        this.clearSpellChoices();
        this.renderSpellButtons(spells);
        this.openModal();
    }

    validateSpells(spells) {
        return spells && 
               typeof spells === 'object' && 
               Object.keys(spells).length > 0 &&
               this.spellChoices;
    }

    clearSpellChoices() {
        this.spellChoices.innerHTML = '';
    }

    renderSpellButtons(spells) {
        Object.entries(spells).forEach(([name, data]) => {
            const btn = this.createSpellButton(name, data);
            this.spellChoices.appendChild(btn);
        });
    }

    createSpellButton(name, data) {
        const btn = document.createElement('div');
        btn.className = this.getSpellButtonClass(data);
        btn.textContent = data.name || name;
        
        if (this.isSpellAvailable(data)) {
            btn.addEventListener('click', () => this.handleSpellClick(name));
        }
        
        return btn;
    }

    getSpellButtonClass(data) {
        const baseClass = 'spell-choice';
        return this.isSpellAvailable(data) ? 
            baseClass : `${baseClass} disabled`;
    }

    isSpellAvailable(data) {
        return this.game.systems.choice.checkRequirements(data);
    }

    handleSpellClick(spellName) {
        this.game.systems.magic.castSpell(spellName);
        this.closeModal();
    }

    openModal() {
        if (this.modal) this.modal.classList.remove('hidden');
    }

    closeModal() {
        if (this.modal) this.modal.classList.add('hidden');
    }
}