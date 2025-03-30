import { showError, updateStatsDisplay } from '../utils/helpers.js';

export class MagicSystem {
    constructor(game) {
        this.game = game;
        this.leyLines = new Map([
            ['blood', { strength: 0.7, alignment: 'chaos' }],
            ['void', { strength: 1.2, alignment: 'eldritch' }],
            ['nature', { strength: 0.9, alignment: 'order' }]
        ]);
    }

    castSpell(spellName) {
        try {
            const spell = this.getSpell(spellName);
            const power = this.calculatePower(spell);
            
            if (power > spell.threshold) {
                this.applySpellEffects(spell.effects);
                return true;
            }
            
            showError(`Недостаточно силы для ${spell.name || spellName}!`);
            return false;
            
        } catch (error) {
            showError(`Ошибка заклинания: ${error.message}`);
            return false;
        }
    }

    getSpell(spellName) {
        const spell = this.game.currentChapterData?.spells?.[spellName];
        if (!spell) throw new Error(`Заклинание "${spellName}" не найдено`);
        return spell;
    }

    calculatePower(spell) {
        const leyLine = this.leyLines.get(spell.element);
        if (!leyLine) throw new Error(`Неизвестный элемент: ${spell.element}`);
        
        const skillValue = this.game.states[spell.skill] || 0;
        return leyLine.strength * skillValue;
    }

    applySpellEffects(effects = []) {
        effects.forEach(effect => {
            switch(effect.type) {
                case 'faction_reaction':
                    this.handleFactionReaction(effect);
                    break;
                case 'stat_change':
                    this.applyStatChange(effect);
                    break;
                default:
                    console.warn(`Неизвестный тип эффекта: ${effect.type}`);
            }
        });
        updateStatsDisplay(this.game.states);
    }

    handleFactionReaction(effect) {
        const ai = this.game.currentChapterData?.faction_ai?.[effect.faction];
        if (!ai) return;

        const strategy = ai.strategy;
        if (strategy?.if && this.checkStrategyCondition(strategy.if)) {
            this.executeStrategyActions(strategy.then, effect.faction);
        }
    }

    checkStrategyCondition(condition) {
        try {
            return this.game.systems.choice.parseCondition(
                condition.replace('player_moral', this.game.states.moral)
            );
        } catch (e) {
            console.error(`Ошибка проверки условия: ${e.message}`);
            return false;
        }
    }

    executeStrategyActions(actions, faction) {
        if (!Array.isArray(actions)) return;
        
        actions.forEach(action => {
            console.log(`Фракция ${faction} реагирует: ${action}`);
            this.game.systems.choice.handleAIResponse(faction, action);
        });
    }

    applyStatChange(effect) {
        const currentValue = this.game.states[effect.target] || 0;
        const newValue = currentValue + effect.value;
        
        switch(effect.target) {
            case 'health':
                this.game.states[effect.target] = Math.clamp(newValue, 0, 100);
                break;
            case 'sanity':
            case 'fate':
                this.game.states[effect.target] = Math.clamp(newValue, 0, 10);
                break;
            default:
                this.game.states[effect.target] = Math.max(newValue, 0);
        }
    }
}