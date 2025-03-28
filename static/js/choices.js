class ChoiceSystem {
    constructor() {
        this.states = {
            magic: 0,
            liraTrust: 0
        };
    }
    
    updateStats() {
        document.getElementById('magic-level').textContent = this.states.magic;
        document.getElementById('lira-trust').textContent = this.states.liraTrust;
    }
}