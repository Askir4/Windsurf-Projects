# 🍳 Rezept-App auf Raspberry Pi 4 Setup Guide

## 📋 Voraussetzungen
- Raspberry Pi 4 (4GB RAM empfohlen)
- Raspbian OS (oder Raspberry Pi OS)
- Internetverbindung
- SSH-Zugang (oder direkt am Pi)

---

## 🚀 Schritt 1: Projekt auf den Pi kopieren

### Methode A: Git (empfohlen)
```bash
# Auf dem Pi ausführen
cd /home/pi
git clone <dein-repo-url> Rezepte
cd Rezepte
```

### Methode B: SCP/WinSCP
```bash
# Von deinem PC zum Pi kopieren
scp -r /path/to/Rezepte pi@<pi-ip>:/home/pi/
```

---

## 🔧 Schritt 2: Node.js installieren

```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Node.js 18.x installieren
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Überprüfen
node --version
npm --version
```

---

## 📦 Schritt 3: Abhängigkeiten installieren

```bash
cd /home/pi/Rezepte

# Backend-Dependencies installieren
npm install express sqlite3 cors multer axios cheerio

# Client-Dependencies installieren
cd client
npm install
cd ..
```

---

## 🗄️ Schritt 4: Datenbank einrichten

```bash
# Datenbank wird automatisch erstellt
# Überprüfen:
ls -la recipes.db
```

Falls nicht vorhanden:
```bash
sqlite3 recipes.db < database.sql
```

---

## 🚀 Schritt 5: App starten

### Methode A: Manuell starten
```bash
# Backend starten
cd /home/pi/Rezepte
node server.js

# In neuem Terminal (oder mit & im Hintergrund)
cd /home/pi/Rezepte/client
npm start
```

### Methode B: Automatisiert mit PM2
```bash
# PM2 installieren
sudo npm install -g pm2

# PM2 Konfigurationsdatei erstellen
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'recipe-backend',
      script: 'server.js',
      cwd: '/home/pi/Rezepte',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'recipe-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/home/pi/Rezepte/client',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# Apps starten
pm2 start ecosystem.config.js

# PM2 beim Systemstart laden
pm2 startup
pm2 save
```

---

## 🌐 Schritt 6: Firewall konfigurieren

```bash
# Ports freigeben (falls nötig)
sudo ufw allow 3001
sudo ufw allow 3000
sudo ufw reload
```

---

## 📱 Schritt 7: Zugriff auf die App

### Lokal am Pi:
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:3000`

### Von anderen Geräten:
- Pi-IP herausfinden:
```bash
hostname -I
```
- Im Browser aufrufen: `http://<PI-IP>:3000`

---

## 🔧 Schritt 8: Optimierungen für Pi

### 1. Swap-Datei vergrößern
```bash
# Swap-Datei auf 2GB vergrößern
sudo dphys-swapfile swapoff
sudo dphys-swapfile --size 2048
sudo dphys-swapfile swapon
```

### 2. GPU-Speicher reduzieren
```bash
# GPU auf 16MB setzen
sudo raspi-config
# → Advanced Options → Memory Split → 16
```

### 3. Autostart einrichten
```bash
# Service für PM2 erstellen
sudo nano /etc/systemd/system/recipe-app.service
```

Inhalt einfügen:
```ini
[Unit]
Description=Recipe App
After=network.target

[Service]
Type=forking
User=pi
WorkingDirectory=/home/pi/Rezepte
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecStop=/usr/bin/pm2 stop
ExecReload=/usr/bin/pm2 reload
Restart=always

[Install]
WantedBy=multi-user.target
```

Service aktivieren:
```bash
sudo systemctl enable recipe-app.service
sudo systemctl start recipe-app.service
```

---

## 📊 Schritt 9: Monitoring

### PM2 Status prüfen:
```bash
pm2 status
pm2 logs
pm2 monit
```

### System-Ressourcen prüfen:
```bash
# CPU & Speicher
htop

# Festplattenspeicher
df -h

# Prozessliste
ps aux | grep node
```

---

## 🔄 Schritt 10: Updates

### App aktualisieren:
```bash
cd /home/pi/Rezepte
git pull
npm install
cd client && npm install && cd ..
pm2 restart all
```

### Node.js aktualisieren:
```bash
# Neue Version installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 🐛 Fehlerbehebung

### Port bereits belegt:
```bash
# Prozess finden und beenden
sudo lsof -i :3001
sudo kill -9 <PID>
```

### Speicherprobleme:
```bash
# PM2 neustarten
pm2 restart all

# System neustarten
sudo reboot
```

### Datenbank-Probleme:
```bash
# Datenbank reparieren
sqlite3 recipes.db ".recover" | sqlite3 recipes_new.db
mv recipes_new.db recipes.db
```

---

## 📱 Mobile Zugriff

Die App ist mobile-freundlich und funktioniert auf:
- Smartphones (iOS/Android)
- Tablets
- Desktop-Browser

---

## 🎯 Fertig!

Deine Rezept-App läuft jetzt auf dem Raspberry Pi 4 und ist im lokalen Netzwerk erreichbar.

**Tipp:** Speichere diese Anleitung als `PI_SETUP.md` für zukünftige Referenzen.
