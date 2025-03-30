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
    if (!container) return;

    const img = container.querySelector(`[data-character="${characterId}"]`);
    if (img) {
        img.src = `/sprites/${sprite}`;
        img.classList.add('sprite-updated');
        setTimeout(() => img.classList.remove('sprite-updated'), 300);
    }
}

export function showDialogue({ speaker, text, position = 'center', mood = 'neutral' }) {
    const dialogueBox = document.getElementById('dialogue-box');
    if (!dialogueBox) return;

    // Создаем элементы безопасным способом
    const wrapper = document.createElement('div');
    wrapper.className = `dialogue ${position} ${mood}`;
    
    const speakerElement = document.createElement('span');
    speakerElement.className = 'speaker';
    speakerElement.textContent = `${speaker}: `;
    
    const textElement = document.createElement('div');
    textElement.className = 'dialogue-text';
    textElement.textContent = text; // Используем textContent вместо innerHTML

    wrapper.append(speakerElement, textElement);
    
    dialogueBox.innerHTML = ''; // Очищаем предыдущий контент
    dialogueBox.appendChild(wrapper);
    dialogueBox.classList.remove('hidden');
    
    setTimeout(() => dialogueBox.classList.add('visible'), 50);
}

export function updateStatsDisplay(states) {
    const safeStates = states || {};
    
    // Получение элементов с проверкой
    const getElement = id => document.getElementById(id) || null;
    
    const elements = {
        healthBar: getElement('health-bar'),
        healthValue: getElement('health-value'),
        magicBar: getElement('magic-bar'),
        magicValue: getElement('magic-value'),
        inventoryCount: getElement('inventory-count'),
        liraTrust: getElement('lira-trust'),
        moralValue: getElement('moral-value'),
        goldValue: getElement('gold-value'),
        sanityValue: getElement('sanity-value'),
        fateValue: getElement('fate-value'),
        combatValue: getElement('combat-value'),
        insightValue: getElement('insight-value'),
        churchHostility: getElement('church-hostility')
    };

    // Обновление прогресс-баров
    const updateProgress = (element, value) => {
        if (element) {
            const clampedValue = clamp(value, 0, 100);
            element.style.width = `${clampedValue}%`;
        }
    };

    updateProgress(elements.healthBar, safeStates.health || 0);
    updateProgress(elements.magicBar, safeStates.magic || 0);

    // Обновление текстовых значений
    const updateText = (element, value) => {
        if (element) element.textContent = value ?? '-';
    };

    updateText(elements.healthValue, safeStates.health);
    updateText(elements.magicValue, safeStates.magic);
    updateText(elements.inventoryCount, `${safeStates.inventory?.length || 0}/10`);
    updateText(elements.liraTrust, safeStates.lira_trust);
    updateText(elements.moralValue, safeStates.moral);
    updateText(elements.goldValue, safeStates.gold);
    updateText(elements.sanityValue, safeStates.sanity);
    updateText(elements.fateValue, safeStates.fate);
    updateText(elements.combatValue, safeStates.combat_skill);
    updateText(elements.insightValue, safeStates.insight);
    updateText(elements.churchHostility, safeStates.church_hostility);
}

export function showError(message) {
    const errorBox = document.createElement('div');
    errorBox.className = 'error-box';
    
    const title = document.createElement('h2');
    title.textContent = '🛑 Ошибка';
    
    const text = document.createElement('p');
    text.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'error-close-btn';
    closeButton.textContent = 'Закрыть';
    closeButton.onclick = () => errorBox.remove();

    errorBox.append(title, text, closeButton);
    document.body.appendChild(errorBox);
}