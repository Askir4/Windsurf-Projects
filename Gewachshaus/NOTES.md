# Implementation Notes

## ✅ Implementierung abgeschlossen

**Datum**: 2026-01-16

## Annahmen und Entscheidungen

### Authentifizierung
- **Session-basiert**: Verwendung von `express-session` mit SQLite-Store für persistente Sessions
- **Password Hashing**: bcryptjs mit cost factor 12 (Pure JS, keine native Compilation nötig)
- **Default Admin**: Beim ersten Start wird ein Admin-User erstellt (Credentials aus ENV oder Default)

### Rollen (RBAC)
- `ADMIN`: Vollzugriff (User-Verwaltung, Logs, alle Daten)
- `NORMAL_USER`: Pflanzen hinzufügen/bearbeiten, düngen, eigene Notizen

### Datenmodell-Erweiterungen
- `users`: id, username, email, password_hash, role, avatar_url, created_at, updated_at
- `audit_logs`: id, actor_user_id, actor_username, action, entity_type, entity_id, metadata_json, ip, user_agent, created_at
- `notes`: Erweitert um author_user_id (Migration für bestehende Daten)

### Avatar-Upload
- Speicherort: `/uploads/avatars/`
- Erlaubte Formate: PNG, JPG, WEBP
- Max. Größe: 2MB
- Dateiname: `{user_id}_{timestamp}.{ext}`

### Security
- Sessions invalidieren nach Passwort-Änderung
- Rate-Limiting auf Auth-Endpoints (5 Versuche/Minute)
- Password Policy: Min. 8 Zeichen
- Keine Passwörter in Logs oder API-Responses

### Environment Variables
```
SESSION_SECRET=<random-string-min-32-chars>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<initial-admin-password>
ADMIN_EMAIL=admin@example.com
```

## Änderungs-Log

### Phase 1: Backend Auth
- [x] Dependencies hinzugefügt (bcrypt, express-session, better-sqlite3-session-store, multer)
- [x] Users-Tabelle erstellt
- [x] AuditLog-Tabelle erstellt
- [x] Auth-Middleware implementiert
- [x] RBAC Guards implementiert
- [x] Login/Logout Endpoints
- [x] User CRUD (Admin only)

### Phase 2: Frontend Auth
- [x] Login-Seite
- [x] User-Menü
- [x] Admin-Bereich
- [x] Role-based Navigation

### Phase 3: Features
- [x] Avatar Upload
- [x] Notizen mit Author
- [x] Audit-Log UI
- [x] "Used by" Section mit Logo
