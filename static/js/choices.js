class ChoiceSystem {
    constructor() {
        this.states = {
            magic: 0,
            liraTrust: 0,
            hasArtifact: false
        };
    }

    loadChapter(chapterId) {
        fetch(`chapters/${chapterId}.json`)
            .then(response => response.json())
            .then(data => this.render(data));
    }

    render(chapter) {
        document.getElementById('text-display').innerHTML = chapter.text;
        // ... рендер вариантов выбора
    }
}