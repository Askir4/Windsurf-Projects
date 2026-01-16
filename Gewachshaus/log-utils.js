// Log Utilities - Einheitliche Log-Formatierung und Rendering
const LogUtils = {
    // Datum/Zeit formatieren (DE Locale)
    formatDateTime(dateStr) {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return '—';
        }
    },
    
    // Relative Zeit (z.B. "vor 5 Min.")
    formatRelativeTime(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diff = Math.floor((now - date) / 1000);
            
            if (diff < 60) return 'gerade eben';
            if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
            if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
            return `vor ${Math.floor(diff / 86400)} Tagen`;
        } catch {
            return '';
        }
    },
    
    // HTML escapen
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        if (typeof text !== 'string') text = String(text);
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Fallback für leere Werte
    fallback(value, defaultValue = '—') {
        if (value === null || value === undefined || value === '') {
            return `<span class="log-empty-value">${defaultValue}</span>`;
        }
        return this.escapeHtml(value);
    },
    
    // Level Badge rendern
    renderLevelBadge(level) {
        const lvl = (level || 'INFO').toUpperCase();
        const icons = {
            'ERROR': 'fa-times-circle',
            'WARN': 'fa-exclamation-triangle',
            'WARNING': 'fa-exclamation-triangle',
            'INFO': 'fa-info-circle',
            'DEBUG': 'fa-bug',
            'SUCCESS': 'fa-check-circle'
        };
        const icon = icons[lvl] || 'fa-circle';
        return `<span class="log-level-badge log-level-${lvl.toLowerCase()}">
            <i class="fas ${icon}"></i> ${lvl}
        </span>`;
    },
    
    // Action Badge rendern (für Audit-Logs)
    renderActionBadge(action) {
        if (!action) return this.fallback(null);
        const actionMap = {
            'LOGIN_SUCCESS': { icon: 'fa-sign-in-alt', color: 'success', label: 'Login' },
            'LOGIN_FAILED': { icon: 'fa-ban', color: 'error', label: 'Login fehlgeschlagen' },
            'LOGOUT': { icon: 'fa-sign-out-alt', color: 'info', label: 'Logout' },
            'USER_CREATED': { icon: 'fa-user-plus', color: 'success', label: 'User erstellt' },
            'USER_UPDATED': { icon: 'fa-user-edit', color: 'info', label: 'User geändert' },
            'USER_DELETED': { icon: 'fa-user-minus', color: 'error', label: 'User gelöscht' },
            'PASSWORD_CHANGED': { icon: 'fa-key', color: 'warning', label: 'Passwort geändert' },
            'PASSWORD_RESET_BY_ADMIN': { icon: 'fa-unlock', color: 'warning', label: 'PW Reset (Admin)' },
            'AVATAR_UPDATED': { icon: 'fa-camera', color: 'info', label: 'Avatar geändert' },
            'NOTE_CREATED': { icon: 'fa-comment-plus', color: 'success', label: 'Notiz erstellt' },
            'NOTE_DELETED': { icon: 'fa-comment-slash', color: 'error', label: 'Notiz gelöscht' },
            'PLANT_ADDED': { icon: 'fa-seedling', color: 'success', label: 'Pflanze hinzugefügt' },
            'FERTILIZER_APPLIED': { icon: 'fa-flask', color: 'info', label: 'Gedüngt' }
        };
        
        const info = actionMap[action] || { icon: 'fa-circle', color: 'default', label: action };
        return `<span class="log-action-badge log-action-${info.color}">
            <i class="fas ${info.icon}"></i> ${this.escapeHtml(info.label)}
        </span>`;
    },
    
    // JSON sicher und gekürzt formatieren
    formatJson(jsonStr, maxLength = 100) {
        if (!jsonStr) return null;
        try {
            const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
            // Sensitive Daten maskieren
            const sanitized = this.sanitizeObject(parsed);
            const formatted = JSON.stringify(sanitized, null, 2);
            return formatted;
        } catch {
            return String(jsonStr);
        }
    },
    
    // Sensitive Daten aus Objekt entfernen
    sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        const sensitiveKeys = ['password', 'token', 'secret', 'hash', 'key', 'auth'];
        const result = Array.isArray(obj) ? [] : {};
        
        for (const [key, value] of Object.entries(obj)) {
            if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
                result[key] = '***REDACTED***';
            } else if (typeof value === 'object' && value !== null) {
                result[key] = this.sanitizeObject(value);
            } else {
                result[key] = value;
            }
        }
        return result;
    },
    
    // Copy to Clipboard
    async copyToClipboard(text, successMsg = 'Kopiert!') {
        try {
            await navigator.clipboard.writeText(text);
            if (typeof system !== 'undefined' && system.showToast) {
                system.showToast(successMsg, 'success');
            }
            return true;
        } catch {
            return false;
        }
    },
    
    // System Log Item rendern
    renderSystemLogItem(log, index) {
        const level = (log.level || 'INFO').toUpperCase();
        const hasData = log.data && Object.keys(log.data).length > 0;
        const dataId = `log-data-${index}-${Date.now()}`;
        
        return `
        <div class="log-row log-row-${level.toLowerCase()} ${index % 2 === 0 ? 'log-row-even' : 'log-row-odd'}">
            <div class="log-row-main">
                <div class="log-col log-col-time" title="${this.escapeHtml(log.timestamp)}">
                    <span class="log-time-full">${this.formatDateTime(log.timestamp)}</span>
                    <span class="log-time-relative">${this.formatRelativeTime(log.timestamp)}</span>
                </div>
                <div class="log-col log-col-level">
                    ${this.renderLevelBadge(level)}
                </div>
                <div class="log-col log-col-message">
                    <span class="log-message-text">${this.escapeHtml(log.message || '—')}</span>
                </div>
                <div class="log-col log-col-actions">
                    ${hasData ? `
                        <button class="log-btn log-btn-expand" onclick="LogUtils.toggleExpand('${dataId}')" title="Details anzeigen">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    ` : ''}
                    <button class="log-btn log-btn-copy" onclick="LogUtils.copyLogLine(this)" 
                        data-log='${this.escapeHtml(JSON.stringify(log))}' title="Zeile kopieren">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            ${hasData ? `
                <div class="log-row-details collapsed" id="${dataId}">
                    <div class="log-details-header">
                        <span>Details</span>
                        <button class="log-btn log-btn-copy-json" onclick="LogUtils.copyJson('${dataId}')" title="JSON kopieren">
                            <i class="fas fa-clipboard"></i> JSON kopieren
                        </button>
                    </div>
                    <pre class="log-json">${this.escapeHtml(this.formatJson(log.data))}</pre>
                </div>
            ` : ''}
        </div>`;
    },
    
    // Audit Log Item rendern
    renderAuditLogItem(log, index) {
        const hasMetadata = log.metadata_json && log.metadata_json !== '{}';
        const dataId = `audit-data-${index}-${Date.now()}`;
        
        return `
        <div class="log-row audit-row ${index % 2 === 0 ? 'log-row-even' : 'log-row-odd'}">
            <div class="log-row-main">
                <div class="log-col log-col-time" title="${this.escapeHtml(log.created_at)}">
                    <span class="log-time-full">${this.formatDateTime(log.created_at)}</span>
                    <span class="log-time-relative">${this.formatRelativeTime(log.created_at)}</span>
                </div>
                <div class="log-col log-col-actor">
                    <i class="fas fa-user"></i>
                    <span>${this.fallback(log.actor_username, 'System')}</span>
                </div>
                <div class="log-col log-col-action">
                    ${this.renderActionBadge(log.action)}
                </div>
                <div class="log-col log-col-entity">
                    ${log.entity_type ? `
                        <span class="log-entity-chip">
                            <i class="fas fa-cube"></i> ${this.escapeHtml(log.entity_type)}
                            ${log.entity_id ? `<span class="log-entity-id">#${this.escapeHtml(log.entity_id)}</span>` : ''}
                        </span>
                    ` : '<span class="log-empty-value">—</span>'}
                </div>
                <div class="log-col log-col-actions">
                    ${hasMetadata ? `
                        <button class="log-btn log-btn-expand" onclick="LogUtils.toggleExpand('${dataId}')" title="Details anzeigen">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    ` : ''}
                    <button class="log-btn log-btn-copy" onclick="LogUtils.copyLogLine(this)" 
                        data-log='${this.escapeHtml(JSON.stringify(log))}' title="Zeile kopieren">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            ${hasMetadata ? `
                <div class="log-row-details collapsed" id="${dataId}">
                    <div class="log-details-header">
                        <span>Metadaten</span>
                        <button class="log-btn log-btn-copy-json" onclick="LogUtils.copyJson('${dataId}')" title="JSON kopieren">
                            <i class="fas fa-clipboard"></i> JSON kopieren
                        </button>
                    </div>
                    <pre class="log-json">${this.escapeHtml(this.formatJson(log.metadata_json))}</pre>
                    ${log.ip ? `<div class="log-meta-info"><i class="fas fa-network-wired"></i> IP: ${this.escapeHtml(log.ip)}</div>` : ''}
                </div>
            ` : ''}
        </div>`;
    },
    
    // Toggle expand/collapse
    toggleExpand(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        const btn = el.previousElementSibling?.querySelector('.log-btn-expand');
        const isCollapsed = el.classList.contains('collapsed');
        
        el.classList.toggle('collapsed');
        if (btn) {
            btn.innerHTML = isCollapsed ? '<i class="fas fa-chevron-up"></i>' : '<i class="fas fa-chevron-down"></i>';
        }
    },
    
    // Copy log line
    copyLogLine(btn) {
        const logData = btn.dataset.log;
        if (logData) {
            try {
                const parsed = JSON.parse(logData);
                const formatted = JSON.stringify(parsed, null, 2);
                this.copyToClipboard(formatted, 'Log kopiert!');
            } catch {
                this.copyToClipboard(logData, 'Log kopiert!');
            }
        }
    },
    
    // Copy JSON from details
    copyJson(elementId) {
        const el = document.getElementById(elementId);
        const pre = el?.querySelector('.log-json');
        if (pre) {
            this.copyToClipboard(pre.textContent, 'JSON kopiert!');
        }
    },
    
    // Render empty state
    renderEmptyState(message = 'Keine Logs vorhanden') {
        return `
        <div class="log-empty-state">
            <i class="fas fa-inbox"></i>
            <p>${this.escapeHtml(message)}</p>
        </div>`;
    },
    
    // Render loading state
    renderLoadingState() {
        return `
        <div class="log-loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Lade Logs...</p>
        </div>`;
    }
};

// Make globally available
window.LogUtils = LogUtils;

// ============== LOG PANEL CONTROLLER ==============
class LogPanelController {
    constructor() {
        this.currentType = 'system'; // 'system' oder 'audit'
        this.logs = [];
        this.filteredLogs = [];
        this.searchTerm = '';
        this.levelFilter = '';
        this.actionFilter = '';
        this.serverUrl = 'http://localhost:3001';
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadLogs();
        
        // Auto-refresh alle 30 Sekunden
        setInterval(() => this.loadLogs(), 30000);
    }
    
    bindEvents() {
        // Log Type Toggle
        document.getElementById('showSystemLogs')?.addEventListener('click', () => this.switchType('system'));
        document.getElementById('showAuditLogs')?.addEventListener('click', () => this.switchType('audit'));
        
        // Search
        document.getElementById('logSearchInput')?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.applyFilters();
        });
        
        // Level Filter
        document.getElementById('logLevelFilterPanel')?.addEventListener('change', (e) => {
            this.levelFilter = e.target.value;
            this.applyFilters();
        });
        
        // Action Filter
        document.getElementById('logActionFilterPanel')?.addEventListener('change', (e) => {
            this.actionFilter = e.target.value;
            this.applyFilters();
        });
        
        // Refresh
        document.getElementById('refreshLogsBtn')?.addEventListener('click', () => {
            const btn = document.getElementById('refreshLogsBtn');
            btn?.classList.add('spinning');
            this.loadLogs().then(() => {
                setTimeout(() => btn?.classList.remove('spinning'), 500);
            });
        });
        
        // Export
        document.getElementById('exportLogsBtn')?.addEventListener('click', () => {
            document.getElementById('exportDropdownMenu')?.classList.toggle('hidden');
        });
        
        document.querySelectorAll('.export-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                this.exportLogs(format);
                document.getElementById('exportDropdownMenu')?.classList.add('hidden');
            });
        });
        
        // Close export dropdown on outside click
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('exportDropdownMenu');
            const btn = document.getElementById('exportLogsBtn');
            if (dropdown && !dropdown.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    }
    
    async switchType(type) {
        this.currentType = type;
        
        // Update toggle buttons
        document.getElementById('showSystemLogs')?.classList.toggle('active', type === 'system');
        document.getElementById('showAuditLogs')?.classList.toggle('active', type === 'audit');
        
        // Show/hide appropriate filters
        document.getElementById('logLevelFilterPanel')?.classList.toggle('hidden', type === 'audit');
        document.getElementById('logActionFilterPanel')?.classList.toggle('hidden', type === 'system');
        
        // Reset filters
        this.levelFilter = '';
        this.actionFilter = '';
        document.getElementById('logLevelFilterPanel').value = '';
        document.getElementById('logActionFilterPanel').value = '';
        
        await this.loadLogs();
    }
    
    async loadLogs() {
        const body = document.getElementById('logsPanelBody');
        if (!body) return;
        
        body.innerHTML = LogUtils.renderLoadingState();
        
        try {
            if (this.currentType === 'system') {
                await this.loadSystemLogs();
            } else {
                await this.loadAuditLogs();
            }
            this.applyFilters();
        } catch (e) {
            console.error('Error loading logs:', e);
            body.innerHTML = LogUtils.renderEmptyState('Fehler beim Laden der Logs');
        }
    }
    
    async loadSystemLogs() {
        try {
            const res = await fetch(`${this.serverUrl}/api/logs?limit=200`);
            if (!res.ok) throw new Error('Failed to fetch logs');
            
            const rows = await res.json();
            this.logs = rows.map(r => ({
                timestamp: r.timestamp,
                level: r.level,
                message: r.message,
                data: r.data ? JSON.parse(r.data) : null,
                type: 'system'
            }));
        } catch (e) {
            // Fallback: lokale Logs aus dem System verwenden
            if (typeof system !== 'undefined' && system.localLogs) {
                this.logs = [...system.localLogs].reverse().map(l => ({ ...l, type: 'system' }));
            } else {
                this.logs = [];
            }
        }
    }
    
    async loadAuditLogs() {
        try {
            const res = await fetch(`${this.serverUrl}/api/audit-logs?limit=200`, {
                credentials: 'include'
            });
            
            if (!res.ok) {
                if (res.status === 401) {
                    this.logs = [];
                    return;
                }
                throw new Error('Failed to fetch audit logs');
            }
            
            this.logs = (await res.json()).map(l => ({ ...l, type: 'audit' }));
        } catch (e) {
            console.error('Error loading audit logs:', e);
            this.logs = [];
        }
    }
    
    applyFilters() {
        let filtered = [...this.logs];
        
        // Search filter
        if (this.searchTerm) {
            filtered = filtered.filter(log => {
                const searchIn = this.currentType === 'system'
                    ? `${log.message || ''} ${log.level || ''} ${JSON.stringify(log.data || {})}`
                    : `${log.action || ''} ${log.actor_username || ''} ${log.entity_type || ''} ${log.metadata_json || ''}`;
                return searchIn.toLowerCase().includes(this.searchTerm);
            });
        }
        
        // Level filter (system logs)
        if (this.levelFilter && this.currentType === 'system') {
            filtered = filtered.filter(log => log.level === this.levelFilter);
        }
        
        // Action filter (audit logs)
        if (this.actionFilter && this.currentType === 'audit') {
            filtered = filtered.filter(log => log.action === this.actionFilter);
        }
        
        this.filteredLogs = filtered;
        this.renderLogs();
    }
    
    renderLogs() {
        const body = document.getElementById('logsPanelBody');
        if (!body) return;
        
        if (this.filteredLogs.length === 0) {
            body.innerHTML = LogUtils.renderEmptyState(
                this.currentType === 'system' ? 'Keine System-Logs gefunden' : 'Keine Benutzer-Aktivitäten gefunden'
            );
            this.updateFooter(0);
            return;
        }
        
        let html = '';
        
        // Header
        if (this.currentType === 'system') {
            html += `
                <div class="log-list-header">
                    <span>Zeitpunkt</span>
                    <span>Level</span>
                    <span>Nachricht</span>
                    <span></span>
                </div>
            `;
        } else {
            html += `
                <div class="log-list-header audit-header">
                    <span>Zeitpunkt</span>
                    <span>Benutzer</span>
                    <span>Aktion</span>
                    <span>Objekt</span>
                    <span></span>
                </div>
            `;
        }
        
        html += '<div class="logs-container">';
        
        this.filteredLogs.forEach((log, index) => {
            if (this.currentType === 'system') {
                html += LogUtils.renderSystemLogItem(log, index);
            } else {
                html += LogUtils.renderAuditLogItem(log, index);
            }
        });
        
        html += '</div>';
        body.innerHTML = html;
        
        this.updateFooter(this.filteredLogs.length);
    }
    
    updateFooter(count) {
        const countEl = document.getElementById('logCount');
        const updateEl = document.getElementById('logLastUpdate');
        
        if (countEl) {
            countEl.textContent = `${count} ${count === 1 ? 'Eintrag' : 'Einträge'}`;
        }
        
        if (updateEl) {
            updateEl.textContent = `Zuletzt aktualisiert: ${LogUtils.formatDateTime(new Date().toISOString())}`;
        }
    }
    
    exportLogs(format) {
        const data = this.filteredLogs;
        let content = '';
        let filename = `logs_${this.currentType}_${new Date().toISOString().split('T')[0]}`;
        let mimeType = '';
        
        switch (format) {
            case 'json':
                content = JSON.stringify(data, null, 2);
                filename += '.json';
                mimeType = 'application/json';
                break;
                
            case 'csv':
                if (this.currentType === 'system') {
                    content = 'Zeitpunkt;Level;Nachricht;Details\n';
                    content += data.map(log => 
                        `"${LogUtils.formatDateTime(log.timestamp)}";"${log.level || ''}";"${(log.message || '').replace(/"/g, '""')}";"${JSON.stringify(log.data || {}).replace(/"/g, '""')}"`
                    ).join('\n');
                } else {
                    content = 'Zeitpunkt;Benutzer;Aktion;Typ;Entity-ID;Metadaten\n';
                    content += data.map(log => 
                        `"${LogUtils.formatDateTime(log.created_at)}";"${log.actor_username || 'System'}";"${log.action || ''}";"${log.entity_type || ''}";"${log.entity_id || ''}";"${(log.metadata_json || '').replace(/"/g, '""')}"`
                    ).join('\n');
                }
                filename += '.csv';
                mimeType = 'text/csv';
                break;
                
            case 'txt':
                content = data.map(log => {
                    if (this.currentType === 'system') {
                        return `[${LogUtils.formatDateTime(log.timestamp)}] [${log.level || 'INFO'}] ${log.message || ''}`;
                    } else {
                        return `[${LogUtils.formatDateTime(log.created_at)}] ${log.actor_username || 'System'}: ${log.action} ${log.entity_type ? `(${log.entity_type})` : ''}`;
                    }
                }).join('\n');
                filename += '.txt';
                mimeType = 'text/plain';
                break;
        }
        
        // Download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (typeof system !== 'undefined' && system.showToast) {
            system.showToast(`Logs als ${format.toUpperCase()} exportiert`, 'success');
        }
    }
}

// Initialize when DOM is ready
let logPanelController = null;
document.addEventListener('DOMContentLoaded', () => {
    logPanelController = new LogPanelController();
});
