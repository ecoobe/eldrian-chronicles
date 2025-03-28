class AssetLoader {
    static async loadAssets() {
        const assets = {
            backgrounds: {
                forest: '/backgrounds/forest.webp',
                village: '/backgrounds/village_burning.webp'
            },
            characters: {
                lira: {
                    neutral: '/characters/lira_neutral.webp',
                    angry: '/characters/lira_angry.webp'
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
                        img.onload = resolve;
                    });
                })
        );
        return assets;
    }
}

class Game {
	static async init() {
	  const assets = await AssetLoader.loadAssets();
	  const gameContainer = document.getElementById('game-container');
	  
	  // Фон
	  const bg = document.createElement('div');
	  bg.style.backgroundImage = `url(${assets.backgrounds.forest})`;
	  bg.style.width = '100%';
	  bg.style.height = '100vh';
	  gameContainer.appendChild(bg);
  
	  // Персонаж
	  const lira = document.createElement('img');
	  lira.src = assets.characters.lira.neutral;
	  lira.className = 'character-sprite';
	  gameContainer.appendChild(lira);
	}
  }
  
  // Запуск игры
  Game.init();