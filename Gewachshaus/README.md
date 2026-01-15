# 🌾 Steuerbare Düngeanlage - Präzisionslandwirtschaft

Eine moderne Webanwendung zur Verwaltung von landwirtschaftlichen Flächen mit integrierter Sensor-Überwachung und NodeRED-Anbindung.

## 🚀 Features

### 🗺️ **Interaktive Kartenverwaltung**
- **Zonen-Editor**: Erstellen und bearbeiten Sie Anbauzonen
- **Slot-System**: Automatische Generierung von Pflanzplätzen
- **Drag & Drop**: Intuitive Positionierung von Zonen
- **Grid-Layout**: Automatische Anordnung nebeneinander

### 🌱 **Pflanzenmanagement**
- **Pflanzenauswahl**: Weizen, Gerste, Mais, Kartoffeln, Rüben, Sonnenblumen
- **Düngung**: Präzise Steuerung von Stickstoff, Phosphor, Kalium
- **Pflanzendetails**: Notizen und Pflückplan pro Pflanze
- **Visualisierung**: Pflanzennamen direkt auf der Karte

### 📊 **Sensor-Integration**
- **Temperatur**: Live-Messung mit Trend-Anzeige
- **Luftfeuchtigkeit**: Echtzeit-Überwachung
- **Wassertank**: Füllstand und Temperatur
- **NodeRED**: WebSocket-Verbindung für externe Sensoren

### 🎛️ **Editor-Funktionen**
- **Zonen-Steuerung**: Erstellen, bearbeiten, löschen
- **Slot-Generierung**: Automatische Erstellung von Pflanzplätzen
- **Dropdown-Auswahl**: Einfache Zonenauswahl
- **Wassertank-Konfiguration**: Kapazität und Füllstand anpassen

### 🌙 **Dark Mode**
- **Umschaltbar**: Helles und dunkles Design
- **Persistent**: Einstellung wird gespeichert
- **Vollständig**: Alle UI-Elemente angepasst

## 🛠️ Installation

### **Voraussetzungen**
- Moderner Webbrowser (Chrome, Firefox, Safari, Edge)
- Lokaler Webserver (optional)

### **Starten**

**Mit Python 3:**
```bash
python -m http.server 8000
```

**Mit Node.js:**
```bash
npx http-server -p 8000
```

**Mit PHP:**
```bash
php -S localhost:8000
```

Öffnen Sie dann `http://localhost:8000` im Browser.

## 📖 Bedienung

### **Ansichtsmodi**
- **👁️ View Mode**: Pflanzen ansehen und verwalten
- **✏️ Edit Mode**: Zonen erstellen und bearbeiten

### **Zonen verwalten**
1. **Edit Mode** aktivieren
2. **"Zone hinzufügen"** klicken → Zone erscheint neben der letzten
3. **Zone auswählen** über Dropdown oder Klick
4. **Eigenschaften bearbeiten**: Name, Reihen, Spalten
5. **"Slots generieren"** für Pflanzplätze

### **Pflanzen hinzufügen**
1. **Slot auswählen** auf der Karte
2. **Pflanze wählen** aus Dropdown
3. **Benutzerdefinierter Name** (optional)
4. **"Pflanze hinzufügen"** klicken

### **Düngung steuern**
1. **Pflanze auswählen**
2. **NPK-Werte** anpassen (Stickstoff, Phosphor, Kalium)
3. **"Dünger anwenden"** klicken

### **Notizen & Pflückplan**
1. **Pflanze auswählen**
2. **Notizen** eingeben und speichern
3. **Pflücktermine** mit Datum und Aktion hinzufügen
4. **Termine** als erledigt markieren

### **Sensor-Daten**
- **Live-Anzeige**: Temperatur und Luftfeuchtigkeit
- **NodeRED**: Externe Sensoren anschließen
- **Export**: Daten als JSON herunterladen
- **Wassertank**: Füllstand überwachen

## 🔌 NodeRED Integration

### **WebSocket-Verbindung**
```
URL: ws://localhost:1880/ws
```

### **Unterstützte Topics**
- `sensors/temperature` - Temperatursensor
- `sensors/humidity` - Luftfeuchtigkeitssensor
- `sensors/water_tank` - Wassertank-Daten
- `sensors/water_level` - Füllstand
- `sensors/water_temperature` - Wassertemperatur

### **Datenformate**

**Temperatur/Luftfeuchtigkeit:**
```json
{
  "value": 22.5,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Wassertank:**
```json
{
  "level": 750,
  "temperature": 18.5,
  "capacity": 1000
}
```

## 🎨 Technologie

### **Frontend**
- **HTML5**: Semantische Struktur
- **CSS3**: Responsive Design mit Flexbox/Grid
- **JavaScript ES6+**: Moderne Webentwicklung
- **SVG**: Interaktive Karten-Grafik

### **Features**
- **LocalStorage**: Datenspeicherung im Browser
- **WebSocket**: Echtzeit-Kommunikation
- **Responsive Design**: Mobile-freundlich
- **Dark Mode**: Automatische Anpassung

### **Architektur**
- **Objektorientiert**: Klassenbasierte Struktur
- **Event-Driven**: Reaktive Benutzeroberfläche
- **Modular**: Getrennte Funktionsbereiche
- **Scalable**: Erweiterbares Design

## 📱 Responsive Design

### **Desktop**
- Volle Funktionalität
- Drag & Drop Unterstützung
- Mehrere Spalten Layout

### **Tablet**
- Angepasste Touch-Steuerung
- Kompakte Editor-Tools
- Optimierter Karten-Bereich

### **Mobile**
- Vereinfachte Navigation
- Touch-optimierte Buttons
- Vertikales Layout

## 🔧 Konfiguration

### **Wassertank**
- **Kapazität**: 100-10.000 Liter
- **Füllstand**: Manuell einstellbar
- **Temperatur**: Automatische Überwachung

### **Zonen-Einstellungen**
- **Reihen**: 1-20
- **Spalten**: 1-20
- **Position**: Automatisch oder manuell

### **NodeRED**
- **URL**: Anpassbar
- **Aktiv/Deaktivierbar**: Flexible Nutzung
- **Auto-Reconnect**: Automatische Wiederverbindung

## 💾 Datenspeicherung

### **LocalStorage**
Alle Daten werden lokal im Browser gespeichert:
- Zonen und Slots
- Pflanzen und Düngewerte
- Notizen und Pflücktermine
- Sensor-Daten
- Benutzereinstellungen

### **Export-Funktion**
- **Sensor-Daten**: JSON-Export
- **Pflanzendaten**: Zukünftig geplant
- **Konfiguration**: Backup/Restore

## 🚀 Zukunftsvision

### **Geplante Features**
- [ ] **Multi-User**: Gemeinsame Nutzung
- [ ] **Cloud-Sync**: Online-Speicherung
- [ ] **Mobile App**: Native Anwendung
- [ ] **API-Schnittstelle**: Externe Anbindung
- [ ] **Analytics**: Auswertungen und Statistiken
- [ ] **Automatisierung**: Zeitgesteuerte Aktionen

### **Erweiterungen**
- **Weitere Sensoren**: Bodenfeuchtigkeit, pH-Wert
- **Maschinen-Integration**: Traktoren, Drohnen
- **Wetter-API**: Wetterdaten integration
- **KI-Unterstützung**: Optimierungsvorschläge

## 🤝 Beitrag

### **Bug Reports**
Bitte melden Sie Fehler über GitHub Issues mit:
- Beschreibung des Problems
- Schritte zur Reproduktion
- Browser-Version
- Screenshots (falls möglich)

### **Feature Requests**
Ideas und Vorschläge sind willkommen!
- Nutzen Sie GitHub Discussions
- Beschreiben Sie den Anwendungsfall
- Priorität und Nutzen angeben

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz - siehe [LICENSE](LICENSE) für Details.

## 👥 Team

- **Entwickler**: Lernfeld 7 Projektteam
- **Betreuer**: [Name einfügen]
- **Institution**: [Schule/Unternehmen]

## 📞 Kontakt

- **Email**: [email@example.com]
- **GitHub**: [github.com/user/repo]
- **Discord**: [Server-Link]

---

**🌾 Präzisionslandwirtschaft für die Zukunft!**

*Stand: Januar 2024*
- **Visualisierung**: Farbcodierte Darstellung verschiedener Pflanzenarten

### 🎯 Präzisionsdüngung
- **Einzelsteuerung**: Jede Pflanze kann individuell gedüngt werden
- **Nährstoffangaben**: Stickstoff (N), Phosphor (P), Kalium (K) in kg/ha
- **Echtzeit-Updates**: Änderungen werden sofort gespeichert und visualisiert
- **Statistik**: Übersicht über Gesamtmengen aller Nährstoffe

### 🗺️ Interaktive Karte
- **Grid-System**: 100x100 Einheiten für präzise Positionierung
- **Zoom-Funktion**: Herein- und Herauszoomen für bessere Übersicht
- **Klick-Positionierung**: Klicken Sie auf die Karte um Koordinaten zu setzen
- **Responsive**: Optimiert für verschiedene Bildschirmgrößen

### 💾 Datenspeicherung
- **Local Storage**: Alle Daten werden im Browser gespeichert
- **Automatisch**: Änderungen werden sofort gespeichert
- **Persistent**: Daten bleiben auch nach Browser-Neustart erhalten

## Bedienung

### Pflanze hinzufügen
1. Wählen Sie die Pflanzenart aus dem Dropdown-Menü
2. Geben Sie X- und Y-Koordinaten ein (0-100) oder klicken Sie auf die Karte
3. Klicken Sie auf "Pflanze hinzufügen"

### Pflanze düngen
1. Klicken Sie auf eine Pflanze in der Karte zur Auswahl
2. Geben Sie die gewünschten Düngermengen ein
3. Klicken Sie auf "Dünger anwenden"

### Kartensteuerung
- **🔍+**: Hereinzoomen
- **🔍-**: Herauszoomen
- **🔄**: Ansicht zurücksetzen
- **🗑️**: Alle Pflanzen löschen

## Pflanzenarten

| Pflanze | Farbe | Icon |
|---------|-------|------|
| Weizen | Grün | 🌾 |
| Gerste | Gelb | 🌾 |
| Mais | Orange | 🌽 |
| Kartoffeln | Braun | 🥔 |
| Rüben | Lila | 🥕 |
| Sonnenblumen | Gold | 🌻 |

## Technologie

- **HTML5**: Semantische Struktur
- **CSS3**: Modernes Design mit Grid und Flexbox
- **JavaScript (ES6+):** Interaktive Funktionalität
- **SVG**: Vektorbasierte Kartenvisualisierung
- **Font Awesome**: Icons
- **Local Storage**: Datenspeicherung

## Dateistruktur

```
├── index.html          # Hauptseite
├── styles.css          # Styling
├── script.js           # JavaScript-Funktionalität
├── README.md           # Dokumentation
└── docs/               # Zusätzliche Dokumentation
    └── grundlagen.md   # Düngungsgrundlagen
```

## Erweiterungsmöglichkeiten

### 🔌 Hardware-Anbindung
- API-Endpunkte für Düngeanlage
- Echtzeit-Status von Sensoren
- Automatische Düngung basierend auf Bodenwerten

### 📊 Erweiterte Analyse
- Düngehistorie und Trends
- Kostenberechnung
- Ertragsschätzungen
- Umweltimpact-Analyse

### 🌐 Multi-User
- Benutzerkonten
- Teilen von Feldplänen
- Kollaborative Planung

### 📱 Mobile App
- PWA-Unterstützung
- Offline-Funktionalität
- GPS-Integration für Felderkundung

## Installation

1. Alle Dateien in einem Web-Verzeichnis ablegen
2. `index.html` im Browser öffnen
3. Fertig! Keine Installation erforderlich.

## Browser-Kompatibilität

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Lizenz

Dieses Projekt wurde für Lernfeld 7 entwickelt und dient educativen Zwecken.
