# LAPS Portal - Passwort-Anfrage-System

Sichere Webanwendung zur Anfrage und Freigabe von lokalen Administrator-Passwörtern für Windows-Clients über Microsoft LAPS + Active Directory.

## Features

### User-Portal
- Passwort-Anfragen erstellen mit Pflicht-Begründung (min. 20 Zeichen)
- Hostname-Validierung gegen Active Directory
- Status-Tracking: Offen / Genehmigt / Abgelehnt / Abgelaufen
- Zeitlich begrenzte Passwort-Anzeige (Standard: 10 Minuten)

### Admin-Portal
- Queue aller offenen Anfragen
- Genehmigen / Ablehnen mit optionalem Kommentar
- Detail-Prüfung: User, Hostname, Zeitpunkt, Begründung
- AD-Validierung: Computer gefunden, LAPS verfügbar

### Audit-Logs
- Vollständiges Audit-Trail aller Aktionen
- Filter nach Event-Typ, User, Hostname, Zeitraum
- CSV-Export für externe Auswertung

### Sicherheit
- AD-basierte Authentifizierung
- JWT-Token-basierte Sessions
- Rate Limiting gegen Missbrauch
- Verschlüsselte temporäre Passwort-Speicherung
- Keine Passwörter in Logs

## Architektur

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│ Active Directory│
│   React + TS    │     │  Express + TS   │     │   LDAP/LAPS     │
│   TailwindCSS   │     │    SQLite DB    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Voraussetzungen

- Node.js 18+
- Active Directory mit LAPS konfiguriert
- Service-Account mit LAPS-Leserechten
- AD-Gruppe für Admin-Rolle (z.B. `GG_LAPS_Request_Admins`)

## Installation

### 1. Repository klonen
```bash
git clone <repo-url>
cd LAPS
```

### 2. Dependencies installieren
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 3. Backend konfigurieren
```bash
cd backend
cp .env.example .env
# .env anpassen mit AD-Einstellungen
```

### 4. Entwicklungsserver starten
```bash
# Aus dem Hauptverzeichnis
npm run dev
```

Backend: http://localhost:3001
Frontend: http://localhost:5173

## Konfiguration

### Umgebungsvariablen (backend/.env)

| Variable | Beschreibung | Standard |
|----------|-------------|----------|
| `AD_URL` | LDAP-URL des Domain Controllers | `ldap://dc01.domain.local` |
| `AD_BASE_DN` | Base DN der Domain | `DC=domain,DC=local` |
| `AD_USERNAME` | Service-Account für LAPS-Zugriff | - |
| `AD_PASSWORD` | Passwort des Service-Accounts | - |
| `AD_ADMIN_GROUP` | AD-Gruppe für Admin-Rolle | `GG_LAPS_Request_Admins` |
| `PASSWORD_DISPLAY_MINUTES` | Anzeigedauer des Passworts | `10` |
| `RATE_LIMIT_MAX_REQUESTS` | Max. Anfragen pro Stunde | `10` |

### AD Service-Account Berechtigungen

Der Service-Account benötigt:
- Leserechte auf Computer-Objekte
- Leserechte auf LAPS-Attribute (`ms-Mcs-AdmPwd`, `ms-Mcs-AdmPwdExpirationTime`)

```powershell
# Beispiel: LAPS-Leserechte delegieren
Set-AdmPwdReadPasswordPermission -OrgUnit "OU=Workstations,DC=domain,DC=local" -AllowedPrincipals "svc_laps_reader"
```

## API-Endpunkte

### Authentifizierung
- `POST /api/auth/login` - Anmeldung
- `GET /api/auth/me` - Aktueller Benutzer
- `POST /api/auth/logout` - Abmeldung

### Passwort-Anfragen
- `POST /api/requests` - Neue Anfrage erstellen
- `GET /api/requests/my` - Eigene Anfragen
- `GET /api/requests/:id/password` - Passwort abrufen (nur bei genehmigt)
- `GET /api/requests/queue` - Admin: Offene Anfragen
- `POST /api/requests/:id/review` - Admin: Genehmigen/Ablehnen

### Audit
- `GET /api/audit` - Audit-Logs mit Filtern
- `GET /api/audit/export` - CSV-Export

## Sicherheitshinweise

1. **Produktionsumgebung**: Ändern Sie alle Secrets in `.env`
2. **HTTPS**: Verwenden Sie immer HTTPS in Produktion
3. **Reverse Proxy**: Empfohlen für Windows Auth/SSO
4. **Backup**: Regelmäßige Backups der SQLite-Datenbank
5. **Monitoring**: Überwachen Sie die Audit-Logs

## Datenbank-Schema

```sql
-- Passwort-Anfragen
password_requests (
  id, requester_id, requester_name, hostname,
  justification, status, created_at, reviewed_by,
  reviewer_comment, computer_found, laps_available
)

-- Audit-Logs
audit_logs (
  id, timestamp, event_type, user_id, user_name,
  hostname, request_id, details, client_ip, success
)

-- Verschlüsselte Passwörter (temporär)
encrypted_passwords (
  request_id, encrypted_password, iv,
  created_at, expires_at
)
```

## Lizenz

Intern / Proprietär

## Support

Bei Fragen oder Problemen wenden Sie sich an das IT-Team.
