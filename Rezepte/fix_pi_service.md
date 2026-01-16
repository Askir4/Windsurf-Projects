# 🔧 Raspberry Pi Service Fix

## 🚨 Problem: systemd Service USER Error (Status 217)

Der Fehler `status=217/USER` bedeutet, dass der systemd Service versucht, als nicht existierenden User zu laufen.

---

## 🛠️ Lösung 1: Service korrigieren

### 1. Aktuellen Service stoppen und deaktivieren
```bash
sudo systemctl stop recipe-website.service
sudo systemctl disable recipe-website.service
sudo rm /etc/systemd/system/recipe-website.service
sudo systemctl daemon-reload
```

### 2. Neuen Service mit korrektem User erstellen
```bash
sudo nano /etc/systemd/system/recipe-app.service
```

**Inhalt einfügen:**
```ini
[Unit]
Description=Recipe App
After=network.target

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=/home/pi/Rezepte
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

# Logs
StandardOutput=journal
StandardError=journal
SyslogIdentifier=recipe-app

[Install]
WantedBy=multi-user.target
```

### 3. Service aktivieren und starten
```bash
sudo systemctl daemon-reload
sudo systemctl enable recipe-app.service
sudo systemctl start recipe-app.service
```

---

## 🛠️ Lösung 2: PM2 Methode (empfohlen)

### 1. PM2 Service erstellen
```bash
# PM2 systemd setup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u pi --hp /home/pi

# Apps mit PM2 starten
cd /home/pi/Rezepte
pm2 start server.js --name "recipe-backend"
pm2 start "cd client && npm start" --name "recipe-frontend"

# PM2 Konfiguration speichern
pm2 save
```

### 2. PM2 Service aktivieren
```bash
sudo systemctl enable pm2-pi.service
sudo systemctl start pm2-pi.service
```

---

## 🔍 Überprüfen

### Service Status prüfen:
```bash
# Methode 1: systemd
sudo systemctl status recipe-app.service

# Methode 2: PM2
pm2 status
pm2 logs
```

### Logs ansehen:
```bash
# systemd Logs
sudo journalctl -u recipe-app.service -f

# PM2 Logs
pm2 logs recipe-backend
pm2 logs recipe-frontend
```

---

## 🐛 Fehlerbehebung

### 1. User überprüfen
```bash
# Aktuellen User prüfen
whoami
id pi

# User in Service anpassen falls nötig
sudo nano /etc/systemd/system/recipe-app.service
# User=pi und Group=pi prüfen
```

### 2. Dateiberechtigungen
```bash
# Projekt-Owner prüfen
ls -la /home/pi/Rezepte

# Falls nötig, Owner korrigieren
sudo chown -R pi:pi /home/pi/Rezepte
```

### 3. Node.js Pfad prüfen
```bash
# Node.js Pfad
which node
# Sollte: /usr/bin/node

# Falls anderer Pfad, im Service anpassen
sudo nano /etc/systemd/system/recipe-app.service
# ExecStart=/pfad/zu/node server.js
```

---

## 🚀 Testen

### 1. Manueller Test
```bash
# Als pi User
cd /home/pi/Rezepte
node server.js
# Strg+C zum Beenden
```

### 2. Service Test
```bash
sudo systemctl restart recipe-app.service
sudo systemctl status recipe-app.service
```

### 3. App erreichbar?
```bash
# Lokal
curl http://localhost:3001/api/recipes

# Von anderem Gerät
curl http://<PI-IP>:3001/api/recipes
```

---

## 📱 Frontend separat starten (falls nötig)

```bash
# PM2 für Frontend
cd /home/pi/Rezepte/client
pm2 start npm --name "recipe-frontend" -- start

# Oder systemd Service für Frontend
sudo nano /etc/systemd/system/recipe-frontend.service
```

**Frontend Service Inhalt:**
```ini
[Unit]
Description=Recipe Frontend
After=network.target recipe-app.service

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=/home/pi/Rezepte/client
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

---

## ✅ Erfolgreich wenn:

- `sudo systemctl status recipe-app.service` zeigt `active (running)`
- App ist unter `http://<PI-IP>:3001` erreichbar
- Logs zeigen keine USER-Fehler mehr
