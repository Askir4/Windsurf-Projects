#!/bin/bash

# 🍳 Rezept-App Deployment Script für Raspberry Pi
# Usage: bash deploy_to_pi.sh <PI_IP> <SSH_USER>

set -e

# Parameter
PI_IP=${1:-"192.168.1.100"}
SSH_USER=${2:-"pi"}
PROJECT_DIR="/home/pi/Rezepte"

echo "🍳 Rezept-App Deployment auf Raspberry Pi"
echo "=========================================="
echo "IP: $PI_IP"
echo "User: $SSH_USER"
echo ""

# 1. Projekt kopieren
echo "📁 Kopiere Projekt zum Pi..."
scp -r . $SSH_USER@$PI_IP:$PROJECT_DIR
echo "✅ Projekt kopiert"

# 2. SSH-Befehle ausführen
echo "🔧 Installiere Abhängigkeiten und starte App..."
ssh $SSH_USER@$PI_IP << 'EOF'
cd /home/pi/Rezepte

# System aktualisieren
echo "🔄 System aktualisieren..."
sudo apt update && sudo apt upgrade -y

# Node.js installieren
echo "📦 Node.js installieren..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 installieren
sudo npm install -g pm2

# Abhängigkeiten installieren
echo "📦 Abhängigkeiten installieren..."
npm install
cd client && npm install && cd ..

# PM2 Konfiguration erstellen
echo "⚙️ PM2 Konfiguration erstellen..."
cat > ecosystem.config.js << 'PM2EOF'
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
PM2EOF

# Apps starten
echo "🚀 Apps starten..."
pm2 start ecosystem.config.js

# PM2 beim Systemstart laden
pm2 startup
pm2 save

echo "✅ Installation abgeschlossen!"
echo "📱 App erreichbar unter: http://$(hostname -I | cut -d' ' -f1):3000"
EOF

echo ""
echo "🎉 Deployment abgeschlossen!"
echo "📱 App erreichbar unter: http://$PI_IP:3000"
echo "🔧 PM2 Status: ssh $SSH_USER@$PI_IP 'pm2 status'"
