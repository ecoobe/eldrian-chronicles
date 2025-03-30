export async function loadBackground(background) {
    return new Promise((resolve, reject) => {
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return reject('Игровой контейнер не найден');

        const img = new Image();
        img.onload = () => {
            gameContainer.style.backgroundImage = `url(${img.src})`;
            resolve();
        };
        img.onerror = () => reject(`Ошибка загрузки фона: ${background}`);
        img.src = `/backgrounds/${background}`;
    });
}

export function updateStatsDisplay() {
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
	if (elements.healthBar) elements.healthBar.style.width = `${this.states.health}%`;
	if (elements.magicBar) elements.magicBar.style.width = `${this.states.magic}%`;

	// Обновление текстовых значений
	const updateElement = (element, value) => {
		if (element) element.textContent = value;
	};

	updateElement(elements.healthValue, this.states.health);
	updateElement(elements.magicValue, this.states.magic);
	updateElement(elements.inventoryCount, `${this.states.inventory.length}/10`);
	updateElement(elements.liraTrust, this.states.lira_trust);
	updateElement(elements.moralValue, this.states.moral);
	updateElement(elements.goldValue, this.states.gold);
	updateElement(elements.sanityValue, this.states.sanity);
	updateElement(elements.fateValue, this.states.fate);
	updateElement(elements.combatValue, this.states.combat_skill);
	updateElement(elements.insightValue, this.states.insight);
	updateElement(elements.churchHostility, this.states.church_hostility);
}

export function showError(message) {
    const errorBox = document.createElement('div');
    errorBox.className = 'error-box';
    errorBox.innerHTML = `
        <h2>🛑 Ошибка</h2>
        <p>${message}</p>
        <button onclick="this.parentElement.remove()">Закрыть</button>
    `;
    document.body.appendChild(errorBox);
}