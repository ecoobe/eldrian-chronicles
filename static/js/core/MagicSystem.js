export class MagicSystem {
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
            return true;
        }
        
        showError("Недостаточно силы для этого заклинания!");
        return false;
    }

    applySpellEffects(effects = []) {
        effects.forEach(effect => {
            if (effect.type === 'faction_reaction') {
                this.triggerFactionAI(effect.faction, effect.action);
            } else if (effect.type === 'stat_change') {
                this.game.states[effect.target] += effect.value;
            }
        });
        updateStatsDisplay(this.game.states);
    }

    triggerFactionAI(faction, action) {
        const ai = this.game.currentChapterData?.faction_ai?.[faction];
        if (!ai) return;

        if (ai.strategy) {
            const condition = ai.strategy.if?.replace('player_moral', this.game.states.moral) || '';
            if (this.game.systems.choice.parseCondition(condition)) {
                ai.strategy.then?.forEach(response => {
                    this.game.systems.choice.handleAIResponse(faction, response);
                });
            }
        }
    }
}