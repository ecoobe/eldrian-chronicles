class AssetLoader {
    static async loadAssets() {
        const assets = {
            backgrounds: {
                forest: '/static/backgrounds/forest.webp',
                village: '/static/backgrounds/village_burning.webp'
            },
            characters: {
                lira: {
                    neutral: '/static/characters/lira_neutral.webp',
                    angry: '/static/characters/lira_angry.webp'
                }
            }
        };

        await Promise.all(
            Object.values(assets.backgrounds)
                .concat(Object.values(assets.characters.lira))
                .map(url => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.src = url;
                        img.onload = () => resolve(img);
                        img.onerror = (e) => console.error('Error loading:', url, e);
                    });
                })
        );
        return assets;
    }
}

class GameRenderer {
    static initScene(assets) {
        const scene = document.getElementById('scene');
        
        // Фон
        const bg = document.createElement('div');
        bg.style.backgroundImage = `url(${assets.backgrounds.forest})`;
        bg.style.backgroundSize = 'cover';
        bg.style.width = '100%';
        bg.style.height = '100%';
        scene.appendChild(bg);

        // Персонаж
        const lira = document.createElement('img');
        lira.src = assets.characters.lira.neutral;
        lira.className = 'character-sprite';
        scene.appendChild(lira);
    }
}

// Инициализация игры
AssetLoader.loadAssets()
    .then(assets => {
        GameRenderer.initScene(assets);
        console.log('Game assets loaded!');
    })
    .catch(error => console.error('Initialization failed:', error));