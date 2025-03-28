class AssetLoader {
    static async loadAssets() {
        const assets = {
            backgrounds: {
                forest: 'backgrounds/forest.webp',
                village: 'backgrounds/village_burning.webp'
            },
            characters: {
                lira: {
                    neutral: 'characters/lira_neutral.webp',
                    angry: 'characters/lira_angry.webp'
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