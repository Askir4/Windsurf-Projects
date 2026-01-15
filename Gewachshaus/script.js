class FertilizerControlSystem {
    constructor() {
        // Daten - Hochbeete (beds) ersetzen zones/slots/plants
        this.beds = [];           // Hochbeete (ehem. zones)
        this.selectedBeds = [];   // Multi-Select für Hochbeete
        this.selectedBed = null;  // Einzelauswahl für Details-Panel
        
        // Counter
        this.bedIdCounter = 1;
        this.plantIdCounter = 1;
        this.todoIdCounter = 1;
        
        // UI-Modus
        this.mode = 'view'; // 'view' oder 'edit'
        this.darkMode = false;
        
        // Zoom und Pan
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        // Drag & Drop
        this.dragging = null;
        
        // Pflanzen-Datenbank mit Icons
        this.plantDatabase = [
            // Gemüse
            { id: 'tomato', name: 'Tomate', icon: 'tomatoIcon', category: 'gemüse', keywords: ['tomaten', 'paradeiser'] },
            { id: 'carrot', name: 'Karotte', icon: 'carrotIcon', category: 'gemüse', keywords: ['möhre', 'karotten', 'möhren', 'wurzel'] },
            { id: 'salad', name: 'Salat', icon: 'saladIcon', category: 'gemüse', keywords: ['kopfsalat', 'eisberg', 'grün'] },
            { id: 'cucumber', name: 'Gurke', icon: 'cucumberIcon', category: 'gemüse', keywords: ['gurken', 'salatgurke'] },
            { id: 'pepper', name: 'Paprika', icon: 'pepperIcon', category: 'gemüse', keywords: ['peperoni', 'chili'] },
            { id: 'onion', name: 'Zwiebel', icon: 'onionIcon', category: 'gemüse', keywords: ['zwiebeln', 'lauch'] },
            { id: 'potato', name: 'Kartoffel', icon: 'potatoIcon', category: 'gemüse', keywords: ['kartoffeln', 'erdapfel'] },
            { id: 'zucchini', name: 'Zucchini', icon: 'zucchiniIcon', category: 'gemüse', keywords: ['kürbis'] },
            { id: 'bean', name: 'Bohne', icon: 'beanIcon', category: 'gemüse', keywords: ['bohnen', 'buschbohne', 'stangenbohne'] },
            { id: 'pea', name: 'Erbse', icon: 'peaIcon', category: 'gemüse', keywords: ['erbsen', 'zuckererbse'] },
            { id: 'radish', name: 'Radieschen', icon: 'radishIcon', category: 'gemüse', keywords: ['rettich'] },
            { id: 'cabbage', name: 'Kohl', icon: 'cabbageIcon', category: 'gemüse', keywords: ['weißkohl', 'rotkohl', 'wirsing'] },
            { id: 'broccoli', name: 'Brokkoli', icon: 'broccoliIcon', category: 'gemüse', keywords: ['blumenkohl'] },
            { id: 'corn', name: 'Mais', icon: 'cornIcon', category: 'gemüse', keywords: ['zuckermais'] },
            // Kräuter
            { id: 'basil', name: 'Basilikum', icon: 'basilIcon', category: 'kräuter', keywords: ['basil'] },
            { id: 'mint', name: 'Minze', icon: 'mintIcon', category: 'kräuter', keywords: ['pfefferminze', 'spearmint'] },
            { id: 'parsley', name: 'Petersilie', icon: 'parsleyIcon', category: 'kräuter', keywords: ['peterle'] },
            { id: 'rosemary', name: 'Rosmarin', icon: 'rosemaryIcon', category: 'kräuter', keywords: [] },
            { id: 'thyme', name: 'Thymian', icon: 'thymeIcon', category: 'kräuter', keywords: ['quendel'] },
            { id: 'chive', name: 'Schnittlauch', icon: 'chiveIcon', category: 'kräuter', keywords: ['lauch'] },
            // Obst
            { id: 'strawberry', name: 'Erdbeere', icon: 'strawberryIcon', category: 'obst', keywords: ['erdbeeren'] },
            // Blumen
            { id: 'sunflower', name: 'Sonnenblume', icon: 'sunflowerIcon', category: 'blumen', keywords: ['sonnenblumen'] },
            // Allgemein
            { id: 'plant', name: 'Andere Pflanze', icon: 'plantIcon', category: 'sonstige', keywords: [] }
        ];
        
        // Pflanzenfarben (für Visualisierung)
        this.plantColors = {
            'tomaten': '#e74c3c',
            'salat': '#27ae60',
            'gurken': '#2ecc71',
            'paprika': '#f39c12',
            'zucchini': '#9b59b6',
            'karotten': '#e67e22',
            'radieschen': '#c0392b',
            'bohnen': '#16a085',
            'erbsen': '#1abc9c',
            'kohl': '#3498db'
        };
        
        // Sensordaten
        this.sensors = {
            temperature: { value: 22.5, trend: 'stable', lastUpdate: new Date() },
            humidity: { value: 65, trend: 'stable', lastUpdate: new Date() },
            soilMoisture: { value: 42, trend: 'stable', lastUpdate: new Date() }
        };
        
        // NodeRED-Verbindung
        this.nodeRed = {
            enabled: false,
            websocketUrl: 'ws://localhost:1880/ws',
            websocket: null,
            topics: {
                temperature: 'sensors/temperature',
                humidity: 'sensors/humidity',
                soilMoisture: 'sensors/soil_moisture',
                waterTank: 'sensors/water_tank',
                waterLevel: 'sensors/water_level',
                waterTemperature: 'sensors/water_temperature'
            }
        };
        
        // Wassertank
        this.waterTank = {
            capacity: 1000,
            currentLevel: 750,
            temperature: 18.5,
            lastUpdate: new Date()
        };
        
        // Server-Konfiguration
        this.serverConfig = {
            enabled: false,
            url: 'http://localhost:3001',
            autoSync: true,
            syncInterval: 30000 // 30 Sekunden
        };
        
        // Logging
        this.logLevel = 'INFO'; // DEBUG, INFO, WARN, ERROR
        this.localLogs = [];
        
        // Sensor-Historie für Graphen
        this.sensorHistory = {
            temperature: [],
            humidity: [],
            soilMoisture: []
        };
        
        // Graph-Konfiguration
        this.graphConfig = {
            temperature: {
                currentRange: '1h',
                canvas: null,
                ctx: null,
                maxDataPoints: 100
            },
            humidity: {
                currentRange: '1h',
                canvas: null,
                ctx: null,
                maxDataPoints: 100
            },
            soilMoisture: {
                currentRange: '1h',
                canvas: null,
                ctx: null,
                maxDataPoints: 100
            }
        };
        
        this.plantIcons = {
            'tomaten': '🍅',
            'salat': '🥬',
            'gurken': '🥒',
            'paprika': '🫑',
            'zucchini': '🥒',
            'karotten': '🥕',
            'radieschen': '🥕',
            'bohnen': '🫘',
            'erbsen': '🫛',
            'kohl': '🥬'
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadFromLocalStorage();
        this.createDefaultMap();
        this.applyDarkMode();
        this.render();
        this.updateStatistics();
        this.updateBedSelector();
        this.updateWaterTank();
        
        // NodeRED-Verbindung starten
        this.connectNodeRed();
        
        // Server-Synchronisation starten
        this.startServerSync();
        
        // Sensor-Simulation starten
        this.startSensorSimulation();
        
        // Graphen initialisieren
        this.initializeGraphs();
        
        this.log('INFO', 'Anwendung initialisiert', { 
            mode: this.mode, 
            darkMode: this.darkMode,
            serverEnabled: this.serverConfig.enabled 
        });
    }
    
    createDefaultMap() {
        if (this.beds.length === 0) {
            // Standard-Hochbeet erstellen
            const defaultBed = {
                id: this.bedIdCounter++,
                name: 'Hochbeet 1',
                x: 10,
                y: 10,
                width: 35,
                height: 25,
                plants: [],      // Pflanzenliste: [{id, name, quantity, date}]
                todos: [],       // Todos: [{id, text, dueDate, priority, done}]
                fertilizer: { nitrogen: 0, phosphorus: 0, potassium: 0 },
                color: '#27ae60'
            };
            this.beds.push(defaultBed);
        }
    }
    
    setupEventListeners() {
        // Dark Mode Toggle (Checkbox-basiert)
        const darkModeCheckbox = document.getElementById('darkModeCheckbox');
        if (darkModeCheckbox) {
            darkModeCheckbox.addEventListener('change', () => {
                this.toggleDarkMode();
            });
        }
        
        // Modus-Wechsel
        document.getElementById('viewMode').addEventListener('click', () => this.setMode('view'));
        document.getElementById('editMode').addEventListener('click', () => this.setMode('edit'));
        
        // Pflanzenformular
        document.getElementById('plantForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPlant();
        });
        
        // Pflanzenart-Auswahl per Icon-Picker
        const plantTypeSelector = document.getElementById('plantTypeSelector');
        if (plantTypeSelector) {
            plantTypeSelector.addEventListener('click', () => {
                this.openPlantPickerForForm();
            });
        }
        
        // Tab-Wechsel
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Plant Picker initialisieren
        this.initPlantPicker();
        
        // Pflanzen-Suche initialisieren
        this.initPlantSearch();
        
        // Pflanze zum Hochbeet hinzufügen (Inline Panel)
        const addPlantToBedBtn = document.getElementById('inlineAddPlantToBed');
        if (addPlantToBedBtn) {
            addPlantToBedBtn.addEventListener('click', () => {
                this.addPlantToBed();
            });
        }
        
        // Todo zum Hochbeet hinzufügen (Inline Panel)
        const addTodoBtn = document.getElementById('inlineAddTodo');
        if (addTodoBtn) {
            addTodoBtn.addEventListener('click', () => {
                this.addTodoToBed();
            });
        }
        
        // Dünger anwenden
        document.getElementById('applyFertilizer').addEventListener('click', () => {
            this.applyFertilizer();
        });
        
        // Kartensteuerung
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetView').addEventListener('click', () => this.resetView());
        document.getElementById('clearAll').addEventListener('click', () => this.clearAll());
        
        // Wassertank-Einstellungen
        const updateTankBtn = document.getElementById('updateTank');
        if (updateTankBtn) {
            updateTankBtn.addEventListener('click', () => {
                this.updateTankSettings();
            });
        }
        
        // NodeRED-Einstellungen (nur im Editor-Modus sichtbar)
        const connectNodeRedBtn = document.getElementById('connectNodeRed');
        const disconnectNodeRedBtn = document.getElementById('disconnectNodeRed');
        
        if (connectNodeRedBtn) {
            connectNodeRedBtn.addEventListener('click', () => {
                this.connectNodeRedManually();
            });
        }
        
        if (disconnectNodeRedBtn) {
            disconnectNodeRedBtn.addEventListener('click', () => {
                this.disconnectNodeRedManually();
            });
        }
        
        const nodeRedEnabled = document.getElementById('nodeRedEnabled');
        if (nodeRedEnabled) {
            nodeRedEnabled.addEventListener('change', (e) => {
                this.nodeRed.enabled = e.target.checked;
                this.saveToLocalStorage();
                
                if (!this.nodeRed.enabled) {
                    this.disconnectNodeRedManually();
                } else {
                    this.initNodeRedConnection();
                }
            });
        }
        
        const nodeRedUrl = document.getElementById('nodeRedUrl');
        if (nodeRedUrl) {
            nodeRedUrl.addEventListener('change', (e) => {
                this.nodeRed.websocketUrl = e.target.value;
                this.saveToLocalStorage();
            });
        }

        const refreshLogsBtn = document.getElementById('refreshLogs');
        if (refreshLogsBtn) {
            refreshLogsBtn.addEventListener('click', () => {
                this.refreshLogsView();
            });
        }

        const logLevelFilter = document.getElementById('logLevelFilter');
        if (logLevelFilter) {
            logLevelFilter.addEventListener('change', () => {
                this.refreshLogsView();
            });
        }
        
        // Hochbeet-Auswahl Dropdown (Editor)
        const zoneSelector = document.getElementById('zoneSelector');
        if (zoneSelector) {
            zoneSelector.addEventListener('change', (e) => {
                const bedId = parseInt(e.target.value);
                if (bedId) {
                    this.selectBedForEdit(bedId);
                } else {
                    this.selectedBed = null;
                    this.updateEditorUI();
                    this.render();
                }
            });
        }
        
        // Editor-Tools (Hochbeet-Management)
        const addZoneBtn = document.getElementById('addZone');
        const deleteZoneBtn = document.getElementById('deleteZone');
        const updateZoneBtn = document.getElementById('updateZone');
        
        if (addZoneBtn) addZoneBtn.addEventListener('click', () => this.addBed());
        if (deleteZoneBtn) deleteZoneBtn.addEventListener('click', () => this.deleteSelectedBed());
        if (updateZoneBtn) updateZoneBtn.addEventListener('click', () => this.updateSelectedBed());
        
        // Größen-Slider
        const bedWidth = document.getElementById('bedWidth');
        const bedHeight = document.getElementById('bedHeight');
        const bedWidthValue = document.getElementById('bedWidthValue');
        const bedHeightValue = document.getElementById('bedHeightValue');
        
        if (bedWidth) {
            bedWidth.addEventListener('input', (e) => {
                if (bedWidthValue) bedWidthValue.textContent = e.target.value;
                this.updateBedSizePreview();
            });
        }
        if (bedHeight) {
            bedHeight.addEventListener('input', (e) => {
                if (bedHeightValue) bedHeightValue.textContent = e.target.value;
                this.updateBedSizePreview();
            });
        }
        
        // Farb-Picker und Presets
        const bedColor = document.getElementById('bedColor');
        if (bedColor) {
            bedColor.addEventListener('input', (e) => {
                this.updateBedColorPreview(e.target.value);
            });
        }
        
        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const color = btn.dataset.color;
                if (bedColor) bedColor.value = color;
                this.updateBedColorPreview(color);
                
                // Active-State setzen
                document.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // SVG Events
        const svg = document.getElementById('mapSvg');
        svg.addEventListener('click', (e) => this.handleSvgClick(e));
        svg.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        svg.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        svg.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    
        // Düngereingaben (wirken auf ausgewählte Beete)
        ['nitrogen', 'phosphorus', 'potassium'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                // Live-Update deaktiviert - nur bei "Anwenden" speichern
            });
        });
    }
    
    setMode(mode) {
        this.mode = mode;
        
        // UI aktualisieren
        document.getElementById('viewMode').classList.toggle('active', mode === 'view');
        document.getElementById('editMode').classList.toggle('active', mode === 'edit');
        document.getElementById('mapEditor').classList.toggle('hidden', mode === 'view');
        
        // Editor-UI aktualisieren
        if (mode === 'edit') {
            this.updateEditorUI();
            this.refreshLogsView();
        }
        
        this.render();
    }
    
    // ========== HOCHBEET-AUSWAHL (Multi-Select) ==========
    
    selectBed(bedId, event) {
        const bed = this.beds.find(b => b.id === bedId);
        if (!bed) return;
        
        // Im View-Modus: Multi-Select mit Shift
        if (this.mode === 'view') {
            if (event && event.shiftKey) {
                // Toggle: Beet zur Auswahl hinzufügen/entfernen
                const idx = this.selectedBeds.findIndex(b => b.id === bedId);
                if (idx >= 0) {
                    this.selectedBeds.splice(idx, 1);
                } else {
                    this.selectedBeds.push(bed);
                }
            } else {
                // Einzelauswahl: nur dieses Beet
                this.selectedBeds = [bed];
            }
            
            // Erstes ausgewähltes Beet für Details-Panel
            this.selectedBed = this.selectedBeds.length > 0 ? this.selectedBeds[0] : null;
            
            this.updateBedSelectionUI();
            this.updateInlineBedInfo();
        }
        
        this.render();
    }
    
    selectBedForEdit(bedId) {
        this.selectedBed = this.beds.find(b => b.id === bedId);
        if (this.selectedBed) {
            this.updateEditorUI();
            this.render();
        }
    }
    
    updateBedSelectionUI() {
        const count = this.selectedBeds.length;
        
        if (count > 0) {
            document.getElementById('selectedPlantInfo').classList.remove('hidden');
            document.getElementById('noPlantSelected').classList.add('hidden');
            
            // Beet-Namen anzeigen
            const names = this.selectedBeds.map(b => b.name).join(', ');
            document.getElementById('selectedPlantType').textContent = names;
            document.getElementById('selectedPlantPosition').textContent = count.toString();
            document.getElementById('selectedPlantDate').textContent = new Date().toLocaleDateString('de-DE');
            
            // Durchschnittliche Düngerwerte anzeigen (falls nur 1 Beet)
            if (count === 1) {
                const bed = this.selectedBeds[0];
                document.getElementById('nitrogen').value = bed.fertilizer.nitrogen;
                document.getElementById('phosphorus').value = bed.fertilizer.phosphorus;
                document.getElementById('potassium').value = bed.fertilizer.potassium;
            } else {
                // Bei Mehrfachauswahl: Felder auf 0 setzen
                document.getElementById('nitrogen').value = 0;
                document.getElementById('phosphorus').value = 0;
                document.getElementById('potassium').value = 0;
            }
        } else {
            document.getElementById('selectedPlantInfo').classList.add('hidden');
            document.getElementById('noPlantSelected').classList.remove('hidden');
        }
    }
    
    // ========== PFLANZE ZUM HOCHBEET HINZUFÜGEN ==========
    
    addPlant() {
        // Pflanze über Hauptformular zum ausgewählten Beet hinzufügen
        const bedSelector = document.getElementById('plantSlot');
        const dateEl = document.getElementById('plantDate');
        
        // Ausgewählte Pflanze aus Klassenvariable lesen
        if (!this.selectedPlantForForm || !this.selectedPlantForForm.name) {
            this.showToast('Bitte wählen Sie zuerst eine Pflanze aus', 'error');
            return;
        }
        
        const plantName = this.selectedPlantForForm.name;
        const plantIcon = this.selectedPlantForForm.icon;
        
        if (!bedSelector || !bedSelector.value) {
            this.showToast('Bitte wählen Sie ein Hochbeet aus', 'error');
            return;
        }
        
        const bedId = parseInt(bedSelector.value);
        const bed = this.beds.find(b => b.id === bedId);
        
        if (!bed) {
            this.showToast('Ungültiges Hochbeet ausgewählt', 'error');
            return;
        }
        
        // Nächste Nummer berechnen
        const existingNumbers = bed.plants.map(p => p.number || 0);
        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        
        const plant = {
            id: this.plantIdCounter++,
            number: nextNumber,
            name: plantName,
            icon: plantIcon || this.getPlantIconFromName(plantName),
            quantity: 1,
            date: dateEl && dateEl.value ? dateEl.value : new Date().toISOString().split('T')[0],
            posX: 10 + Math.random() * 80,
            posY: 15 + Math.random() * 70
        };
        
        bed.plants.push(plant);
        
        this.render();
        this.updateStatistics();
        this.saveToLocalStorage();
        this.showToast(`${plantName} (#${nextNumber}) zu ${bed.name} hinzugefügt`, 'success');
        
        // Formular und Auswahl zurücksetzen
        const form = document.getElementById('plantForm');
        if (form) form.reset();
        
        // Klassenvariable zurücksetzen
        this.selectedPlantForForm = null;
        
        // Icon-Selector zurücksetzen
        const selectedIcon = document.getElementById('selectedPlantIcon');
        const selectedName = document.getElementById('selectedPlantName');
        if (selectedIcon) selectedIcon.innerHTML = '🌱';
        if (selectedName) selectedName.textContent = 'Pflanze wählen...';
    }
    
    // Pflanze über Inline-Panel zum aktuell angezeigten Beet hinzufügen
    addPlantToBed(posX = null, posY = null) {
        if (!this.selectedBed) {
            this.showToast('Bitte wählen Sie zuerst ein Hochbeet aus', 'error');
            return;
        }
        
        const nameEl = document.getElementById('inlinePlantNameInput');
        const dateEl = document.getElementById('inlinePlantDateInput');
        
        const name = nameEl ? nameEl.value.trim() : '';
        if (!name) {
            this.showToast('Bitte geben Sie einen Pflanzennamen ein', 'error');
            return;
        }
        
        // Nächste Nummer im Beet berechnen
        const existingNumbers = this.selectedBed.plants.map(p => p.number || 0);
        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        
        // Standard-Position falls nicht angegeben (zufällig im Beet)
        const relX = posX !== null ? posX : 10 + Math.random() * 80;
        const relY = posY !== null ? posY : 10 + Math.random() * 80;
        
        const plant = {
            id: this.plantIdCounter++,
            number: nextNumber,
            name: name,
            quantity: 1,
            date: dateEl && dateEl.value ? dateEl.value : new Date().toISOString().split('T')[0],
            posX: relX,  // Position in % innerhalb des Beetes
            posY: relY
        };
        
        this.selectedBed.plants.push(plant);
        this.render();
        
        // Formular zurücksetzen
        if (nameEl) nameEl.value = '';
        if (dateEl) dateEl.value = '';
        
        this.updateInlineBedInfo();
        this.updateStatistics();
        this.saveToLocalStorage();
        this.showToast(`${name} (#${nextNumber}) hinzugefügt`, 'success');
    }
    
    // Pflanze direkt auf Beet per Klick platzieren
    placePlantInBed(bed, relX, relY) {
        this.selectedBed = bed;
        this.selectedBeds = [bed];
        
        // Nächste Nummer berechnen
        const existingNumbers = bed.plants.map(p => p.number || 0);
        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        
        // Pflanzen-Name aus dem Formular oder Standard
        const nameEl = document.getElementById('inlinePlantNameInput');
        let name = nameEl ? nameEl.value.trim() : '';
        
        if (!name) {
            // Zeige Eingabe-Dialog
            name = prompt(`Pflanzenname für Position #${nextNumber}:`, 'Neue Pflanze');
            if (!name) return;
        }
        
        const plant = {
            id: this.plantIdCounter++,
            number: nextNumber,
            name: name,
            quantity: 1,
            date: new Date().toISOString().split('T')[0],
            posX: relX,
            posY: relY
        };
        
        bed.plants.push(plant);
        
        // Formular zurücksetzen
        if (nameEl) nameEl.value = '';
        
        this.render();
        this.updateInlineBedInfo();
        this.updateStatistics();
        this.saveToLocalStorage();
        this.showToast(`${name} (#${nextNumber}) platziert`, 'success');
    }
    
    deletePlantFromBed(plantId) {
        if (!this.selectedBed) return;
        
        this.selectedBed.plants = this.selectedBed.plants.filter(p => p.id !== plantId);
        this.updateInlineBedInfo();
        this.updateStatistics();
        this.saveToLocalStorage();
        this.showToast('Pflanze entfernt', 'info');
    }
    
    // ========== TODOS ZUM HOCHBEET ==========
    
    addTodoToBed() {
        if (!this.selectedBed) {
            this.showToast('Bitte wählen Sie zuerst ein Hochbeet aus', 'error');
            return;
        }
        
        const textEl = document.getElementById('inlineTodoText');
        const dateEl = document.getElementById('inlineTodoDate');
        const prioEl = document.getElementById('inlineTodoPriority');
        
        const text = textEl ? textEl.value.trim() : '';
        if (!text) {
            this.showToast('Bitte geben Sie einen Todo-Text ein', 'error');
            return;
        }
        
        const todo = {
            id: this.todoIdCounter++,
            text: text,
            dueDate: dateEl && dateEl.value ? dateEl.value : null,
            priority: prioEl ? prioEl.value : 'medium',
            done: false
        };
        
        this.selectedBed.todos.push(todo);
        
        // Formular zurücksetzen
        if (textEl) textEl.value = '';
        if (dateEl) dateEl.value = '';
        if (prioEl) prioEl.value = 'medium';
        
        this.updateInlineBedInfo();
        this.saveToLocalStorage();
        this.showToast('Todo hinzugefügt', 'success');
    }
    
    toggleTodo(todoId) {
        if (!this.selectedBed) return;
        
        const todo = this.selectedBed.todos.find(t => t.id === todoId);
        if (todo) {
            todo.done = !todo.done;
            this.updateInlineBedInfo();
            this.saveToLocalStorage();
        }
    }
    
    deleteTodo(todoId) {
        if (!this.selectedBed) return;
        
        this.selectedBed.todos = this.selectedBed.todos.filter(t => t.id !== todoId);
        this.updateInlineBedInfo();
        this.saveToLocalStorage();
        this.showToast('Todo entfernt', 'info');
    }
    
    // ========== HOCHBEET-MANAGEMENT (Editor) ==========
    
    addBed() {
        // Position neben dem letzten Beet oder Standardposition
        let newX = 5;
        let newY = 5;
        
        if (this.beds.length > 0) {
            const lastBed = this.beds[this.beds.length - 1];
            newX = lastBed.x + lastBed.width + 5;
            newY = lastBed.y;
            
            if (newX + 30 > 90) {
                newX = 5;
                newY = lastBed.y + lastBed.height + 5;
            }
            
            if (newY + 20 > 90) {
                newX = 5;
                newY = 5;
            }
        }
        
        const bed = {
            id: this.bedIdCounter++,
            name: `Hochbeet ${this.bedIdCounter - 1}`,
            x: newX,
            y: newY,
            width: 30,
            height: 20,
            plants: [],
            todos: [],
            fertilizer: { nitrogen: 0, phosphorus: 0, potassium: 0 },
            color: this.getRandomBedColor()
        };
        
        this.beds.push(bed);
        this.selectedBed = bed;
        
        this.render();
        this.updateEditorUI();
        this.updateBedSelector();
        this.saveToLocalStorage();
        this.showToast('Hochbeet hinzugefügt', 'success');
    }
    
    updateSelectedBed() {
        let bedToUpdate = this.selectedBed;
        
        if (!bedToUpdate) {
            const zoneSelector = document.getElementById('zoneSelector');
            if (zoneSelector && zoneSelector.value) {
                const bedId = parseInt(zoneSelector.value);
                bedToUpdate = this.beds.find(b => b.id === bedId);
            }
        }
        
        if (!bedToUpdate) {
            this.showToast('Bitte wählen Sie ein Hochbeet aus', 'error');
            return;
        }
        
        const nameEl = document.getElementById('zoneName');
        const widthEl = document.getElementById('bedWidth');
        const heightEl = document.getElementById('bedHeight');
        const colorEl = document.getElementById('bedColor');
        
        if (nameEl && nameEl.value.trim()) {
            bedToUpdate.name = nameEl.value.trim();
        }
        
        if (widthEl) {
            bedToUpdate.width = parseInt(widthEl.value) || 30;
        }
        
        if (heightEl) {
            bedToUpdate.height = parseInt(heightEl.value) || 20;
        }
        
        if (colorEl) {
            bedToUpdate.color = colorEl.value;
        }
        
        this.saveToLocalStorage();
        this.render();
        this.updateBedSelector();
        this.showToast('Hochbeet aktualisiert', 'success');
    }
    
    updateBedSizePreview() {
        if (!this.selectedBed) return;
        
        const widthEl = document.getElementById('bedWidth');
        const heightEl = document.getElementById('bedHeight');
        
        if (widthEl) this.selectedBed.width = parseInt(widthEl.value) || 30;
        if (heightEl) this.selectedBed.height = parseInt(heightEl.value) || 20;
        
        this.render();
    }
    
    updateBedColorPreview(color) {
        if (!this.selectedBed) return;
        this.selectedBed.color = color;
        this.render();
    }
    
    deleteSelectedBed() {
        let bedToDelete = this.selectedBed;
        
        if (!bedToDelete) {
            const zoneSelector = document.getElementById('zoneSelector');
            if (zoneSelector && zoneSelector.value) {
                const bedId = parseInt(zoneSelector.value);
                bedToDelete = this.beds.find(b => b.id === bedId);
            }
        }
        
        if (!bedToDelete) {
            this.showToast('Bitte wählen Sie ein Hochbeet aus', 'error');
            return;
        }
        
        const bedName = bedToDelete.name || `Hochbeet ${bedToDelete.id}`;
        
        if (confirm(`Hochbeet "${bedName}" wirklich löschen? Alle Pflanzen und Todos werden ebenfalls gelöscht.`)) {
            this.beds = this.beds.filter(b => b.id !== bedToDelete.id);
            this.selectedBed = null;
            this.selectedBeds = this.selectedBeds.filter(b => b.id !== bedToDelete.id);
            
            this.updateEditorUI();
            this.render();
            this.updateStatistics();
            this.updateBedSelector();
            this.saveToLocalStorage();
            this.showToast('Hochbeet gelöscht', 'info');
        }
    }
    
    getRandomBedColor() {
        const colors = ['#27ae60', '#3498db', '#9b59b6', '#e74c3c', '#f39c12', '#1abc9c', '#2ecc71', '#e67e22'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // ========== MAP INTERACTION ==========
    
    handleSvgClick(e) {
        const target = e.target;
        const svg = document.getElementById('mapSvg');
        const rect = svg.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * 100;
        const clickY = ((e.clientY - rect.top) / rect.height) * 100;
        
        // Hochbeet angeklickt
        if (target.classList.contains('bed-element') || target.closest('.bed-group')) {
            const bedGroup = target.classList.contains('bed-element') ? target : target.closest('.bed-group');
            const bedId = parseInt(bedGroup.dataset.bedId || target.dataset.bedId);
            const bed = this.beds.find(b => b.id === bedId);
            
            if (this.mode === 'view') {
                // Shift+Klick zum Platzieren einer Pflanze - öffnet Picker
                if (e.shiftKey && bed) {
                    // Position relativ zum Beet berechnen (0-100%)
                    const relX = ((clickX - bed.x) / bed.width) * 100;
                    const relY = ((clickY - bed.y) / bed.height) * 100;
                    
                    // Nur wenn innerhalb des Beetes (mit Rand)
                    if (relX >= 5 && relX <= 95 && relY >= 15 && relY <= 95) {
                        this.selectedBed = bed;
                        this.selectedBeds = [bed];
                        this.openPlantPicker(relX, relY);
                        return;
                    }
                }
                this.selectBed(bedId, e);
            } else {
                this.selectBedForEdit(bedId);
            }
            return;
        }
        
        // Leere Fläche im Edit-Modus - neues Beet erstellen
        if (this.mode === 'edit' && (target === svg || target.tagName === 'rect')) {
            if (clickX > 2 && clickX < 90 && clickY > 2 && clickY < 90) {
                this.createBedAtPosition(clickX, clickY);
            }
        }
    }
    
    createBedAtPosition(x, y) {
        const bed = {
            id: this.bedIdCounter++,
            name: `Hochbeet ${this.bedIdCounter - 1}`,
            x: Math.max(2, Math.min(x - 15, 68)),
            y: Math.max(2, Math.min(y - 10, 78)),
            width: 30,
            height: 20,
            plants: [],
            todos: [],
            fertilizer: { nitrogen: 0, phosphorus: 0, potassium: 0 },
            color: this.getRandomBedColor()
        };
        
        this.beds.push(bed);
        this.selectedBed = bed;
        
        this.render();
        this.updateEditorUI();
        this.updateBedSelector();
        this.saveToLocalStorage();
        this.showToast('Hochbeet erstellt', 'success');
    }
    
    handleMouseDown(e) {
        const target = e.target;
        
        // Prüfe ob Pflanze angeklickt wurde (im SVG)
        let plantMarker = target.closest('.plant-marker');
        if (!plantMarker && target.parentElement) {
            plantMarker = target.parentElement.closest('.plant-marker');
        }
        
        // Pflanzen-Drag im View-Modus
        if (plantMarker && this.mode === 'view') {
            const plantId = parseInt(plantMarker.dataset.plantId);
            const bed = this.beds.find(b => b.plants.some(p => p.id === plantId));
            const plant = bed?.plants.find(p => p.id === plantId);
            
            if (bed && plant) {
                this.draggingPlant = {
                    plantId,
                    bedId: bed.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    originalPosX: plant.posX || 50,
                    originalPosY: plant.posY || 50
                };
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        }
        
        // Beet-Drag im Edit-Modus
        if (this.mode !== 'edit') return;
        
        if (target.classList.contains('bed-element')) {
            this.dragging = {
                element: target,
                bedId: parseInt(target.dataset.bedId),
                startX: e.clientX,
                startY: e.clientY,
                originalX: parseFloat(target.getAttribute('x')),
                originalY: parseFloat(target.getAttribute('y'))
            };
            e.preventDefault();
        }
    }
    
    handleMouseMove(e) {
        const svg = document.getElementById('mapSvg');
        const rect = svg.getBoundingClientRect();
        
        // ViewBox-Größe berücksichtigen für korrekte Skalierung
        const viewBox = svg.getAttribute('viewBox').split(' ').map(Number);
        const viewWidth = viewBox[2];
        const viewHeight = viewBox[3];
        
        const scaleX = viewWidth / rect.width;
        const scaleY = viewHeight / rect.height;
        
        // Pflanze verschieben
        if (this.draggingPlant) {
            const bed = this.beds.find(b => b.id === this.draggingPlant.bedId);
            const plant = bed?.plants.find(p => p.id === this.draggingPlant.plantId);
            
            if (bed && plant) {
                const deltaX = (e.clientX - this.draggingPlant.startX) * scaleX;
                const deltaY = (e.clientY - this.draggingPlant.startY) * scaleY;
                
                // Position in % des Beetes umrechnen
                const deltaPosX = (deltaX / bed.width) * 100;
                const deltaPosY = (deltaY / bed.height) * 100;
                
                plant.posX = Math.max(5, Math.min(95, this.draggingPlant.originalPosX + deltaPosX));
                plant.posY = Math.max(10, Math.min(90, this.draggingPlant.originalPosY + deltaPosY));
                
                this.render();
            }
            return;
        }
        
        // Beet verschieben
        if (!this.dragging) return;
        
        const deltaX = (e.clientX - this.dragging.startX) * scaleX;
        const deltaY = (e.clientY - this.dragging.startY) * scaleY;
        
        const newX = Math.max(0, Math.min(100 - 5, this.dragging.originalX + deltaX));
        const newY = Math.max(0, Math.min(100 - 5, this.dragging.originalY + deltaY));
        
        const bed = this.beds.find(b => b.id === this.dragging.bedId);
        if (bed) {
            bed.x = newX;
            bed.y = newY;
            this.render();
        }
    }
    
    handleMouseUp(e) {
        if (this.draggingPlant) {
            this.saveToLocalStorage();
            this.draggingPlant = null;
        }
        if (this.dragging) {
            this.saveToLocalStorage();
            this.dragging = null;
        }
    }
    
    // ========== RENDERING ==========
    
    render() {
        this.renderBeds();
    }
    
    renderBeds() {
        const svg = document.getElementById('zonesGroup');
        const plantsGroup = document.getElementById('plantsGroup');
        svg.innerHTML = '';
        if (plantsGroup) plantsGroup.innerHTML = '';
        
        this.beds.forEach(bed => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.classList.add('bed-group');
            group.dataset.bedId = bed.id;
            
            const isSelected = this.selectedBeds.some(b => b.id === bed.id);
            const isEditing = this.selectedBed && this.selectedBed.id === bed.id;
            const frameColor = bed.color || '#8B4513';
            
            // Schatten
            const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            shadow.setAttribute('x', bed.x + 0.8);
            shadow.setAttribute('y', bed.y + 0.8);
            shadow.setAttribute('width', bed.width);
            shadow.setAttribute('height', bed.height);
            shadow.setAttribute('rx', '1');
            shadow.setAttribute('fill', 'rgba(0,0,0,0.2)');
            group.appendChild(shadow);
            
            // Holzrahmen (äußerer Rand)
            const frame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            frame.setAttribute('x', bed.x);
            frame.setAttribute('y', bed.y);
            frame.setAttribute('width', bed.width);
            frame.setAttribute('height', bed.height);
            frame.setAttribute('rx', '1.5');
            frame.setAttribute('fill', frameColor);
            frame.setAttribute('stroke', this.darkenColor(frameColor, 30));
            frame.setAttribute('stroke-width', '0.5');
            group.appendChild(frame);
            
            // Erde-Fläche (innerer Bereich)
            const soilPadding = 1.5;
            const soil = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            soil.setAttribute('x', bed.x + soilPadding);
            soil.setAttribute('y', bed.y + soilPadding);
            soil.setAttribute('width', bed.width - soilPadding * 2);
            soil.setAttribute('height', bed.height - soilPadding * 2);
            soil.setAttribute('rx', '0.5');
            soil.setAttribute('fill', 'url(#soilPattern)');
            group.appendChild(soil);
            
            // Klickbarer Bereich
            const clickArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            clickArea.setAttribute('x', bed.x);
            clickArea.setAttribute('y', bed.y);
            clickArea.setAttribute('width', bed.width);
            clickArea.setAttribute('height', bed.height);
            clickArea.setAttribute('class', 'bed-element');
            clickArea.setAttribute('data-bed-id', bed.id);
            clickArea.setAttribute('fill', 'transparent');
            clickArea.setAttribute('rx', '1.5');
            
            // Auswahl-Highlighting
            if (isSelected || isEditing) {
                clickArea.setAttribute('stroke', '#ffd700');
                clickArea.setAttribute('stroke-width', '1');
                clickArea.classList.add('selected');
                
                // Glowing Effekt
                const glow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                glow.setAttribute('x', bed.x - 0.5);
                glow.setAttribute('y', bed.y - 0.5);
                glow.setAttribute('width', bed.width + 1);
                glow.setAttribute('height', bed.height + 1);
                glow.setAttribute('rx', '2');
                glow.setAttribute('fill', 'none');
                glow.setAttribute('stroke', 'rgba(255,215,0,0.5)');
                glow.setAttribute('stroke-width', '1.5');
                group.insertBefore(glow, shadow);
            }
            
            if (this.mode === 'edit') {
                clickArea.classList.add('editing');
                clickArea.style.cursor = 'move';
            }
            
            group.appendChild(clickArea);
            
            // Name-Label mit Hintergrund
            const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const textWidth = bed.name.length * 1.8 + 2;
            labelBg.setAttribute('x', bed.x + bed.width / 2 - textWidth / 2);
            labelBg.setAttribute('y', bed.y - 4);
            labelBg.setAttribute('width', textWidth);
            labelBg.setAttribute('height', 4);
            labelBg.setAttribute('rx', '1');
            labelBg.setAttribute('fill', 'rgba(255,255,255,0.9)');
            group.appendChild(labelBg);
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', bed.x + bed.width / 2);
            text.setAttribute('y', bed.y - 1.5);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '2.5');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('fill', '#5D4037');
            text.classList.add('zone-label');
            text.textContent = bed.name;
            group.appendChild(text);
            
            svg.appendChild(group);
            
            // Pflanzen im Beet rendern
            this.renderPlantsInBed(bed, plantsGroup);
        });
    }
    
    renderPlantsInBed(bed, plantsGroup) {
        if (!bed.plants || bed.plants.length === 0) return;
        
        const soilPadding = 1.5;
        const innerWidth = bed.width - soilPadding * 2;
        const innerHeight = bed.height - soilPadding * 2;
        
        bed.plants.forEach(plant => {
            // Verwende gespeichertes Icon oder Fallback auf getPlantType
            const plantIcon = plant.icon || (this.getPlantType(plant.name) + 'Icon');
            
            // Position aus plant.posX/posY (0-100%) oder Fallback
            let cx, cy;
            if (plant.posX !== undefined && plant.posY !== undefined) {
                cx = bed.x + soilPadding + (plant.posX / 100) * innerWidth;
                cy = bed.y + soilPadding + (plant.posY / 100) * innerHeight;
            } else {
                // Fallback: Grid-basierte Position
                const idx = bed.plants.indexOf(plant);
                const cols = Math.ceil(Math.sqrt(bed.plants.length));
                const col = idx % cols;
                const row = Math.floor(idx / cols);
                cx = bed.x + soilPadding + (col + 0.5) * (innerWidth / cols);
                cy = bed.y + soilPadding + (row + 0.5) * (innerHeight / Math.ceil(bed.plants.length / cols));
            }
            
            const plantGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            plantGroup.classList.add('plant-marker');
            plantGroup.dataset.plantId = plant.id;
            
            // Highlighted-Klasse wenn diese Pflanze gesucht wurde
            if (this.highlightedPlant && 
                this.highlightedPlant.plantId === plant.id && 
                this.highlightedPlant.bedId === bed.id) {
                plantGroup.classList.add('highlighted');
            }
            
            // Pflanzensymbol
            const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
            use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${plantIcon}`);
            use.setAttribute('x', cx - 2);
            use.setAttribute('y', cy - 2);
            use.setAttribute('width', '4');
            use.setAttribute('height', '4');
            plantGroup.appendChild(use);
            
            // Nummer-Badge
            const number = plant.number || bed.plants.indexOf(plant) + 1;
            
            // Badge Hintergrund
            const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            badgeBg.setAttribute('cx', cx + 1.5);
            badgeBg.setAttribute('cy', cy - 1.5);
            badgeBg.setAttribute('r', '1.8');
            badgeBg.setAttribute('fill', '#e74c3c');
            badgeBg.setAttribute('stroke', '#fff');
            badgeBg.setAttribute('stroke-width', '0.3');
            plantGroup.appendChild(badgeBg);
            
            // Nummer Text
            const numText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            numText.setAttribute('x', cx + 1.5);
            numText.setAttribute('y', cy - 1);
            numText.setAttribute('text-anchor', 'middle');
            numText.setAttribute('font-size', '2');
            numText.setAttribute('font-weight', 'bold');
            numText.setAttribute('fill', '#fff');
            numText.textContent = number;
            plantGroup.appendChild(numText);
            
            plantsGroup.appendChild(plantGroup);
        });
    }
    
    getPlantType(name) {
        const lowerName = (name || '').toLowerCase();
        
        // Suche in der Pflanzen-Datenbank
        const plant = this.plantDatabase.find(p => 
            p.name.toLowerCase() === lowerName ||
            p.id === lowerName ||
            p.keywords.some(k => lowerName.includes(k))
        );
        
        if (plant) {
            return plant.icon.replace('Icon', '');
        }
        
        // Fallback für alte Pflanzen
        if (lowerName.includes('tomat')) return 'tomato';
        if (lowerName.includes('karott') || lowerName.includes('möhr')) return 'carrot';
        if (lowerName.includes('salat')) return 'salad';
        if (lowerName.includes('gurk')) return 'cucumber';
        if (lowerName.includes('paprik')) return 'pepper';
        if (lowerName.includes('zwieb')) return 'onion';
        if (lowerName.includes('kartoff')) return 'potato';
        if (lowerName.includes('basil')) return 'basil';
        if (lowerName.includes('minz')) return 'mint';
        if (lowerName.includes('peter')) return 'parsley';
        if (lowerName.includes('rosmar')) return 'rosemary';
        if (lowerName.includes('thym')) return 'thyme';
        if (lowerName.includes('schnitt')) return 'chive';
        if (lowerName.includes('erdbeer')) return 'strawberry';
        if (lowerName.includes('sonnenblum')) return 'sunflower';
        
        return 'plant';
    }
    
    // ========== PLANT PICKER MODAL ==========
    
    initPlantPicker() {
        this.selectedPlantType = null;
        this.pendingPlantPosition = null;
        
        const modal = document.getElementById('plantPickerModal');
        const closeBtn = document.getElementById('closePlantPickerModal');
        const searchInput = document.getElementById('plantSearchInput');
        const categoriesEl = document.getElementById('plantPickerCategories');
        const openBtn = document.getElementById('openPlantPickerBtn');
        
        if (!modal) return;
        
        // Kategorien rendern
        const categories = [...new Set(this.plantDatabase.map(p => p.category))];
        if (categoriesEl) {
            categoriesEl.innerHTML = `
                <button class="category-btn active" data-category="all">Alle</button>
                ${categories.map(cat => `<button class="category-btn" data-category="${cat}">${cat}</button>`).join('')}
            `;
            
            categoriesEl.querySelectorAll('.category-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    categoriesEl.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.filterPlantPicker(searchInput?.value || '', btn.dataset.category);
                });
            });
        }
        
        // Initiale Grid rendern
        this.renderPlantPickerGrid();
        
        // Button zum Öffnen
        if (openBtn) {
            openBtn.addEventListener('click', () => {
                this.openPlantPicker();
            });
        }
        
        // Schließen-Button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closePlantPicker();
            });
        }
        
        // Klick auf Overlay schließt Modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closePlantPicker();
            }
        });
        
        // Suche
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const activeCategory = categoriesEl?.querySelector('.category-btn.active')?.dataset.category || 'all';
                this.filterPlantPicker(e.target.value, activeCategory);
            });
        }
    }
    
    openPlantPicker(posX = null, posY = null) {
        if (!this.selectedBed) {
            this.showToast('Bitte wähle zuerst ein Hochbeet aus', 'error');
            return;
        }
        
        // Position speichern für späteres Platzieren
        this.pendingPlantPosition = { x: posX, y: posY };
        this.plantPickerMode = 'bedDetails';
        
        const modal = document.getElementById('plantPickerModal');
        const searchInput = document.getElementById('plantSearchInput');
        
        if (modal) {
            modal.classList.remove('hidden');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            this.filterPlantPicker('', 'all');
        }
    }
    
    openPlantPickerForForm() {
        this.plantPickerMode = 'form';
        
        const modal = document.getElementById('plantPickerModal');
        const searchInput = document.getElementById('plantSearchInput');
        
        if (modal) {
            modal.classList.remove('hidden');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            this.filterPlantPicker('', 'all');
        }
    }
    
    closePlantPicker() {
        const modal = document.getElementById('plantPickerModal');
        if (modal) modal.classList.add('hidden');
        this.pendingPlantPosition = null;
    }
    
    renderPlantPickerGrid(plants = null) {
        const gridEl = document.getElementById('plantPickerGrid');
        if (!gridEl) return;
        
        const plantsToRender = plants || this.plantDatabase;
        
        gridEl.innerHTML = plantsToRender.map(plant => `
            <div class="plant-card" data-plant-id="${plant.id}">
                <svg class="plant-card-icon" viewBox="0 0 10 10">
                    <use href="#${plant.icon}"/>
                </svg>
                <span class="plant-card-name">${plant.name}</span>
                <span class="plant-card-category">${plant.category}</span>
            </div>
        `).join('');
        
        // Klick-Events
        gridEl.querySelectorAll('.plant-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectPlantFromPicker(card.dataset.plantId);
            });
        });
    }
    
    filterPlantPicker(query, category = 'all') {
        const lowerQuery = query.toLowerCase().trim();
        
        let filtered = this.plantDatabase.filter(plant => {
            const matchesCategory = category === 'all' || plant.category === category;
            const matchesQuery = !lowerQuery || 
                plant.name.toLowerCase().includes(lowerQuery) ||
                plant.keywords.some(k => k.includes(lowerQuery));
            return matchesCategory && matchesQuery;
        });
        
        this.renderPlantPickerGrid(filtered);
    }
    
    selectPlantFromPicker(plantId) {
        const plant = this.plantDatabase.find(p => p.id === plantId);
        if (!plant) return;
        
        // Form-Modus: nur Auswahl speichern, nicht hinzufügen
        if (this.plantPickerMode === 'form') {
            // Auswahl in Klassenvariable speichern
            this.selectedPlantForForm = {
                name: plant.name,
                icon: plant.icon
            };
            
            // UI aktualisieren
            const selectedIcon = document.getElementById('selectedPlantIcon');
            const selectedName = document.getElementById('selectedPlantName');
            
            if (selectedName) selectedName.textContent = plant.name;
            if (selectedIcon) {
                selectedIcon.innerHTML = `<svg viewBox="0 0 10 10"><use href="#${plant.icon}"/></svg>`;
            }
            
            this.closePlantPicker();
            return;
        }
        
        // BedDetails-Modus: Pflanze direkt hinzufügen
        if (!this.selectedBed) return;
        
        // Nächste Nummer berechnen
        const existingNumbers = this.selectedBed.plants.map(p => p.number || 0);
        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        
        // Position - entweder gespeichert oder zufällig
        let posX, posY;
        if (this.pendingPlantPosition && this.pendingPlantPosition.x !== null) {
            posX = this.pendingPlantPosition.x;
            posY = this.pendingPlantPosition.y;
        } else {
            posX = 10 + Math.random() * 80;
            posY = 15 + Math.random() * 70;
        }
        
        const newPlant = {
            id: this.plantIdCounter++,
            number: nextNumber,
            name: plant.name,
            icon: plant.icon,
            quantity: 1,
            date: new Date().toISOString().split('T')[0],
            posX: posX,
            posY: posY
        };
        
        this.selectedBed.plants.push(newPlant);
        
        // Modal schließen
        this.closePlantPicker();
        
        // UI aktualisieren
        this.render();
        this.updateInlineBedInfo();
        this.updateStatistics();
        this.saveToLocalStorage();
        this.showToast(`${plant.name} (#${nextNumber}) hinzugefügt`, 'success');
    }
    
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }
    
    // ========== PFLANZEN-SUCHE ==========
    
    initPlantSearch() {
        this.highlightedPlant = null;
        
        const searchInput = document.getElementById('plantSearchGlobal');
        const resultsEl = document.getElementById('plantSearchResults');
        const clearBtn = document.getElementById('searchClearBtn');
        
        if (!searchInput || !resultsEl) return;
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (clearBtn) {
                clearBtn.classList.toggle('hidden', query.length === 0);
            }
            
            if (query.length < 1) {
                resultsEl.classList.add('hidden');
                this.clearPlantHighlight();
                return;
            }
            
            this.searchPlants(query);
        });
        
        searchInput.addEventListener('focus', () => {
            const query = searchInput.value.trim();
            if (query.length >= 1) {
                this.searchPlants(query);
            }
        });
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                resultsEl.classList.add('hidden');
                clearBtn.classList.add('hidden');
                this.clearPlantHighlight();
            });
        }
        
        // Klick außerhalb schließt Ergebnisse
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !resultsEl.contains(e.target)) {
                resultsEl.classList.add('hidden');
            }
        });
    }
    
    searchPlants(query) {
        const resultsEl = document.getElementById('plantSearchResults');
        if (!resultsEl) return;
        
        const lowerQuery = query.toLowerCase();
        const results = [];
        
        // Alle Pflanzen in allen Beeten durchsuchen
        this.beds.forEach(bed => {
            bed.plants.forEach(plant => {
                if (plant.name.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        plant,
                        bed,
                        icon: plant.icon || this.getPlantIconFromName(plant.name)
                    });
                }
            });
        });
        
        if (results.length === 0) {
            resultsEl.innerHTML = '<div class="no-results">Keine Pflanzen gefunden</div>';
        } else {
            resultsEl.innerHTML = results.map(r => `
                <div class="search-result-item" data-plant-id="${r.plant.id}" data-bed-id="${r.bed.id}">
                    <svg class="search-result-icon" viewBox="0 0 10 10">
                        <use href="#${r.icon}"/>
                    </svg>
                    <div class="search-result-info">
                        <div class="search-result-name">${r.plant.name}</div>
                        <div class="search-result-location">${r.bed.name}</div>
                    </div>
                    <span class="search-result-number">#${r.plant.number || '?'}</span>
                </div>
            `).join('');
            
            // Klick-Events
            resultsEl.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const plantId = parseInt(item.dataset.plantId);
                    const bedId = parseInt(item.dataset.bedId);
                    this.focusOnPlant(plantId, bedId);
                    resultsEl.classList.add('hidden');
                });
            });
        }
        
        resultsEl.classList.remove('hidden');
    }
    
    getPlantIconFromName(name) {
        const type = this.getPlantType(name);
        return type + 'Icon';
    }
    
    focusOnPlant(plantId, bedId) {
        const bed = this.beds.find(b => b.id === bedId);
        const plant = bed?.plants.find(p => p.id === plantId);
        
        if (!bed || !plant) return;
        
        // Beet auswählen
        this.selectedBed = bed;
        this.selectedBeds = [bed];
        
        // Highlight setzen
        this.highlightedPlant = { plantId, bedId };
        
        // Neu rendern
        this.render();
        this.updateInlineBedInfo();
        
        // Nach kurzer Zeit Highlight entfernen (optional)
        setTimeout(() => {
            // Highlight bleibt bis zur nächsten Suche oder Klick
        }, 5000);
        
        this.showToast(`${plant.name} in ${bed.name} gefunden`, 'info');
    }
    
    clearPlantHighlight() {
        this.highlightedPlant = null;
        this.render();
    }
    
    // ========== DÜNGER-FUNKTIONEN ==========
    
    applyFertilizer() {
        if (this.selectedBeds.length === 0) {
            this.showToast('Bitte wählen Sie zuerst ein oder mehrere Hochbeete aus', 'error');
            return;
        }
        
        const nitrogen = parseFloat(document.getElementById('nitrogen').value) || 0;
        const phosphorus = parseFloat(document.getElementById('phosphorus').value) || 0;
        const potassium = parseFloat(document.getElementById('potassium').value) || 0;
        
        if (nitrogen === 0 && phosphorus === 0 && potassium === 0) {
            this.showToast('Bitte geben Sie Düngermengen ein', 'error');
            return;
        }
        
        // Dünger auf alle ausgewählten Beete anwenden
        this.selectedBeds.forEach(bed => {
            bed.fertilizer.nitrogen += nitrogen;
            bed.fertilizer.phosphorus += phosphorus;
            bed.fertilizer.potassium += potassium;
        });
        
        const bedNames = this.selectedBeds.map(b => b.name).join(', ');
        this.log('INFO', `Dünger angewendet auf: ${bedNames}`, { nitrogen, phosphorus, potassium });
        
        this.updateStatistics();
        this.updateBedSelectionUI();
        this.saveToLocalStorage();
        this.render();
        
        this.showToast(`Dünger erfolgreich auf ${this.selectedBeds.length} Hochbeet(e) angewendet`, 'success');
    }
    
    // ========== DATEN-MANAGEMENT ==========
    
    clearAll() {
        if (this.beds.length === 0) {
            this.showToast('Keine Daten zum Löschen vorhanden', 'info');
            return;
        }
        
        if (confirm('Wollen Sie wirklich alle Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            // Alle Daten zurücksetzen
            this.beds = [];
            this.selectedBeds = [];
            this.selectedBed = null;
            
            // Counter zurücksetzen
            this.bedIdCounter = 1;
            this.plantIdCounter = 1;
            this.todoIdCounter = 1;
            
            // UI zurücksetzen
            document.getElementById('selectedPlantInfo').classList.add('hidden');
            document.getElementById('noPlantSelected').classList.remove('hidden');
            document.getElementById('zoneProperties').classList.add('hidden');
            
            // Standardkarte neu erstellen
            this.createDefaultMap();
            this.render();
            this.updateStatistics();
            this.updateBedSelector();
            this.saveToLocalStorage();
            this.showToast('Alle Daten entfernt', 'info');
        }
    }
    
    updateBedSelector() {
        // Dropdown für Pflanzenzuweisung (plantSlot)
        const plantSelector = document.getElementById('plantSlot');
        if (plantSelector) {
            plantSelector.innerHTML = '<option value="">Bitte wählen...</option>';
            this.beds.forEach(bed => {
                const option = document.createElement('option');
                option.value = bed.id;
                option.textContent = `${bed.name} (${bed.plants.length} Pflanzen)`;
                plantSelector.appendChild(option);
            });
        }
        
        // Dropdown für Editor (zoneSelector)
        const zoneSelector = document.getElementById('zoneSelector');
        if (zoneSelector) {
            zoneSelector.innerHTML = '<option value="">Hochbeet wählen...</option>';
            this.beds.forEach(bed => {
                const option = document.createElement('option');
                option.value = bed.id;
                option.textContent = bed.name;
                if (this.selectedBed && this.selectedBed.id === bed.id) {
                    option.selected = true;
                }
                zoneSelector.appendChild(option);
            });
        }
    }
    
    updateStatistics() {
        // Gesamtzahl Pflanzen über alle Beete
        const totalPlants = this.beds.reduce((sum, bed) => {
            return sum + bed.plants.reduce((pSum, p) => pSum + (p.quantity || 1), 0);
        }, 0);
        
        // Gesamtdünger über alle Beete
        const totalNitrogen = this.beds.reduce((sum, bed) => sum + bed.fertilizer.nitrogen, 0);
        const totalPhosphorus = this.beds.reduce((sum, bed) => sum + bed.fertilizer.phosphorus, 0);
        const totalPotassium = this.beds.reduce((sum, bed) => sum + bed.fertilizer.potassium, 0);
        
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
        const container = document.getElementById('plantMap');
        
        // Neue ViewBox basierend auf Zoom berechnen
        const baseSize = 100;
        const viewSize = baseSize / this.zoom;
        const offset = (baseSize - viewSize) / 2;
        
        svg.setAttribute('viewBox', `${offset + this.panX} ${offset + this.panY} ${viewSize} ${viewSize}`);
    }
    
    // Graphen-Funktionen
    initializeGraphs() {
        // Temperatur-Graph initialisieren
        this.graphConfig.temperature.canvas = document.getElementById('tempGraph');
        this.graphConfig.temperature.ctx = this.graphConfig.temperature.canvas
            ? this.graphConfig.temperature.canvas.getContext('2d')
            : null;
        
        // Luftfeuchtigkeit-Graph initialisieren
        this.graphConfig.humidity.canvas = document.getElementById('humidityGraph');
        this.graphConfig.humidity.ctx = this.graphConfig.humidity.canvas
            ? this.graphConfig.humidity.canvas.getContext('2d')
            : null;

        this.graphConfig.soilMoisture.canvas = document.getElementById('soilMoistureGraph');
        this.graphConfig.soilMoisture.ctx = this.graphConfig.soilMoisture.canvas
            ? this.graphConfig.soilMoisture.canvas.getContext('2d')
            : null;
        
        // Event Listener für Zeitbereich-Buttons
        this.setupGraphEventListeners();
        
        // Initiale Daten generieren
        this.generateInitialSensorData();
        
        // Graphen zeichnen
        this.drawGraph('temperature');
        this.drawGraph('humidity');
        this.drawGraph('soilMoisture');
        
        this.log('INFO', 'Graphen initialisiert');
    }
    
    setupGraphEventListeners() {
        // Beide Klassen abdecken: alte .graph-card und neue .graph-card-compact
        document.querySelectorAll('[data-sensor]').forEach(card => {
            const sensorType = card.dataset.sensor;
            if (!sensorType) return;
            
            card.querySelectorAll('.time-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const range = e.target.dataset.range || e.target.closest('.time-btn')?.dataset.range;
                    if (range) {
                        this.updateTimeRange(sensorType, range);
                    }
                });
            });
        });
    }
    
    updateTimeRange(sensorType, range) {
        this.graphConfig[sensorType].currentRange = range;
        
        // Button-Status aktualisieren - beide Klassen abdecken
        const graphCards = document.querySelectorAll(`[data-sensor="${sensorType}"]`);
        graphCards.forEach(card => {
            card.querySelectorAll('.time-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.range === range);
            });
            
            // Slider-Position aktualisieren falls vorhanden
            const slider = card.querySelector('.time-slider-thumb');
            if (slider) {
                const positions = { '1h': '0', '6h': '1', '24h': '2' };
                slider.setAttribute('data-pos', positions[range] || '0');
            }
        });
        
        // Graph neu zeichnen
        this.drawGraph(sensorType);
        
        this.log('INFO', `Zeitbereich für ${sensorType} aktualisiert`, { range });
    }
    
    generateInitialSensorData() {
        const now = Date.now();
        
        // Generiere durchgehende Daten für die letzten 7 Tage (alle 10 Minuten)
        const interval = 10 * 60 * 1000; // 10 Minuten
        const totalPoints = (7 * 24 * 60) / 10; // 7 Tage in 10-Minuten-Intervallen = 1008 Punkte
        
        // Basiswerte mit Tages- und Wochenrhythmus
        for (let i = totalPoints - 1; i >= 0; i--) {
            const timestamp = now - (i * interval);
            const hour = new Date(timestamp).getHours();
            const dayOfWeek = new Date(timestamp).getDay();
            
            // Temperatur: Tagesrhythmus (kälter nachts, wärmer mittags) + zufällige Variation
            const tempBase = 22;
            const tempDayVariation = Math.sin((hour - 6) * Math.PI / 12) * 5; // Peak um 12 Uhr
            const tempRandom = (Math.random() - 0.5) * 3;
            const tempTrend = Math.sin(i / 100) * 2; // Langfristiger Trend
            const tempValue = tempBase + tempDayVariation + tempRandom + tempTrend;
            
            this.sensorHistory.temperature.push({
                timestamp,
                value: parseFloat(Math.max(15, Math.min(35, tempValue)).toFixed(1))
            });
            
            // Luftfeuchtigkeit: Umgekehrter Tagesrhythmus (höher nachts)
            const humBase = 60;
            const humDayVariation = -Math.sin((hour - 6) * Math.PI / 12) * 15;
            const humRandom = (Math.random() - 0.5) * 10;
            const humTrend = Math.cos(i / 80) * 5;
            const humValue = humBase + humDayVariation + humRandom + humTrend;
            
            this.sensorHistory.humidity.push({
                timestamp,
                value: parseFloat(Math.max(30, Math.min(95, humValue)).toFixed(1))
            });
            
            // Bodenfeuchtigkeit: Langsamer Abfall mit gelegentlichen Sprüngen (Bewässerung)
            const soilBase = 50;
            const soilDecay = (i % 144) / 144 * 20; // Fällt über 24h ab
            const soilWatering = (i % 144 < 10) ? 25 : 0; // Bewässerung alle 24h
            const soilRandom = (Math.random() - 0.5) * 5;
            const soilValue = soilBase - soilDecay + soilWatering + soilRandom;
            
            this.sensorHistory.soilMoisture.push({
                timestamp,
                value: parseFloat(Math.max(20, Math.min(80, soilValue)).toFixed(1))
            });
        }
        
        // Daten sind bereits sortiert (älteste zuerst)
        
        // Alte Daten begrenzen
        this.limitSensorHistory();
    }
    
    getDataPointsForRange(range) {
        const points = {
            '1h': 12,    // 12 Punkte (alle 5 Minuten)
            '6h': 12,    // 12 Punkte (alle 30 Minuten)
            '24h': 12,   // 12 Punkte (alle 2 Stunden)
            '7d': 28     // 28 Punkte (alle 6 Stunden)
        };
        return points[range] || 12;
    }
    
    limitSensorHistory() {
        const maxPoints = 1500; // Max 1500 Datenpunkte pro Sensor (genug für 7 Tage bei 10-Min-Intervallen)
        
        if (this.sensorHistory.temperature.length > maxPoints) {
            this.sensorHistory.temperature = this.sensorHistory.temperature.slice(-maxPoints);
        }
        
        if (this.sensorHistory.humidity.length > maxPoints) {
            this.sensorHistory.humidity = this.sensorHistory.humidity.slice(-maxPoints);
        }

        if (this.sensorHistory.soilMoisture.length > maxPoints) {
            this.sensorHistory.soilMoisture = this.sensorHistory.soilMoisture.slice(-maxPoints);
        }
    }
    
    addSensorData(sensorType, value) {
        const timestamp = Date.now();
        const data = {
            timestamp,
            value: parseFloat(value.toFixed(1)),
            range: 'current'
        };
        
        this.sensorHistory[sensorType].push(data);
        this.limitSensorHistory();
        
        // Graphen aktualisieren, wenn sichtbar
        if (this.graphConfig[sensorType].canvas) {
            this.drawGraph(sensorType);
        }
    }
    
    drawGraph(sensorType) {
        const config = this.graphConfig[sensorType];
        const canvas = config.canvas;
        const ctx = config.ctx;
        
        if (!canvas || !ctx) return;
        
        // Canvas-Größe aus tatsächlicher Darstellung
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2; // Retina
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        
        const width = rect.width;
        const height = rect.height;
        
        // Padding für Achsenbeschriftungen
        const paddingLeft = 45;
        const paddingRight = 10;
        const paddingTop = 10;
        const paddingBottom = 25;
        const graphWidth = width - paddingLeft - paddingRight;
        const graphHeight = height - paddingTop - paddingBottom;
        
        // Canvas löschen
        ctx.clearRect(0, 0, width, height);
        
        // Daten für aktuellen Zeitbereich filtern
        const data = this.getFilteredData(sensorType, config.currentRange);
        
        if (data.length < 2) return;
        
        // Werte berechnen
        const values = data.map(d => d.value);
        const minValue = Math.min(...values) - 2;
        const maxValue = Math.max(...values) + 2;
        const valueRange = maxValue - minValue;
        
        // Farben
        const colors = {
            temperature: { line: '#ff6b6b', fill: 'rgba(255,107,107,0.1)' },
            humidity: { line: '#4ecdc4', fill: 'rgba(78,205,196,0.1)' },
            soilMoisture: { line: '#a8e063', fill: 'rgba(168,224,99,0.1)' }
        };
        const color = colors[sensorType] || colors.temperature;
        
        // Grid zeichnen
        this.drawGraphGrid(ctx, paddingLeft, paddingTop, graphWidth, graphHeight, minValue, maxValue, sensorType);
        
        // Fläche unter der Linie
        ctx.fillStyle = color.fill;
        ctx.beginPath();
        data.forEach((point, index) => {
            const x = paddingLeft + (index / (data.length - 1)) * graphWidth;
            const y = paddingTop + graphHeight - ((point.value - minValue) / valueRange) * graphHeight;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.lineTo(paddingLeft + graphWidth, paddingTop + graphHeight);
        ctx.lineTo(paddingLeft, paddingTop + graphHeight);
        ctx.closePath();
        ctx.fill();
        
        // Linie zeichnen
        ctx.strokeStyle = color.line;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = paddingLeft + (index / (data.length - 1)) * graphWidth;
            const y = paddingTop + graphHeight - ((point.value - minValue) / valueRange) * graphHeight;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        // Zeitbeschriftungen
        this.drawTimeLabels(ctx, paddingLeft, paddingTop, graphWidth, graphHeight, data);
    }
    
    drawGraphGrid(ctx, paddingLeft, paddingTop, graphWidth, graphHeight, minValue, maxValue, sensorType) {
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        ctx.font = '9px Arial';
        ctx.fillStyle = '#888';
        
        // Horizontale Linien und Werte
        for (let i = 0; i <= 4; i++) {
            const y = paddingTop + (i * graphHeight / 4);
            const value = maxValue - (i * (maxValue - minValue) / 4);
            
            ctx.beginPath();
            ctx.moveTo(paddingLeft, y);
            ctx.lineTo(paddingLeft + graphWidth, y);
            ctx.stroke();
            
            const label = sensorType === 'temperature' ? `${value.toFixed(0)}°` : `${value.toFixed(0)}%`;
            ctx.textAlign = 'right';
            ctx.fillText(label, paddingLeft - 5, y + 3);
        }
        ctx.textAlign = 'left';
    }
    
    drawTimeLabels(ctx, paddingLeft, paddingTop, graphWidth, graphHeight, data) {
        ctx.fillStyle = '#888';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        
        if (data.length === 0) return;
        
        const firstTime = new Date(data[0].timestamp);
        const lastTime = new Date(data[data.length - 1].timestamp);
        
        // Nur erste und letzte Zeit anzeigen
        const firstLabel = this.formatTimeLabel(firstTime);
        const lastLabel = this.formatTimeLabel(lastTime);
        
        const bottomY = paddingTop + graphHeight + 15;
        ctx.fillText(firstLabel, paddingLeft, bottomY);
        ctx.fillText(lastLabel, paddingLeft + graphWidth, bottomY);
        ctx.textAlign = 'left';
    }
    
    formatTimeLabel(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60 * 60 * 1000) { // Weniger als 1 Stunde
            return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 24 * 60 * 60 * 1000) { // Weniger als 1 Tag
            return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' });
        }
    }
    
    getFilteredData(sensorType, range) {
        const now = Date.now();
        const ranges = {
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000
        };
        
        const rangeMs = ranges[range] || ranges['1h'];
        const cutoffTime = now - rangeMs;
        
        // Alle Daten im Zeitbereich filtern
        const filteredData = this.sensorHistory[sensorType]
            .filter(d => d.timestamp >= cutoffTime);
        
        if (filteredData.length === 0) return [];
        
        // Daten auf max 30 Punkte reduzieren durch gleichmäßiges Sampling
        const maxPoints = 30;
        if (filteredData.length <= maxPoints) {
            return filteredData;
        }
        
        // Gleichmäßig verteilt samplen
        const step = (filteredData.length - 1) / (maxPoints - 1);
        const sampledData = [];
        for (let i = 0; i < maxPoints; i++) {
            const index = Math.round(i * step);
            sampledData.push(filteredData[index]);
        }
        
        return sampledData;
    }
    
    // Logging-Funktionen
    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data: data
        };
        
        // Lokal speichern
        this.localLogs.push(logEntry);
        if (this.localLogs.length > 1000) {
            this.localLogs = this.localLogs.slice(-500); // Nur letzte 500 behalten
        }
        
        // In Konsole ausgeben
        const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
        
        // An Server senden, wenn aktiv
        if (this.serverConfig.enabled) {
            this.sendLogToServer(logEntry);
        }
    }
    
    async sendLogToServer(logEntry) {
        try {
            const response = await fetch(`${this.serverConfig.url}/api/logs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logEntry)
            });
            
            if (!response.ok) {
                console.warn('Fehler beim Senden des Logs an Server:', response.statusText);
            }
        } catch (error) {
            console.warn('Netzwerkfehler beim Senden des Logs:', error);
        }
    }
    
    async syncWithServer() {
        if (!this.serverConfig.enabled) return;
        
        try {
            const response = await fetch(`${this.serverConfig.url}/api/data`);
            if (response.ok) {
                const data = await response.json();
                this.log('INFO', 'Daten vom Server synchronisiert', { zones: data.zones?.length, slots: data.slots?.length, plants: data.plants?.length });
                
                // Daten aktualisieren
                if (data.zones) this.zones = data.zones;
                if (data.slots) this.slots = data.slots;
                if (data.plants) this.plants = data.plants;
                
                this.render();
                this.updateStatistics();
                this.updateSlotSelector();
            }
        } catch (error) {
            this.log('ERROR', 'Fehler bei Server-Synchronisation', error);
        }
    }
    
    async saveToServer() {
        if (!this.serverConfig.enabled) return;
        
        try {
            const response = await fetch(`${this.serverConfig.url}/api/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    zones: this.zones,
                    slots: this.slots,
                    plants: this.plants
                })
            });
            
            if (response.ok) {
                this.log('INFO', 'Daten erfolgreich auf Server gespeichert', { zones: this.zones.length, slots: this.slots.length, plants: this.plants.length });
            } else {
                this.log('ERROR', 'Fehler beim Speichern auf Server', await response.text());
            }
        } catch (error) {
            this.log('ERROR', 'Netzwerkfehler beim Speichern auf Server', error);
        }
    }
    
    startServerSync() {
        if (!this.serverConfig.enabled || !this.serverConfig.autoSync) return;
        
        // Sofort synchronisieren
        this.syncWithServer();
        
        // Regelmäßig synchronisieren
        setInterval(() => {
            this.syncWithServer();
        }, this.serverConfig.syncInterval);
        
        this.log('INFO', 'Server-Synchronisation gestartet', { interval: this.serverConfig.syncInterval });
    }
    
    // Robuste Fehlerbehandlung und Validierung
    validateElement(elementId, required = true) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element nicht gefunden: ${elementId}`);
            return null;
        }
        if (required && !element.value.trim()) {
            console.error(`Element ${elementId} ist erforderlich`);
            return null;
        }
        return element;
    }
    
    safeParseInt(value, defaultValue = 0) {
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }
    
    safeParseFloat(value, defaultValue = 0) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }
    
    showError(message, error = null) {
        console.error(message, error);
        this.showToast(message, 'error');
    }
    
    logInfo(message, data = null) {
        console.log(message, data);
    }
    
    getPlantDisplayName(plant) {
        if (!plant) {
            return 'Unbekannte Pflanze';
        }
        
        if (plant.customName && plant.customName.trim()) {
            return plant.customName.trim();
        }
        
        const displayNames = {
            'weizen': 'Weizen',
            'gerste': 'Gerste',
            'mais': 'Mais',
            'kartoffeln': 'Kartoffeln',
            'rueben': 'Rüben',
            'sonnenblumen': 'Sonnenblumen'
        };
        
        return displayNames[plant.name] || plant.name || 'Unbekannte Pflanze';
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
        try {
            // Neue Hochbeet-Daten speichern
            localStorage.setItem('fertilizerBeds', JSON.stringify(this.beds));
            localStorage.setItem('fertilizerBedIdCounter', this.bedIdCounter.toString());
            localStorage.setItem('fertilizerPlantIdCounter', this.plantIdCounter.toString());
            localStorage.setItem('fertilizerTodoIdCounter', this.todoIdCounter.toString());
            localStorage.setItem('darkMode', this.darkMode.toString());
            localStorage.setItem('waterTank', JSON.stringify(this.waterTank));
            localStorage.setItem('sensors', JSON.stringify(this.sensors));
            localStorage.setItem('nodeRed', JSON.stringify(this.nodeRed));
            localStorage.setItem('serverConfig', JSON.stringify(this.serverConfig));
            
            // Alte Daten entfernen (Hard Reset)
            localStorage.removeItem('fertilizerPlants');
            localStorage.removeItem('fertilizerSlots');
            localStorage.removeItem('fertilizerZones');
            localStorage.removeItem('fertilizerSlotIdCounter');
            localStorage.removeItem('fertilizerZoneIdCounter');
            
            const totalPlants = this.beds.reduce((sum, bed) => sum + bed.plants.length, 0);
            this.log('INFO', 'Daten in LocalStorage gespeichert', { 
                beds: this.beds.length, 
                plants: totalPlants
            });
            
            // Auch auf Server speichern, wenn aktiv
            this.saveToServer();
            
        } catch (error) {
            this.log('ERROR', 'Fehler beim Speichern der Daten', error);
            this.showToast('Fehler beim Speichern der Daten', 'error');
        }
    }
    
    loadFromLocalStorage() {
        try {
            // Neue Hochbeet-Daten laden
            const savedBeds = localStorage.getItem('fertilizerBeds');
            const savedBedCounter = localStorage.getItem('fertilizerBedIdCounter');
            const savedPlantCounter = localStorage.getItem('fertilizerPlantIdCounter');
            const savedTodoCounter = localStorage.getItem('fertilizerTodoIdCounter');
            const savedServerConfig = localStorage.getItem('serverConfig');
            
            if (savedBeds) {
                this.beds = JSON.parse(savedBeds);
                // Sicherstellen, dass alle Beete die neuen Felder haben
                this.beds.forEach(bed => {
                    if (!bed.plants) bed.plants = [];
                    if (!bed.todos) bed.todos = [];
                    if (!bed.fertilizer) bed.fertilizer = { nitrogen: 0, phosphorus: 0, potassium: 0 };
                });
            }
            if (savedBedCounter) this.bedIdCounter = parseInt(savedBedCounter);
            if (savedPlantCounter) this.plantIdCounter = parseInt(savedPlantCounter);
            if (savedTodoCounter) this.todoIdCounter = parseInt(savedTodoCounter);
            if (savedServerConfig) this.serverConfig = JSON.parse(savedServerConfig);
            
            // Dark Mode laden
            const savedDarkMode = localStorage.getItem('darkMode');
            if (savedDarkMode) {
                this.darkMode = savedDarkMode === 'true';
            }
            
            // Sensordaten laden
            const savedSensors = localStorage.getItem('sensors');
            const savedNodeRed = localStorage.getItem('nodeRed');
            const savedWaterTank = localStorage.getItem('waterTank');
            
            if (savedSensors) this.sensors = JSON.parse(savedSensors);
            if (savedNodeRed) this.nodeRed = JSON.parse(savedNodeRed);
            if (savedWaterTank) this.waterTank = JSON.parse(savedWaterTank);
            
            const totalPlants = this.beds.reduce((sum, bed) => sum + bed.plants.length, 0);
            this.log('INFO', 'Daten aus LocalStorage geladen', { 
                beds: this.beds.length, 
                plants: totalPlants,
                serverEnabled: this.serverConfig.enabled
            });
            
        } catch (error) {
            this.log('ERROR', 'Fehler beim Laden der Daten', error);
            this.showToast('Fehler beim Laden der gespeicherten Daten', 'error');
        }
    }
    
    // Wassertank-Funktionen
    updateWaterTank() {
        const percentage = (this.waterTank.currentLevel / this.waterTank.capacity) * 100;
        const roundedPercentage = Math.round(percentage);
        
        // UI aktualisieren
        const tankPercentage = document.getElementById('tankPercentage');
        const tankVolume = document.getElementById('tankVolume');
        const tankWater = document.getElementById('tankWater');
        const tankBarFill = document.getElementById('tankBarFill');
        const waterTemp = document.getElementById('waterTemp');
        const lastUpdate = document.getElementById('lastUpdate');
        
        if (tankPercentage) tankPercentage.textContent = `${roundedPercentage}%`;
        if (tankVolume) tankVolume.textContent = `${Math.round(this.waterTank.currentLevel)}L`;
        if (tankWater) tankWater.style.height = `${percentage}%`;
        if (tankBarFill) tankBarFill.style.width = `${percentage}%`;
        if (waterTemp) waterTemp.textContent = `${this.waterTank.temperature.toFixed(1)}°C`;
        
        // Zeit seit letzter Aktualisierung
        const now = new Date();
        const diffMinutes = Math.floor((now - new Date(this.waterTank.lastUpdate)) / 60000);
        if (lastUpdate) lastUpdate.textContent = diffMinutes === 0 ? 'gerade eben' : `vor ${diffMinutes} Min.`;
        
        // Status aktualisieren
        const statusIndicator = document.getElementById('tankStatusIndicator');
        const warningIcon = document.getElementById('warningIcon');
        const warningText = document.getElementById('warningText');
        
        if (percentage <= this.waterTank.warningLevel) {
            if (statusIndicator) statusIndicator.className = 'status-indicator danger';
            if (warningIcon) warningIcon.className = 'fas fa-exclamation-triangle';
            if (warningText) warningText.textContent = 'Niedriger Füllstand';
        } else if (percentage <= 30) {
            if (statusIndicator) statusIndicator.className = 'status-indicator warning';
            if (warningIcon) warningIcon.className = 'fas fa-exclamation-circle';
            if (warningText) warningText.textContent = 'Achtung';
        } else {
            if (statusIndicator) statusIndicator.className = 'status-indicator';
            if (warningIcon) warningIcon.className = 'fas fa-check-circle';
            if (warningText) warningText.textContent = 'Normal';
        }
    }
    
    startWaterTankSimulation() {
        // Simuliert Wasserentnahme und -zufuhr
        setInterval(() => {
            // Zufällige Wasserentnahme (Bewässerung)
            const consumption = Math.random() * 5; // 0-5 Liter
            this.waterTank.currentLevel = Math.max(0, this.waterTank.currentLevel - consumption);
            
            // Zufällige Temperaturänderung
            this.waterTank.temperature += (Math.random() - 0.5) * 0.5;
            this.waterTank.temperature = Math.max(15, Math.min(25, this.waterTank.temperature));
            
            // Letzte Aktualisierung
            this.waterTank.lastUpdate = new Date();
            
            // UI aktualisieren
            this.updateWaterTank();
            this.saveToLocalStorage();
        }, 10000); // Alle 10 Sekunden
    }
    
    // NodeRED und Sensor-Funktionen
    initNodeRedConnection() {
        if (!this.nodeRed.enabled) return;
        
        this.updateConnectionStatus('connecting');
        
        try {
            this.nodeRedSocket = new WebSocket(this.nodeRed.websocketUrl);
            
            this.nodeRedSocket.onopen = () => {
                this.updateConnectionStatus('connected');
                this.showToast('NodeRED verbunden', 'success');
                
                // Topics abonnieren
                Object.values(this.nodeRed.topics).forEach(topic => {
                    this.nodeRedSocket.send(JSON.stringify({
                        type: 'subscribe',
                        topic: topic
                    }));
                });
            };
            
            this.nodeRedSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.processNodeRedMessage(data);
                } catch (e) {
                    console.error('Fehler bei NodeRED Nachricht:', e);
                }
            };
            
            this.nodeRedSocket.onclose = () => {
                this.updateConnectionStatus('disconnected');
                this.showToast('NodeRED Verbindung verloren', 'error');
                
                // Automatischer Reconnect
                setTimeout(() => {
                    this.initNodeRedConnection();
                }, this.nodeRed.reconnectInterval);
            };
            
            this.nodeRedSocket.onerror = (error) => {
                console.error('NodeRED WebSocket Fehler:', error);
                this.updateConnectionStatus('disconnected');
            };
            
        } catch (e) {
            console.error('NodeRED Verbindung fehlgeschlagen:', e);
            this.updateConnectionStatus('disconnected');
        }
    }
    
    processNodeRedMessage(data) {
        const { topic, payload } = data;
        
        switch (topic) {
            case this.nodeRed.topics.temperature:
                this.updateSensor('temperature', payload);
                break;
            case this.nodeRed.topics.humidity:
                this.updateSensor('humidity', payload);
                break;
            case this.nodeRed.topics.soilMoisture:
                this.updateSensor('soilMoisture', payload);
                break;
            case this.nodeRed.topics.waterTank:
                this.updateWaterTankFromNodeRed(payload);
                break;
            case this.nodeRed.topics.waterLevel:
                this.updateWaterLevelFromNodeRed(payload);
                break;
            case this.nodeRed.topics.waterTemperature:
                this.updateWaterTemperatureFromNodeRed(payload);
                break;
            default:
                break;
        }
    }
    
    updateSensor(sensorType, value) {
        const normalizedValue = (value && typeof value === 'object' && value.value !== undefined)
            ? value.value
            : value;

        const oldValue = this.sensors[sensorType].value;
        this.sensors[sensorType].value = normalizedValue;
        this.sensors[sensorType].lastUpdate = new Date();
        
        // Trend berechnen
        if (normalizedValue > oldValue) {
            this.sensors[sensorType].trend = 'up';
        } else if (normalizedValue < oldValue) {
            this.sensors[sensorType].trend = 'down';
        } else {
            this.sensors[sensorType].trend = 'stable';
        }
        
        // UI aktualisieren
        this.updateSensorUI(sensorType);
        this.updateSensorTrend(sensorType, oldValue, normalizedValue);
        
        // Daten zur Historie hinzufügen
        this.addSensorData(sensorType, normalizedValue);
        
        // Speichern
        this.saveToLocalStorage();
    }
    
    updateSensorUI(sensorType) {
        const sensor = this.sensors[sensorType];
        const idPrefix = sensorType === 'temperature' ? 'temp' : sensorType;
        const valueElement = document.getElementById(`${idPrefix}Value`);
        const timeElement = document.getElementById(`${idPrefix}Time`);
        
        if (valueElement) {
            valueElement.textContent = sensor.value.toFixed(1);
        }
        
        if (timeElement) {
            const now = new Date();
            const diffMinutes = Math.floor((now - sensor.lastUpdate) / 60000);
            timeElement.textContent = `vor ${diffMinutes} Min.`;
        }
    }
    
    updateSensorTrend(sensorType, oldValue, newValue) {
        const idPrefix = sensorType === 'temperature' ? 'temp' : sensorType;
        const trendElement = document.getElementById(`${idPrefix}Trend`);
        if (!trendElement) return;
        
        const diff = newValue - oldValue;
        const threshold = 0.5; // Mindeständerung für Trend
        
        trendElement.className = 'sensor-trend';
        
        if (Math.abs(diff) < threshold) {
            trendElement.classList.add('stable');
            trendElement.innerHTML = '<i class="fas fa-minus"></i>';
        } else if (diff > 0) {
            trendElement.classList.add('up');
            trendElement.innerHTML = '<i class="fas fa-arrow-up"></i>';
        } else {
            trendElement.classList.add('down');
            trendElement.innerHTML = '<i class="fas fa-arrow-down"></i>';
        }
    }
    
    updateWaterTankFromNodeRed(data) {
        if (data.level !== undefined) {
            this.waterTank.currentLevel = data.level;
        }
        if (data.temperature !== undefined) {
            this.waterTank.temperature = data.temperature;
        }
        if (data.capacity !== undefined) {
            this.waterTank.capacity = data.capacity;
        }
        this.waterTank.lastUpdate = new Date();
        this.updateWaterTank();
        this.saveToLocalStorage();
    }
    
    updateWaterLevelFromNodeRed(data) {
        if (data.value !== undefined) {
            this.waterTank.currentLevel = data.value;
            this.waterTank.lastUpdate = new Date();
            this.updateWaterTank();
            this.saveToLocalStorage();
        }
    }
    
    updateWaterTemperatureFromNodeRed(data) {
        if (data.value !== undefined) {
            this.waterTank.temperature = data.value;
            this.waterTank.lastUpdate = new Date();
            this.updateWaterTank();
            this.saveToLocalStorage();
        }
    }
    
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('nodeRedStatus');
        const iconElement = document.getElementById('statusIcon');
        const textElement = document.getElementById('statusText');
        
        statusElement.className = `connection-status ${status}`;
        
        switch (status) {
            case 'connected':
                iconElement.className = 'fas fa-circle';
                textElement.textContent = 'Verbunden';
                break;
            case 'connecting':
                iconElement.className = 'fas fa-circle fa-pulse';
                textElement.textContent = 'Verbinden...';
                break;
            case 'disconnected':
                iconElement.className = 'fas fa-circle';
                textElement.textContent = 'Getrennt';
                break;
        }
    }
    
    initSensors() {
        // Sensoren mit initialen Werten starten
        Object.keys(this.sensors).forEach(sensorType => {
            this.updateSensorUI(sensorType);
            this.updateSensorTrend(sensorType, 0, this.sensors[sensorType].value);
        });
    }
    
    startSensorSimulation() {
        // Simuliert Sensor-Werte für Demo
        setInterval(() => {
            // Temperatur
            const tempChange = (Math.random() - 0.5) * 2;
            const newTemp = Math.max(15, Math.min(35, this.sensors.temperature.value + tempChange));
            this.updateSensor('temperature', newTemp);
            
            // Luftfeuchtigkeit
            const humidityChange = (Math.random() - 0.5) * 5;
            const newHumidity = Math.max(30, Math.min(90, this.sensors.humidity.value + humidityChange));
            this.updateSensor('humidity', newHumidity);

            const soilMoistureChange = (Math.random() - 0.5) * 4;
            const newSoilMoisture = Math.max(10, Math.min(90, this.sensors.soilMoisture.value + soilMoistureChange));
            this.updateSensor('soilMoisture', newSoilMoisture);
        }, 8000); // Alle 8 Sekunden
    }

    async refreshLogsView() {
        const container = document.getElementById('logsContainer');
        if (!container) return;

        const levelFilterEl = document.getElementById('logLevelFilter');
        const level = levelFilterEl ? levelFilterEl.value : '';

        container.innerHTML = '';

        if (this.serverConfig.enabled) {
            const logs = await this.fetchLogsFromServer(level);
            if (logs) {
                this.renderLogs(logs);
                return;
            }
        }

        const local = this.getFilteredLocalLogs(level);
        this.renderLogs(local);
    }

    getFilteredLocalLogs(level) {
        if (!level) return [...this.localLogs].reverse();
        return [...this.localLogs].filter(l => l.level === level).reverse();
    }

    async fetchLogsFromServer(level) {
        try {
            const url = new URL(`${this.serverConfig.url}/api/logs`);
            url.searchParams.set('limit', '200');
            if (level) url.searchParams.set('level', level);

            const response = await fetch(url.toString());
            if (!response.ok) return null;
            const rows = await response.json();

            return rows.map(r => ({
                timestamp: r.timestamp,
                level: r.level,
                message: r.message,
                data: r.data ? JSON.parse(r.data) : null
            }));
        } catch {
            return null;
        }
    }

    renderLogs(logs) {
        const container = document.getElementById('logsContainer');
        if (!container) return;

        if (!logs || logs.length === 0) {
            container.innerHTML = '<div class="log-empty">Keine Logs vorhanden</div>';
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'logs-list';

        logs.slice(0, 200).forEach(log => {
            const item = document.createElement('div');
            item.className = `log-item log-${(log.level || 'INFO').toLowerCase()}`;

            const time = document.createElement('div');
            time.className = 'log-time';
            time.textContent = log.timestamp ? new Date(log.timestamp).toLocaleString('de-DE') : '';

            const level = document.createElement('div');
            level.className = 'log-level';
            level.textContent = log.level || '';

            const msg = document.createElement('div');
            msg.className = 'log-message';
            msg.textContent = log.message || '';

            item.appendChild(time);
            item.appendChild(level);
            item.appendChild(msg);

            if (log.data) {
                const data = document.createElement('pre');
                data.className = 'log-data';
                data.textContent = JSON.stringify(log.data, null, 2);
                item.appendChild(data);
            }

            wrapper.appendChild(item);
        });

        container.appendChild(wrapper);
    }
    
    reconnectNodeRed() {
        if (this.nodeRedSocket) {
            this.nodeRedSocket.close();
        }
        this.initNodeRedConnection();
    }
    
    exportSensorData() {
        const data = {
            timestamp: new Date().toISOString(),
            sensors: this.sensors,
            waterTank: this.waterTank
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sensor-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Sensor-Daten exportiert', 'success');
    }
    
    // Wassertank-Einstellungen
    updateTankSettings() {
        const capacity = parseFloat(document.getElementById('tankCapacity').value);
        const current = parseFloat(document.getElementById('tankCurrent').value);
        
        if (capacity > 0 && current >= 0) {
            this.waterTank.capacity = capacity;
            this.waterTank.currentLevel = Math.min(current, capacity);
            this.waterTank.lastUpdate = new Date();
            
            this.updateWaterTank();
            this.saveToLocalStorage();
            this.showToast('Wassertank-Einstellungen aktualisiert', 'success');
        } else {
            this.showToast('Bitte gültige Werte eingeben', 'error');
        }
    }
    
    // Manuelle NodeRED-Verbindung
    connectNodeRedManually() {
        if (!this.nodeRed.enabled) {
            this.showToast('NodeRED ist deaktiviert', 'error');
            return;
        }
        
        this.initNodeRedConnection();
    }

    connectNodeRed() {
        this.initNodeRedConnection();
    }
    
    disconnectNodeRedManually() {
        if (this.nodeRedSocket) {
            this.nodeRedSocket.close();
            this.nodeRedSocket = null;
        }
        this.updateConnectionStatus('disconnected');
        this.showToast('NodeRED getrennt', 'info');
    }
    
    // UI-Updates für Editor-Modus
    updateEditorUI() {
        const nodeRedUrl = document.getElementById('nodeRedUrl');
        const nodeRedEnabled = document.getElementById('nodeRedEnabled');
        const tankCapacity = document.getElementById('tankCapacity');
        const tankCurrent = document.getElementById('tankCurrent');
        const zoneName = document.getElementById('zoneName');
        const zoneSelector = document.getElementById('zoneSelector');
        const bedWidth = document.getElementById('bedWidth');
        const bedHeight = document.getElementById('bedHeight');
        const bedWidthValue = document.getElementById('bedWidthValue');
        const bedHeightValue = document.getElementById('bedHeightValue');
        const bedColor = document.getElementById('bedColor');
        
        if (nodeRedUrl) nodeRedUrl.value = this.nodeRed.websocketUrl;
        if (nodeRedEnabled) nodeRedEnabled.checked = this.nodeRed.enabled;
        if (tankCapacity) tankCapacity.value = this.waterTank.capacity;
        if (tankCurrent) tankCurrent.value = this.waterTank.currentLevel;
        
        // Beet-Eigenschaften
        if (this.selectedBed) {
            if (zoneName) zoneName.value = this.selectedBed.name || '';
            if (bedWidth) {
                bedWidth.value = this.selectedBed.width || 30;
                if (bedWidthValue) bedWidthValue.textContent = bedWidth.value;
            }
            if (bedHeight) {
                bedHeight.value = this.selectedBed.height || 20;
                if (bedHeightValue) bedHeightValue.textContent = bedHeight.value;
            }
            if (bedColor) bedColor.value = this.selectedBed.color || '#8B4513';
            
            // Aktiven Color-Preset markieren
            document.querySelectorAll('.color-preset').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.color === this.selectedBed.color);
            });
        } else {
            if (zoneName) zoneName.value = '';
            if (bedWidth) { bedWidth.value = 30; if (bedWidthValue) bedWidthValue.textContent = '30'; }
            if (bedHeight) { bedHeight.value = 20; if (bedHeightValue) bedHeightValue.textContent = '20'; }
            if (bedColor) bedColor.value = '#8B4513';
            document.querySelectorAll('.color-preset').forEach(btn => btn.classList.remove('active'));
        }
        
        // Hochbeet Dropdown aktualisieren
        if (zoneSelector) {
            zoneSelector.innerHTML = '<option value="">-- Hochbeet wählen --</option>';
            this.beds.forEach(bed => {
                const option = document.createElement('option');
                option.value = bed.id;
                option.textContent = bed.name;
                option.selected = this.selectedBed && this.selectedBed.id === bed.id;
                zoneSelector.appendChild(option);
            });
        }
    }
    
    // Dark Mode Funktionen
    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        this.applyDarkMode();
        this.saveToLocalStorage();
    }
    
    applyDarkMode() {
        const body = document.body;
        const checkbox = document.getElementById('darkModeCheckbox');
        
        if (this.darkMode) {
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
        }
        
        // Checkbox-State synchronisieren
        if (checkbox) {
            checkbox.checked = this.darkMode;
        }
    }
    
    // ========== INLINE BED INFO PANEL ==========
    
    updateInlineBedInfo() {
        const noInlinePlantSelected = document.getElementById('noInlinePlantSelected');
        const inlineContent = document.getElementById('inlineContent');
        
        if (!this.selectedBed) {
            if (noInlinePlantSelected) noInlinePlantSelected.style.display = 'block';
            if (inlineContent) inlineContent.classList.add('hidden');
            
            // Header zurücksetzen
            const nameEl = document.getElementById('inlinePlantName');
            if (nameEl) nameEl.innerHTML = '<i class="fas fa-seedling"></i> Kein Hochbeet ausgewählt';
            
            return;
        }
        
        if (noInlinePlantSelected) noInlinePlantSelected.style.display = 'none';
        if (inlineContent) inlineContent.classList.remove('hidden');
        
        // Beet-Info anzeigen
        const nameEl = document.getElementById('inlinePlantName');
        const posEl = document.getElementById('inlinePlantPosition');
        const dateEl = document.getElementById('inlinePlantDate');
        
        if (nameEl) nameEl.innerHTML = `<i class="fas fa-seedling"></i> ${this.selectedBed.name}`;
        if (posEl) posEl.textContent = this.selectedBed.plants.length;
        if (dateEl) dateEl.textContent = this.selectedBed.todos.filter(t => !t.done).length;
        
        // Pflanzenliste rendern
        this.renderBedPlantsList();
        
        // Todos rendern
        this.renderBedTodosList();
        
        // Düngerstatus rendern
        this.renderBedFertilizerStats();
    }
    
    renderBedFertilizerStats() {
        if (!this.selectedBed) return;
        
        const fert = this.selectedBed.fertilizer || { nitrogen: 0, phosphorus: 0, potassium: 0 };
        const maxN = 200, maxP = 150, maxK = 250;
        
        const fertN = document.getElementById('fertN');
        const fertP = document.getElementById('fertP');
        const fertK = document.getElementById('fertK');
        const fertNValue = document.getElementById('fertNValue');
        const fertPValue = document.getElementById('fertPValue');
        const fertKValue = document.getElementById('fertKValue');
        
        if (fertN) fertN.style.width = `${Math.min(100, (fert.nitrogen / maxN) * 100)}%`;
        if (fertP) fertP.style.width = `${Math.min(100, (fert.phosphorus / maxP) * 100)}%`;
        if (fertK) fertK.style.width = `${Math.min(100, (fert.potassium / maxK) * 100)}%`;
        
        if (fertNValue) fertNValue.textContent = `${fert.nitrogen.toFixed(1)} kg/ha`;
        if (fertPValue) fertPValue.textContent = `${fert.phosphorus.toFixed(1)} kg/ha`;
        if (fertKValue) fertKValue.textContent = `${fert.potassium.toFixed(1)} kg/ha`;
    }
    
    renderBedPlantsList() {
        const list = document.getElementById('inlineBedPlantsList');
        if (!list || !this.selectedBed) return;
        
        list.innerHTML = '';
        
        if (this.selectedBed.plants.length === 0) {
            list.innerHTML = '<li class="empty-state">Keine Pflanzen vorhanden. Shift+Klick auf das Beet um eine Pflanze zu platzieren.</li>';
            return;
        }
        
        // Nach Nummer sortieren
        const sortedPlants = [...this.selectedBed.plants].sort((a, b) => (a.number || 0) - (b.number || 0));
        
        sortedPlants.forEach(plant => {
            const li = document.createElement('li');
            li.className = 'plant-list-item';
            
            const icon = this.plantIcons[plant.name.toLowerCase()] || '🌱';
            const dateStr = plant.date ? new Date(plant.date).toLocaleDateString('de-DE') : '';
            const number = plant.number || this.selectedBed.plants.indexOf(plant) + 1;
            
            li.innerHTML = `
                <span class="plant-number">#${number}</span>
                <span class="plant-icon">${icon}</span>
                <span class="plant-name">${plant.name}</span>
                <span class="plant-date">${dateStr}</span>
                <button class="btn-delete-plant" data-plant-id="${plant.id}" title="Entfernen">×</button>
            `;
            
            li.querySelector('.btn-delete-plant').addEventListener('click', () => {
                this.deletePlantFromBed(plant.id);
                this.render();
            });
            
            list.appendChild(li);
        });
    }
    
    renderBedTodosList() {
        const list = document.getElementById('inlineBedTodosList');
        if (!list || !this.selectedBed) return;
        
        list.innerHTML = '';
        
        if (this.selectedBed.todos.length === 0) {
            list.innerHTML = '<li class="empty-state">Keine Todos vorhanden</li>';
            return;
        }
        
        // Sortieren: erst nach done (false zuerst), dann nach Priorität, dann nach Datum
        const prioOrder = { high: 0, medium: 1, low: 2 };
        const sortedTodos = [...this.selectedBed.todos].sort((a, b) => {
            if (a.done !== b.done) return a.done ? 1 : -1;
            if (prioOrder[a.priority] !== prioOrder[b.priority]) {
                return prioOrder[a.priority] - prioOrder[b.priority];
            }
            if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
            return 0;
        });
        
        sortedTodos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-list-item priority-${todo.priority}${todo.done ? ' done' : ''}`;
            
            const dateStr = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString('de-DE') : '';
            const prioLabel = { high: '🔴', medium: '🟡', low: '🟢' }[todo.priority] || '';
            
            li.innerHTML = `
                <input type="checkbox" class="todo-checkbox" ${todo.done ? 'checked' : ''}>
                <span class="todo-prio">${prioLabel}</span>
                <span class="todo-text">${todo.text}</span>
                <span class="todo-date">${dateStr}</span>
                <button class="btn-delete-todo" data-todo-id="${todo.id}" title="Entfernen">×</button>
            `;
            
            li.querySelector('.todo-checkbox').addEventListener('change', () => {
                this.toggleTodo(todo.id);
            });
            
            li.querySelector('.btn-delete-todo').addEventListener('click', () => {
                this.deleteTodo(todo.id);
            });
            
            list.appendChild(li);
        });
    }
    
    // Legacy-Methoden für Kompatibilität (werden nicht mehr benötigt)
    getPlantDisplayName(plant) {
        if (!plant) return 'Unbekannt';
        return plant.name || 'Unbekannt';
    }
    
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `inline-${tabName}-tab`);
        });
    }
    
    // Legacy-Methoden (nicht mehr verwendet im Hochbeet-Modell)
    addInlineHarvestEvent() { /* Legacy */ }
    renderInlineHarvestEvents() { /* Legacy */ }
    completeInlineHarvestEvent(eventId) { /* Legacy */ }
    deleteInlineHarvestEvent(eventId) { /* Legacy */ }
    loadPlantData() { /* Legacy */ }
    saveNotes() { /* Legacy */ }
    renderNotes() { /* Legacy */ }
    addHarvestEvent() { /* Legacy */ }
    renderHarvestEvents() { /* Legacy */ }
    completeHarvestEvent(eventId) { /* Legacy */ }
    deleteHarvestEvent(eventId) { /* Legacy */ }
}

// Initialisierung beim Laden der Seite
let system;
document.addEventListener('DOMContentLoaded', () => {
    system = new FertilizerControlSystem();
});
