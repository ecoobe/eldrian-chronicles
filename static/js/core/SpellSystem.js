export class SpellSystem {
    constructor(game) {
        this.game = game;
        this.modalElements = this.validateModalElements();
        this.registerEventHandlers();
    }

    validateModalElements() {
        const elements = {
            modal: document.getElementById('spell-modal'),
            choices: document.getElementById('spell-choices'),
            closeButton: document.getElementById('close-spell-modal')
        };

        Object.entries(elements).forEach(([name, element]) => {
            if (!element) {
                throw new Error(`Missing required spell modal element: ${name}`);
            }
        });

        return elements;
    }

    registerEventHandlers() {
        this.modalElements.modal.addEventListener('click', event => {
            if (event.target === this.modalElements.modal) {
                this.close();
            }
        });

        this.modalElements.closeButton.addEventListener('click', () => this.close());
    }

    show(spells) {
        try {
            this.validateSpells(spells);
            this.renderSpells(spells);
            this.open();
        } catch (error) {
            this.handleSpellError(error);
        }
    }

    validateSpells(spells) {
        if (!spells || typeof spells !== 'object') {
            throw new Error('Invalid spells data format');
        }

        Object.entries(spells).forEach(([key, spell]) => {
            if (!spell.name || !spell.requirements) {
                throw new Error(`Spell ${key} missing required properties`);
            }
        });
    }

    renderSpells(spells) {
        this.modalElements.choices.replaceChildren(
            ...Object.entries(spells).map(([spellId, spellData]) => 
                this.createSpellButton(spellId, spellData)
            )
        );
    }

    createSpellButton(spellId, spellData) {
        const button = document.createElement('button');
        button.className = 'spell-choice';
        button.textContent = spellData.name;
        button.disabled = !this.isSpellAvailable(spellData.requirements);

        if (!button.disabled) {
            button.addEventListener('click', () => 
                this.handleSpellSelection(spellId)
            );
        }

        return button;
    }

    isSpellAvailable(requirements) {
        return this.game.systems.choice.checkRequirements(requirements);
    }

    async handleSpellSelection(spellId) {
        try {
            const success = await this.game.systems.magic.castSpell(spellId);
            if (success) {
                this.close();
            }
        } catch (error) {
            showError(`Spell execution error: ${error.message}`);
        }
    }

    open() {
        this.modalElements.modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    close() {
        this.modalElements.modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        this.clearSpells();
    }

    clearSpells() {
        this.modalElements.choices.innerHTML = '';
    }

    handleSpellError(error) {
        console.error('Spell system error:', error);
        this.close();
        this.game.loadChapter('chapter1').catch(console.error);
    }
}