export async function loadBackground(background) {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) {
        throw new Error('Game container element not found');
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            gameContainer.style.backgroundImage = `url(${img.src})`;
            resolve();
        };
        img.onerror = () => reject(new Error(`Failed to load background: ${background}`));
        img.src = `/backgrounds/${background}`;
    });
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function updateCharacterSprite(characterId, sprite) {
    const container = document.getElementById('character-container');
    const img = container.querySelector(`[data-character="${characterId}"]`);
    
    if (img) {
        img.src = `/sprites/${sprite}`;
        img.classList.add('sprite-updated');
        setTimeout(() => img.classList.remove('sprite-updated'), 300);
    }
}

export function showDialogue({ speaker, text, position = 'center', mood = 'neutral' }) {
    const dialogueBox = document.getElementById('dialogue-box');
    dialogueBox.innerHTML = `
        <div class="dialogue ${position} ${mood}">
            <span class="speaker">${speaker}:</span>
            ${text}
        </div>
    `;
    dialogueBox.classList.remove('hidden');
    
    setTimeout(() => dialogueBox.classList.add('visible'), 50);
}

export function updateStatsDisplay(states) {
    const elements = {
        healthBar: document.getElementById('health-bar'),
        healthValue: document.getElementById('health-value'),
        magicBar: document.getElementById('magic-bar'),
        magicValue: document.getElementById('magic-value'),
        inventoryCount: document.getElementById('inventory-count'),
        liraTrust: document.getElementById('lira-trust'),
        moralValue: document.getElementById('moral-value'),
        goldValue: document.getElementById('gold-value'),
        sanityValue: document.getElementById('sanity-value'),
        fateValue: document.getElementById('fate-value'),
        combatValue: document.getElementById('combat-value'),
        insightValue: document.getElementById('insight-value'),
        churchHostility: document.getElementById('church-hostility')
    };

    // Обновление прогресс-баров
    const updateProgress = (element, value) => {
        if (element) element.style.width = `${Math.min(100, Math.max(0, value))}%`;
    };

    updateProgress(elements.healthBar, states.health);
    updateProgress(elements.magicBar, states.magic);

    // Обновление текстовых значений
    const updateText = (element, value) => {
        if (element) element.textContent = value;
    };

    updateText(elements.healthValue, states.health);
    updateText(elements.magicValue, states.magic);
    updateText(elements.inventoryCount, `${states.inventory.length}/10`);
    updateText(elements.liraTrust, states.lira_trust);
    updateText(elements.moralValue, states.moral);
    updateText(elements.goldValue, states.gold);
    updateText(elements.sanityValue, states.sanity);
    updateText(elements.fateValue, states.fate);
    updateText(elements.combatValue, states.combat_skill);
    updateText(elements.insightValue, states.insight);
    updateText(elements.churchHostility, states.church_hostility);
}

export function showError(message) {
    const errorHTML = `
        <div class="error-box">
            <h2>🛑 Ошибка</h2>
            <p>${message}</p>
            <button class="error-close-btn">Закрыть</button>
        </div>
    `;

    const errorElement = document.createElement('div');
    errorElement.innerHTML = errorHTML;
    document.body.appendChild(errorElement);

    errorElement.querySelector('.error-close-btn').addEventListener('click', () => {
        errorElement.remove();
    });
}