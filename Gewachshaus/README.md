# 🌱 Gewächshaus-Webapp

Eine moderne Webanwendung zur Verwaltung von Hochbeeten im Gewächshaus mit integrierter Sensor-Überwachung, Düngerkontrolle und optionaler NodeRED-Anbindung.

**Lernfeld 7 - Präzisionsdüngung mit Einzelsteuerung**

---

## 📋 Inhaltsverzeichnis

1. [Features](#-features)
2. [Schnellstart](#-schnellstart)
3. [Installation auf Raspberry Pi](#-installation-auf-raspberry-pi)
4. [Sensor-Integration](#-sensor-integration)
5. [API-Dokumentation](#-api-dokumentation)
6. [Bedienung](#-bedienung)
7. [Technologie-Stack](#-technologie-stack)
8. [Projektstruktur](#-projektstruktur)
9. [Lizenz](#-lizenz)

---

## 🚀 Features

### 🗺️ Interaktive Karte
- **Hochbeet-Editor**: Erstellen, bearbeiten und löschen von Hochbeeten
- **Drag & Drop**: Intuitive Positionierung auf der Karte
- **Zoom-Funktion**: Rein- und Rauszoomen mit Gras-Textur
- **3-Spalten-Layout**: Steuerung links, Karte mittig, Statistik rechts

### 🌱 Pflanzenmanagement
- **25+ Pflanzenarten**: Gemüse, Kräuter, Obst, Blumen
- **Icon-Picker**: Visuelle Auswahl mit Suchfunktion
- **Todo-Listen**: Aufgaben pro Hochbeet verwalten
- **Pflanzenliste**: Übersicht aller Pflanzen im Beet

### 🧪 Düngerkontrolle
- **NPK-Steuerung**: Stickstoff, Phosphor, Kalium in kg/ha
- **Mehrfachauswahl**: Mehrere Beete gleichzeitig düngen (Shift+Klick)
- **Statistik**: Gesamtübersicht aller Nährstoffe

### 📊 Sensor-Dashboard
- **Temperatur**: Live-Anzeige mit Trend und Graph
- **Luftfeuchtigkeit**: Echtzeit-Überwachung
- **Bodenfeuchtigkeit**: Feuchtigkeitsmessung
- **Wassertank**: Füllstand und Temperatur

### 🔌 Backend & Datenbank
- **Node.js Server**: Express.js mit REST-API
- **SQLite Datenbank**: Persistente Datenspeicherung
- **Rate Limiting**: Schutz vor DoS-Angriffen
- **Security Headers**: XSS, CORS, Frame-Protection

### 🌙 Dark Mode
- Automatische Speicherung der Einstellung
- Vollständig gestylte UI-Elemente

---

## ⚡ Schnellstart

### Voraussetzungen
- Node.js 14+ installiert
- Moderner Webbrowser

### Installation

```bash
# 1. Repository klonen oder Dateien kopieren
cd Gewachshaus

# 2. Dependencies installieren
npm install

# 3. Server starten
npm start

# 4. Browser öffnen
# http://localhost:3001
```

---

## 🍓 Installation auf Raspberry Pi

### Schritt 1: Raspberry Pi vorbereiten

```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Node.js installieren (empfohlen: Node 18 LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Überprüfen
node --version  # Sollte v18.x.x zeigen
npm --version   # Sollte 9.x.x zeigen
```

### Schritt 2: Projekt übertragen

**Option A: Mit Git**
```bash
cd ~
git clone https://github.com/IHR_USERNAME/Gewachshaus.git
cd Gewachshaus
```

**Option B: Mit SCP (von Windows)**
```powershell
# Auf dem Windows-PC ausführen:
scp -r C:\Pfad\zum\Gewachshaus pi@RASPBERRY_IP:~/Gewachshaus
```

**Option C: Mit USB-Stick**
```bash
# USB-Stick mounten
sudo mount /dev/sda1 /mnt
cp -r /mnt/Gewachshaus ~/
sudo umount /mnt
```

### Schritt 3: Dependencies installieren

```bash
cd ~/Gewachshaus
npm install
```

### Schritt 4: Server testen

```bash
# Manuell starten
node server.js

# Sollte ausgeben:
# 🌾 Düngeanlage Server läuft auf http://localhost:3001
```

### Schritt 5: Als Systemdienst einrichten (Autostart)

```bash
# Service-Datei erstellen
sudo nano /etc/systemd/system/gewachshaus.service
```

Inhalt der Service-Datei:
```ini
[Unit]
Description=Gewächshaus Webapp
After=network.target

[Service]
ExecStart=/usr/bin/node /home/pi/Gewachshaus/server.js
WorkingDirectory=/home/pi/Gewachshaus
StandardOutput=inherit
StandardError=inherit
Restart=always
User=pi
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```

```bash
# Service aktivieren und starten
sudo systemctl daemon-reload
sudo systemctl enable gewachshaus
sudo systemctl start gewachshaus

# Status prüfen
sudo systemctl status gewachshaus

# Logs ansehen
journalctl -u gewachshaus -f
```

### Schritt 6: Im Netzwerk erreichbar machen

```bash
# IP-Adresse des Raspberry Pi herausfinden
hostname -I

# Beispiel: 192.168.1.100
# Webapp erreichbar unter: http://192.168.1.100:3001
```

### Optional: Nginx als Reverse Proxy

```bash
# Nginx installieren
sudo apt install nginx -y

# Konfiguration erstellen
sudo nano /etc/nginx/sites-available/gewachshaus
```

```nginx
server {
    listen 80;
    server_name gewachshaus.local;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Aktivieren
sudo ln -s /etc/nginx/sites-available/gewachshaus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📡 Sensor-Integration

### Übersicht der Sensor-Endpunkte

Die Webapp empfängt Sensordaten über zwei Wege:

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| **HTTP POST** | `/api/sensors` | Direkte Datenübermittlung |
| **WebSocket** | `ws://localhost:1880/ws` | NodeRED Integration |

---

### Methode 1: HTTP POST (Empfohlen für Arduino/ESP)

#### API-Endpoint

```
POST http://RASPBERRY_IP:3001/api/sensors
Content-Type: application/json
```

#### Datenformat

```json
{
  "type": "temperature",
  "value": 22.5,
  "unit": "°C",
  "timestamp": "2026-01-16T12:00:00Z"
}
```

#### Unterstützte Sensor-Typen

| type | Beschreibung | Einheit | Dashboard |
|------|--------------|---------|-----------|
| `temperature` | Lufttemperatur | °C | Temperatur-Graph |
| `humidity` | Luftfeuchtigkeit | % | Humidity-Graph |
| `soilMoisture` | Bodenfeuchtigkeit | % | Soil-Graph |
| `waterLevel` | Wassertank-Füllstand | Liter | Wassertank-Anzeige |
| `waterTemperature` | Wassertemperatur | °C | Wassertank-Anzeige |

#### Arduino/ESP8266 Beispiel

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <DHT.h>

const char* ssid = "DEIN_WLAN";
const char* password = "DEIN_PASSWORT";
const char* serverUrl = "http://192.168.1.100:3001/api/sensors";

#define DHTPIN D4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi verbunden!");
  dht.begin();
}

void sendSensorData(const char* type, float value, const char* unit) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    
    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    String json = "{\"type\":\"" + String(type) + 
                  "\",\"value\":" + String(value) + 
                  ",\"unit\":\"" + String(unit) + "\"}";
    
    int httpCode = http.POST(json);
    
    if (httpCode > 0) {
      Serial.printf("Gesendet: %s = %.2f %s\n", type, value, unit);
    } else {
      Serial.printf("Fehler: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  }
}

void loop() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  
  if (!isnan(temp)) {
    sendSensorData("temperature", temp, "°C");
  }
  if (!isnan(hum)) {
    sendSensorData("humidity", hum, "%");
  }
  
  delay(30000); // Alle 30 Sekunden
}
```

#### Python Beispiel (für Raspberry Pi Sensoren)

```python
#!/usr/bin/env python3
import requests
import time
import Adafruit_DHT

SENSOR = Adafruit_DHT.DHT22
PIN = 4  # GPIO Pin
SERVER_URL = "http://localhost:3001/api/sensors"

def send_sensor_data(sensor_type, value, unit):
    try:
        response = requests.post(SERVER_URL, json={
            "type": sensor_type,
            "value": value,
            "unit": unit
        }, timeout=5)
        print(f"Gesendet: {sensor_type} = {value}{unit}")
    except Exception as e:
        print(f"Fehler: {e}")

while True:
    humidity, temperature = Adafruit_DHT.read_retry(SENSOR, PIN)
    
    if temperature is not None:
        send_sensor_data("temperature", round(temperature, 1), "°C")
    if humidity is not None:
        send_sensor_data("humidity", round(humidity, 1), "%")
    
    time.sleep(30)
```

---

### Methode 2: WebSocket (NodeRED)

#### NodeRED Flow einrichten

1. **NodeRED installieren** (auf dem Raspberry Pi):
```bash
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)
sudo systemctl enable nodered
sudo systemctl start nodered
```

2. **WebSocket-Output Node** konfigurieren:
   - Type: `Listen on`
   - Path: `/ws`
   - Name: `Gewächshaus WS`

3. **Datenformat für WebSocket**:
```json
{
  "topic": "sensors/temperature",
  "payload": {
    "value": 22.5,
    "timestamp": "2026-01-16T12:00:00Z"
  }
}
```

#### Topics

| Topic | Beschreibung |
|-------|--------------|
| `sensors/temperature` | Lufttemperatur |
| `sensors/humidity` | Luftfeuchtigkeit |
| `sensors/soil_moisture` | Bodenfeuchtigkeit |
| `sensors/water_level` | Wassertank-Füllstand |
| `sensors/water_temperature` | Wassertemperatur |

#### Beispiel NodeRED Flow (JSON Import)

```json
[
  {
    "id": "dht22_sensor",
    "type": "rpi-dht22",
    "name": "DHT22",
    "topic": "sensors/temperature",
    "dht": 22,
    "pin": "4",
    "wires": [["ws_out"]]
  },
  {
    "id": "ws_out",
    "type": "websocket out",
    "name": "Gewächshaus WS",
    "server": "ws_server",
    "wires": []
  },
  {
    "id": "ws_server",
    "type": "websocket-listener",
    "path": "/ws"
  }
]
```

---

### Dashboard-Zuordnung

Die Sensordaten werden automatisch den richtigen Dashboard-Elementen zugeordnet:

```
┌─────────────────────────────────────────────────────────┐
│                  SENSOR DASHBOARD                        │
├──────────────────┬──────────────────┬───────────────────┤
│  🌡️ Temperatur   │  💧 Humidity     │  🌱 Bodenfeucht.  │
│                  │                  │                   │
│  ┌────────────┐  │  ┌────────────┐  │  ┌────────────┐  │
│  │ Graph      │  │  │ Graph      │  │  │ Graph      │  │
│  │ (1h/6h/24h)│  │  │ (1h/6h/24h)│  │  │ (1h/6h/24h)│  │
│  └────────────┘  │  └────────────┘  │  └────────────┘  │
│  temperature     │  humidity        │  soilMoisture    │
├──────────────────┴──────────────────┴───────────────────┤
│                    💦 WASSERTANK                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Füllstand: ████████░░ 75%  |  Temp: 18.5°C    │   │
│  └─────────────────────────────────────────────────┘   │
│  waterLevel + waterTemperature                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 API-Dokumentation

### Basis-URL
```
http://localhost:3001/api
```

### Endpoints

#### GET /api/data
Alle gespeicherten Daten abrufen.

**Response:**
```json
{
  "zones": [...],
  "slots": [...],
  "plants": [...],
  "timestamp": "2026-01-16T12:00:00Z"
}
```

#### POST /api/data
Daten speichern (Hochbeete, Pflanzen).

#### POST /api/sensors
Sensordaten empfangen.

**Request Body:**
```json
{
  "type": "temperature",
  "value": 22.5,
  "unit": "°C"
}
```

#### GET /api/logs
Server-Logs abrufen.

**Query Parameter:**
- `level`: DEBUG, INFO, WARN, ERROR
- `limit`: Anzahl (max 1000)

#### POST /api/logs
Log-Eintrag erstellen.

---

## 📖 Bedienung

### Ansichtsmodus (View)
- Hochbeete auf der Karte ansehen
- Klick auf Beet: Details anzeigen
- Shift+Klick: Mehrere Beete auswählen

### Editor-Modus (Edit)
- Hochbeete erstellen/löschen
- Größe und Position anpassen
- Pflanzen hinzufügen

### Düngung
1. Hochbeet(e) auswählen
2. NPK-Werte eingeben
3. "Dünger anwenden" klicken

### Todos
1. Hochbeet auswählen
2. Tab "Todos" öffnen
3. Aufgabe mit Priorität hinzufügen

---

## 🛠️ Technologie-Stack

### Backend
- **Node.js** - JavaScript Runtime
- **Express.js** - Web Framework
- **SQLite3** - Datenbank
- **CORS** - Cross-Origin Requests

### Frontend
- **HTML5** - Struktur
- **CSS3** - Styling (Grid, Flexbox, Dark Mode)
- **JavaScript ES6+** - Logik
- **SVG** - Interaktive Karte
- **Font Awesome** - Icons

### Security
- Rate Limiting (100 Req/Min)
- Input Validation
- Security Headers
- Prepared Statements (SQL)

---

## 📁 Projektstruktur

```
Gewachshaus/
├── server.js           # Node.js Backend Server
├── index.html          # Hauptseite
├── styles.css          # Styling
├── script.js           # Frontend-Logik
├── package.json        # Node.js Dependencies
├── fertilizer.db       # SQLite Datenbank (wird erstellt)
├── README.md           # Diese Dokumentation
└── AUDIT_REPORT.md     # Security Audit Report
```

---

## 📄 Lizenz

MIT License - Dieses Projekt wurde für Lernfeld 7 entwickelt.

---

## 👥 Mitwirkende

- **Entwicklung**: Lernfeld 7 Projektteam
- **Audit**: Senior Engineer Review

---

*Stand: Januar 2026*
