class FertilizerControlSystem {
    constructor() {
        this.plants = [];
        this.selectedPlant = null;
        this.plantIdCounter = 1;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        this.plantColors = {
            'weizen': '#4CAF50',
            'gerste': '#FFC107',
            'mais': '#FF9800',
            'kartoffeln': '#795548',
            'rueben': '#9C27B0',
            'sonnenblumen': '#FFD700'
        };
        
        this.plantIcons = {
            'weizen': '🌾',
            'gerste': '🌾',
            'mais': '🌽',
            'kartoffeln': '🥔',
            'rueben': '🥕',
            'sonnenblumen': '🌻'
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadFromLocalStorage();
        this.render();
        this.updateStatistics();
    }
    
    setupEventListeners() {
        // Formular für Pflanzenhinzufügung
        document.getElementById('plantForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPlant();
        });
        
        // Dünger anwenden
        document.getElementById('applyFertilizer').addEventListener('submit', (e) => {
            e.preventDefault();
            this.applyFertilizer();
        });
        
        document.getElementById('applyFertilizer').addEventListener('click', () => {
            this.applyFertilizer();
        });
        
        // Kartensteuerung
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetView').addEventListener('click', () => this.resetView());
        document.getElementById('clearAll').addEventListener('click', () => this.clearAll());
        
        // SVG Klick-Event
        document.getElementById('mapSvg').addEventListener('click', (e) => {
            if (e.target.id === 'mapSvg' || e.target.parentElement.id === 'mapSvg') {
                const rect = document.getElementById('mapSvg').getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                document.getElementById('plantX').value = Math.round(x);
                document.getElementById('plantY').value = Math.round(y);
            }
        });
        
        // Düngereingaben
        ['nitrogen', 'phosphorus', 'potassium'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                if (this.selectedPlant) {
                    this.updatePlantFertilizer();
                }
            });
        });
    }
    
    addPlant() {
        const name = document.getElementById('plantName').value;
        const x = parseFloat(document.getElementById('plantX').value);
        const y = parseFloat(document.getElementById('plantY').value);
        
        if (!name || isNaN(x) || isNaN(y)) {
            this.showToast('Bitte füllen Sie alle Felder aus', 'error');
            return;
        }
        
        const plant = {
            id: this.plantIdCounter++,
            name: name,
            x: x,
            y: y,
            fertilizer: {
                nitrogen: 0,
                phosphorus: 0,
                potassium: 0
            },
            createdAt: new Date().toISOString()
        };
        
        this.plants.push(plant);
        this.render();
        this.updateStatistics();
        this.saveToLocalStorage();
        this.showToast(`${this.getPlantDisplayName(name)} hinzugefügt`, 'success');
        
        // Formular zurücksetzen
        document.getElementById('plantForm').reset();
    }
    
    selectPlant(plantId) {
        this.selectedPlant = this.plants.find(p => p.id === plantId);
        
        if (this.selectedPlant) {
            // UI aktualisieren
            document.getElementById('selectedPlantInfo').classList.remove('hidden');
            document.getElementById('noPlantSelected').classList.add('hidden');
            
            document.getElementById('selectedPlantType').textContent = this.getPlantDisplayName(this.selectedPlant.name);
            document.getElementById('selectedPlantPosition').textContent = `(${this.selectedPlant.x.toFixed(1)}, ${this.selectedPlant.y.toFixed(1)})`;
            
            // Düngewerte setzen
            document.getElementById('nitrogen').value = this.selectedPlant.fertilizer.nitrogen;
            document.getElementById('phosphorus').value = this.selectedPlant.fertilizer.phosphorus;
            document.getElementById('potassium').value = this.selectedPlant.fertilizer.potassium;
            
            // Visuelle Auswahl aktualisieren
            this.render();
        }
    }
    
    updatePlantFertilizer() {
        if (!this.selectedPlant) return;
        
        this.selectedPlant.fertilizer.nitrogen = parseFloat(document.getElementById('nitrogen').value) || 0;
        this.selectedPlant.fertilizer.phosphorus = parseFloat(document.getElementById('phosphorus').value) || 0;
        this.selectedPlant.fertilizer.potassium = parseFloat(document.getElementById('potassium').value) || 0;
        
        this.updateStatistics();
        this.saveToLocalStorage();
    }
    
    applyFertilizer() {
        if (!this.selectedPlant) {
            this.showToast('Bitte wählen Sie zuerst eine Pflanze aus', 'error');
            return;
        }
        
        const nitrogen = parseFloat(document.getElementById('nitrogen').value) || 0;
        const phosphorus = parseFloat(document.getElementById('phosphorus').value) || 0;
        const potassium = parseFloat(document.getElementById('potassium').value) || 0;
        
        if (nitrogen === 0 && phosphorus === 0 && potassium === 0) {
            this.showToast('Bitte geben Sie Düngermengen ein', 'error');
            return;
        }
        
        this.selectedPlant.fertilizer = { nitrogen, phosphorus, potassium };
        
        // Hier würde später die Ansteuerung der realen Düngeanlage erfolgen
        console.log(`Dünger angewendet auf Pflanze ${this.selectedPlant.id}:`, this.selectedPlant.fertilizer);
        
        this.updateStatistics();
        this.saveToLocalStorage();
        this.render();
        
        this.showToast(`Dünger erfolgreich auf ${this.getPlantDisplayName(this.selectedPlant.name)} angewendet`, 'success');
    }
    
    deletePlant(plantId) {
        const plant = this.plants.find(p => p.id === plantId);
        if (plant) {
            this.plants = this.plants.filter(p => p.id !== plantId);
            if (this.selectedPlant && this.selectedPlant.id === plantId) {
                this.selectedPlant = null;
                document.getElementById('selectedPlantInfo').classList.add('hidden');
                document.getElementById('noPlantSelected').classList.remove('hidden');
            }
            this.render();
            this.updateStatistics();
            this.saveToLocalStorage();
            this.showToast(`${this.getPlantDisplayName(plant.name)} entfernt`, 'info');
        }
    }
    
    clearAll() {
        if (this.plants.length === 0) {
            this.showToast('Keine Pflanzen zum Löschen vorhanden', 'info');
            return;
        }
        
        if (confirm('Wollen Sie wirklich alle Pflanzen löschen?')) {
            this.plants = [];
            this.selectedPlant = null;
            document.getElementById('selectedPlantInfo').classList.add('hidden');
            document.getElementById('noPlantSelected').classList.remove('hidden');
            this.render();
            this.updateStatistics();
            this.saveToLocalStorage();
            this.showToast('Alle Pflanzen entfernt', 'info');
        }
    }
    
    render() {
        const svg = document.getElementById('plantsGroup');
        svg.innerHTML = '';
        
        this.plants.forEach(plant => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.classList.add('plant-element');
            if (this.selectedPlant && this.selectedPlant.id === plant.id) {
                group.classList.add('selected');
            }
            
            // Pflanzenkreis
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', plant.x);
            circle.setAttribute('cy', plant.y);
            circle.setAttribute('r', '1.5');
            circle.setAttribute('fill', this.plantColors[plant.name] || '#666');
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', '0.2');
            
            // Pflanzenlabel
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', plant.x);
            text.setAttribute('y', plant.y - 2);
            text.classList.add('plant-label');
            text.textContent = this.plantIcons[plant.name] || '🌱';
            
            // Event-Listener
            group.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectPlant(plant.id);
            });
            
            group.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm(`Möchten Sie ${this.getPlantDisplayName(plant.name)} löschen?`)) {
                    this.deletePlant(plant.id);
                }
            });
            
            group.appendChild(circle);
            group.appendChild(text);
            svg.appendChild(group);
        });
    }
    
    updateStatistics() {
        const totalPlants = this.plants.length;
        const totalNitrogen = this.plants.reduce((sum, plant) => sum + plant.fertilizer.nitrogen, 0);
        const totalPhosphorus = this.plants.reduce((sum, plant) => sum + plant.fertilizer.phosphorus, 0);
        const totalPotassium = this.plants.reduce((sum, plant) => sum + plant.fertilizer.potassium, 0);
        
        document.getElementById('totalPlants').textContent = totalPlants;
        document.getElementById('totalNitrogen').textContent = totalNitrogen.toFixed(1);
        document.getElementById('totalPhosphorus').textContent = totalPhosphorus.toFixed(1);
        document.getElementById('totalPotassium').textContent = totalPotassium.toFixed(1);
    }
    
    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 5);
        this.applyZoom();
    }
    
    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 0.5);
        this.applyZoom();
    }
    
    resetView() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.applyZoom();
    }
    
    applyZoom() {
        const svg = document.getElementById('mapSvg');
        svg.style.transform = `scale(${this.zoom}) translate(${this.panX}px, ${this.panY}px)`;
    }
    
    getPlantDisplayName(name) {
        const displayNames = {
            'weizen': 'Weizen',
            'gerste': 'Gerste',
            'mais': 'Mais',
            'kartoffeln': 'Kartoffeln',
            'rueben': 'Rüben',
            'sonnenblumen': 'Sonnenblumen'
        };
        return displayNames[name] || name;
    }
    
    showToast(message, type = 'info') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    saveToLocalStorage() {
        localStorage.setItem('fertilizerPlants', JSON.stringify(this.plants));
        localStorage.setItem('fertilizerPlantIdCounter', this.plantIdCounter.toString());
    }
    
    loadFromLocalStorage() {
        const savedPlants = localStorage.getItem('fertilizerPlants');
        const savedCounter = localStorage.getItem('fertilizerPlantIdCounter');
        
        if (savedPlants) {
            try {
                this.plants = JSON.parse(savedPlants);
            } catch (e) {
                console.error('Fehler beim Laden der Pflanzen:', e);
                this.plants = [];
            }
        }
        
        if (savedCounter) {
            this.plantIdCounter = parseInt(savedCounter);
        }
    }
}

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    new FertilizerControlSystem();
});

// Beispieldaten für Demonstration
function loadExampleData() {
    const examplePlants = [
        { name: 'weizen', x: 20, y: 30, fertilizer: { nitrogen: 120, phosphorus: 40, potassium: 60 } },
        { name: 'mais', x: 50, y: 20, fertilizer: { nitrogen: 150, phosphorus: 50, potassium: 80 } },
        { name: 'kartoffeln', x: 70, y: 60, fertilizer: { nitrogen: 100, phosphorus: 60, potassium: 120 } },
        { name: 'gerste', x: 30, y: 70, fertilizer: { nitrogen: 80, phosphorus: 30, potassium: 50 } },
        { name: 'rueben', x: 80, y: 40, fertilizer: { nitrogen: 130, phosphorus: 70, potassium: 90 } }
    ];
    
    const system = new FertilizerControlSystem();
    examplePlants.forEach((plantData, index) => {
        const plant = {
            id: index + 1,
            ...plantData,
            createdAt: new Date().toISOString()
        };
        system.plants.push(plant);
    });
    system.plantIdCounter = examplePlants.length + 1;
    system.render();
    system.updateStatistics();
    system.saveToLocalStorage();
    system.showToast('Beispieldaten geladen', 'success');
}
