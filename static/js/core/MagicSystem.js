import { showError, updateStatsDisplay } from '../utils/helpers.js';

export class MagicSystem {
    constructor(game) {
        this.game = game;
        this.leyLines = this.initializeLeyLines();
    }

    initializeLeyLines() {
        return new Map([
            ['blood', {
                strength: 0.7, 
                alignment: 'chaos',
                requiredSkill: 'dark_magic'
            }],
            ['void', {
                strength: 1.2,
                alignment: 'eldritch',
                requiredSkill: 'eldritch_knowledge'
            }],
            ['nature', {
                strength: 0.9,
                alignment: 'order',
                requiredSkill: 'druidism'
            }]
        ]);
    }

    async castSpell(spellName) {
        try {
            const spell = this.validateSpell(spellName);
            this.verifySpellRequirements(spell);
            
            const power = this.calculateSpellPower(spell);
            if (power < spell.threshold) {
                throw new Error(`Insufficient spell power: ${power}/${spell.threshold}`);
            }

            await this.applySpellEffects(spell.effects);
            return true;
        } catch (error) {
            showError(`Spell casting failed: ${error.message}`);
            return false;
        }
    }

    validateSpell(spellName) {
        const spell = this.game.currentChapterData?.spells?.[spellName];
        if (!spell) throw new Error(`Spell "${spellName}" not found`);
        
        const requiredFields = ['element', 'skill', 'threshold', 'effects'];
        requiredFields.forEach(field => {
            if (!(field in spell)) {
                throw new Error(`Spell missing required field: ${field}`);
            }
        });
        
        return spell;
    }

    verifySpellRequirements(spell) {
        const leyLine = this.leyLines.get(spell.element);
        if (!leyLine) {
            throw new Error(`Unknown magic element: ${spell.element}`);
        }

        if (this.game.states[leyLine.requiredSkill] < 1) {
            throw new Error(`Requires ${leyLine.requiredSkill} skill`);
        }
    }

    calculateSpellPower(spell) {
        const leyLine = this.leyLines.get(spell.element);
        const skillValue = this.game.states[spell.skill] || 0;
        return leyLine.strength * skillValue;
    }

    async applySpellEffects(effects) {
        for (const effect of effects) {
            await this.processEffect(effect);
        }
        updateStatsDisplay(this.game.states);
    }

    async processEffect(effect) {
        switch(effect.type) {
            case 'faction_reaction':
                await this.handleFactionReaction(effect);
                break;
            case 'stat_change':
                this.applyStatChange(effect);
                break;
            case 'environment_change':
                await this.changeEnvironment(effect);
                break;
            default:
                console.warn(`Unknown effect type: ${effect.type}`);
        }
    }

    async handleFactionReaction(effect) {
        const factionAI = this.game.currentChapterData?.faction_ai?.[effect.faction];
        if (!factionAI) return;

        const reaction = this.determineFactionReaction(factionAI);
        if (reaction) {
            await this.game.loadChapter(reaction.chapter);
        }
    }

    determineFactionReaction(factionAI) {
        return factionAI.strategies.find(strategy => 
            this.game.systems.choice.checkRequirements(strategy.conditions)
        );
    }

    applyStatChange(effect) {
        const { target, value } = effect;
        const current = this.game.states[target] || 0;
        
        this.game.states[target] = this.clampValue(
            current + value, 
            target
        );
    }

    clampValue(value, stat) {
        const ranges = {
            health: [0, 100],
            sanity: [0, 10],
            fate: [0, 10],
            default: [0, Infinity]
        };
        
        const [min, max] = ranges[stat] || ranges.default;
        return Math.min(Math.max(value, min), max);
    }

    async changeEnvironment(effect) {
        // Реализация изменения окружения
    }
}