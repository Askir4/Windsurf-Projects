// Auth Manager - Handles authentication and user management
class AuthManager {
    constructor(system) {
        this.system = system;
        this.currentUser = null;
        // Immer localhost:3001 verwenden da Server dort läuft
        this.serverUrl = 'http://localhost:3001';
        this.init();
    }
    
    async init() {
        await this.checkAuth();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Login Form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // User Menu Toggle
        const userMenuToggle = document.getElementById('userMenuToggle');
        if (userMenuToggle) {
            userMenuToggle.addEventListener('click', () => this.toggleUserMenu());
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const userMenu = document.getElementById('userMenu');
            if (userMenu && !userMenu.contains(e.target)) {
                userMenu.classList.remove('open');
            }
        });
        
        // Logout Button (neue einfache Version)
        document.getElementById('menuLogout')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });
        
        // Passwort ändern Form (im Profil-Panel)
        document.getElementById('changePasswordForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleChangePassword();
        });
        
        // Avatar Upload (im Profil-Panel)
        document.getElementById('avatarUpload')?.addEventListener('change', (e) => {
            this.handleAvatarUpload(e);
        });
        
        // Modal Close Buttons
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.close;
                this.closeModal(modalId);
            });
        });
        
        // Close modal on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay && overlay.id !== 'loginModal') {
                    overlay.classList.add('hidden');
                }
            });
        });
        
        // Password Change
        document.getElementById('savePassword')?.addEventListener('click', () => this.handlePasswordChange());
        
        // Avatar Upload
        document.getElementById('avatarUpload')?.addEventListener('change', (e) => this.handleAvatarUpload(e));
        
        // Admin: Add User
        document.getElementById('addUserBtn')?.addEventListener('click', () => this.openUserEditModal());
        document.getElementById('saveUserBtn')?.addEventListener('click', () => this.handleSaveUser());
        
        // Admin: Audit Filter
        document.getElementById('applyAuditFilter')?.addEventListener('click', () => this.loadAuditLogs());
        
        // Admin Panel Buttons (in Admin-Tab)
        document.getElementById('openUsersModal')?.addEventListener('click', () => {
            this.openModal('usersModal');
            this.loadUsers();
        });
        document.getElementById('openAuditModal')?.addEventListener('click', () => {
            this.openModal('auditLogsModal');
            this.loadAuditLogs();
        });
        
        // Admin Mode Button
        document.getElementById('adminMode')?.addEventListener('click', () => {
            if (this.system) {
                this.system.setMode('admin');
            }
        });
    }
    
    async checkAuth() {
        try {
            const res = await fetch(`${this.serverUrl}/api/auth/me`, {
                credentials: 'include'
            });
            const data = await res.json();
            
            if (data.user) {
                this.currentUser = data.user;
                this.updateUI(true);
            } else {
                this.updateUI(false);
                this.showLoginModal();
            }
        } catch (e) {
            console.error('Auth check failed:', e);
            this.updateUI(false);
            this.showLoginModal();
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');
        
        try {
            const res = await fetch(`${this.serverUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                this.currentUser = data.user;
                this.updateUI(true);
                this.closeModal('loginModal');
                this.system?.showToast('Erfolgreich angemeldet', 'success');
            } else {
                errorEl.textContent = data.error || 'Login fehlgeschlagen';
                errorEl.classList.remove('hidden');
            }
        } catch (e) {
            errorEl.textContent = 'Verbindungsfehler';
            errorEl.classList.remove('hidden');
        }
    }
    
    async handleLogout() {
        try {
            await fetch(`${this.serverUrl}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            console.error('Logout error:', e);
        }
        
        this.currentUser = null;
        this.updateUI(false);
        this.showLoginModal();
        this.system?.showToast('Abgemeldet', 'info');
    }
    
    async handleChangePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (newPassword !== confirmPassword) {
            this.system?.showToast('Passwörter stimmen nicht überein', 'error');
            return;
        }
        
        if (newPassword.length < 8) {
            this.system?.showToast('Passwort muss mindestens 8 Zeichen haben', 'error');
            return;
        }
        
        try {
            const res = await fetch(`${this.serverUrl}/api/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ currentPassword, newPassword })
            });
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                document.getElementById('changePasswordForm').reset();
                this.system?.showToast('Passwort erfolgreich geändert', 'success');
            } else {
                this.system?.showToast(data.error || 'Fehler beim Ändern', 'error');
            }
        } catch (e) {
            this.system?.showToast('Verbindungsfehler', 'error');
        }
    }
    
    async handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('avatar', file);
        
        try {
            const res = await fetch(`${this.serverUrl}/api/users/avatar`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                this.currentUser.avatar_url = data.avatar_url;
                this.updateAvatars();
                this.system?.showToast('Avatar aktualisiert', 'success');
            } else {
                this.system?.showToast(data.error || 'Upload fehlgeschlagen', 'error');
            }
        } catch (e) {
            this.system?.showToast('Verbindungsfehler', 'error');
        }
    }
    
    // Admin Functions
    async loadUsers() {
        try {
            const res = await fetch(`${this.serverUrl}/api/users`, {
                credentials: 'include'
            });
            
            if (!res.ok) {
                this.system?.showToast('Keine Berechtigung', 'error');
                return;
            }
            
            const users = await res.json();
            this.renderUsersTable(users);
        } catch (e) {
            console.error('Load users error:', e);
        }
    }
    
    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td class="avatar-cell">
                    <img src="${user.avatar_url || '/assets/default-avatar.svg'}" alt="Avatar">
                </td>
                <td>${this.escapeHtml(user.username)}</td>
                <td>${this.escapeHtml(user.email || '-')}</td>
                <td>
                    <span class="role-badge ${user.role === 'ADMIN' ? 'admin' : 'user'}">
                        ${user.role === 'ADMIN' ? 'Admin' : 'Benutzer'}
                    </span>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString('de-DE')}</td>
                <td class="actions-cell">
                    <button class="btn btn-secondary btn-icon" onclick="authManager.openUserEditModal(${user.id})" title="Bearbeiten">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-warning btn-icon" onclick="authManager.resetUserPassword(${user.id})" title="Passwort zurücksetzen">
                        <i class="fas fa-key"></i>
                    </button>
                    ${user.id !== this.currentUser.id ? `
                        <button class="btn btn-danger btn-icon" onclick="authManager.deleteUser(${user.id})" title="Löschen">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    }
    
    openUserEditModal(userId = null) {
        const modal = document.getElementById('userEditModal');
        const title = document.getElementById('userEditTitle');
        const passwordGroup = document.getElementById('editPasswordGroup');
        const form = document.getElementById('userEditForm');
        
        form.reset();
        document.getElementById('editUserId').value = userId || '';
        
        if (userId) {
            title.innerHTML = '<i class="fas fa-user-edit"></i> Benutzer bearbeiten';
            passwordGroup.querySelector('label').textContent = 'Neues Passwort (leer = unverändert)';
            // Load user data
            this.loadUserForEdit(userId);
        } else {
            title.innerHTML = '<i class="fas fa-user-plus"></i> Neuer Benutzer';
            passwordGroup.querySelector('label').textContent = 'Passwort (mind. 8 Zeichen)';
        }
        
        this.openModal('userEditModal');
    }
    
    async loadUserForEdit(userId) {
        try {
            const res = await fetch(`${this.serverUrl}/api/users`, {
                credentials: 'include'
            });
            const users = await res.json();
            const user = users.find(u => u.id === userId);
            
            if (user) {
                document.getElementById('editUsername').value = user.username;
                document.getElementById('editEmail').value = user.email || '';
                document.getElementById('editRole').value = user.role;
            }
        } catch (e) {
            console.error('Load user error:', e);
        }
    }
    
    async handleSaveUser() {
        const userId = document.getElementById('editUserId').value;
        const username = document.getElementById('editUsername').value;
        const email = document.getElementById('editEmail').value;
        const password = document.getElementById('editPassword').value;
        const role = document.getElementById('editRole').value;
        const errorEl = document.getElementById('userEditError');
        
        const body = { username, email, role };
        if (password) body.password = password;
        
        try {
            let res;
            if (userId) {
                // Update existing user
                res = await fetch(`${this.serverUrl}/api/users/${userId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(body)
                });
            } else {
                // Create new user
                if (!password || password.length < 8) {
                    errorEl.textContent = 'Passwort erforderlich (mind. 8 Zeichen)';
                    errorEl.classList.remove('hidden');
                    return;
                }
                res = await fetch(`${this.serverUrl}/api/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(body)
                });
            }
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                this.closeModal('userEditModal');
                this.loadUsers();
                this.system?.showToast(userId ? 'Benutzer aktualisiert' : 'Benutzer erstellt', 'success');
            } else {
                errorEl.textContent = data.error || 'Fehler beim Speichern';
                errorEl.classList.remove('hidden');
            }
        } catch (e) {
            errorEl.textContent = 'Verbindungsfehler';
            errorEl.classList.remove('hidden');
        }
    }
    
    async resetUserPassword(userId) {
        const newPassword = prompt('Neues Passwort eingeben (mind. 8 Zeichen):');
        if (!newPassword || newPassword.length < 8) {
            this.system?.showToast('Passwort muss mind. 8 Zeichen haben', 'error');
            return;
        }
        
        try {
            const res = await fetch(`${this.serverUrl}/api/users/${userId}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ newPassword })
            });
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                this.system?.showToast('Passwort zurückgesetzt', 'success');
            } else {
                this.system?.showToast(data.error || 'Fehler', 'error');
            }
        } catch (e) {
            this.system?.showToast('Verbindungsfehler', 'error');
        }
    }
    
    async deleteUser(userId) {
        if (!confirm('Benutzer wirklich löschen?')) return;
        
        try {
            const res = await fetch(`${this.serverUrl}/api/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                this.loadUsers();
                this.system?.showToast('Benutzer gelöscht', 'success');
            } else {
                this.system?.showToast(data.error || 'Fehler', 'error');
            }
        } catch (e) {
            this.system?.showToast('Verbindungsfehler', 'error');
        }
    }
    
    // Audit Logs
    async loadAuditLogs() {
        const action = document.getElementById('auditActionFilter')?.value || '';
        const actor = document.getElementById('auditActorFilter')?.value || '';
        
        const params = new URLSearchParams();
        if (action) params.append('action', action);
        if (actor) params.append('actor', actor);
        params.append('limit', '100');
        
        try {
            const res = await fetch(`${this.serverUrl}/api/audit-logs?${params}`, {
                credentials: 'include'
            });
            
            if (!res.ok) {
                this.system?.showToast('Keine Berechtigung', 'error');
                return;
            }
            
            const logs = await res.json();
            this.renderAuditLogs(logs);
        } catch (e) {
            console.error('Load audit logs error:', e);
        }
    }
    
    renderAuditLogs(logs) {
        const container = document.getElementById('auditLogsTableBody');
        if (!container) return;
        
        // Verwende neues Log-Format statt Tabelle
        const wrapper = container.closest('.audit-logs-container') || container.parentElement;
        
        if (!logs || logs.length === 0) {
            wrapper.innerHTML = typeof LogUtils !== 'undefined'
                ? LogUtils.renderEmptyState('Keine Audit-Logs vorhanden')
                : '<div class="log-empty-state"><i class="fas fa-inbox"></i><p>Keine Logs</p></div>';
            return;
        }
        
        let html = `
            <div class="log-list-header audit-header">
                <span>Zeitpunkt</span>
                <span>Benutzer</span>
                <span>Aktion</span>
                <span>Objekt</span>
                <span></span>
            </div>
            <div class="logs-container">
        `;
        
        logs.forEach((log, index) => {
            if (typeof LogUtils !== 'undefined') {
                html += LogUtils.renderAuditLogItem(log, index);
            } else {
                // Fallback
                html += `
                    <div class="log-row audit-row ${index % 2 === 0 ? 'log-row-even' : ''}">
                        <div class="log-row-main">
                            <div class="log-col">${new Date(log.created_at).toLocaleString('de-DE')}</div>
                            <div class="log-col">${this.escapeHtml(log.actor_username || 'System')}</div>
                            <div class="log-col"><code>${this.escapeHtml(log.action)}</code></div>
                            <div class="log-col">${this.escapeHtml(log.entity_type || '—')}</div>
                        </div>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        wrapper.innerHTML = html;
    }
    
    // UI Helpers
    updateUI(isLoggedIn) {
        const userMenu = document.getElementById('userMenu');
        const mainContent = document.querySelector('main');
        
        if (isLoggedIn && this.currentUser) {
            userMenu?.classList.remove('hidden');
            mainContent?.classList.remove('hidden');
            
            this.updateAvatars();
            
            // Show/hide admin menu items
            const isAdmin = this.currentUser.role === 'ADMIN';
            document.querySelectorAll('.admin-only').forEach(el => {
                el.classList.toggle('hidden', !isAdmin);
            });
            
            // Update username
            document.getElementById('headerUsername').textContent = this.currentUser.username;
            document.getElementById('dropdownUsername').textContent = this.currentUser.username;
            document.getElementById('dropdownRole').textContent = 
                this.currentUser.role === 'ADMIN' ? 'Administrator' : 'Benutzer';
        } else {
            userMenu?.classList.add('hidden');
        }
    }
    
    updateAvatars() {
        const avatarUrl = this.currentUser?.avatar_url || '/assets/default-avatar.svg';
        document.getElementById('headerAvatar')?.setAttribute('src', avatarUrl);
        document.getElementById('profileAvatar')?.setAttribute('src', avatarUrl);
    }
    
    loadProfileData() {
        if (!this.currentUser) return;
        
        // Profil-Panel Felder aktualisieren
        const usernameEl = document.getElementById('profileUsername');
        const roleEl = document.getElementById('profileRole');
        const createdEl = document.getElementById('profileCreated');
        
        if (usernameEl) usernameEl.textContent = this.currentUser.username;
        if (roleEl) {
            roleEl.textContent = this.currentUser.role === 'ADMIN' ? 'Administrator' : 'Benutzer';
            roleEl.className = `role-badge ${this.currentUser.role === 'ADMIN' ? 'admin' : 'user'}`;
        }
        if (createdEl && this.currentUser.created_at) {
            createdEl.textContent = new Date(this.currentUser.created_at).toLocaleDateString('de-DE');
        }
        
        this.updateAvatars();
    }
    
    toggleUserMenu() {
        const userMenu = document.getElementById('userMenu');
        userMenu?.classList.toggle('open');
    }
    
    openModal(modalId) {
        document.getElementById(modalId)?.classList.remove('hidden');
        document.getElementById('userMenu')?.classList.remove('open');
    }
    
    closeModal(modalId) {
        document.getElementById(modalId)?.classList.add('hidden');
        // Reset form errors
        const errorEl = document.querySelector(`#${modalId} .form-error`);
        if (errorEl) errorEl.classList.add('hidden');
    }
    
    showLoginModal() {
        document.getElementById('loginModal')?.classList.remove('hidden');
    }
    
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Check if current user is admin
    isAdmin() {
        return this.currentUser?.role === 'ADMIN';
    }
    
    // Get current user ID
    getUserId() {
        return this.currentUser?.id;
    }
    
    getUsername() {
        return this.currentUser?.username;
    }
}

// Global instance - will be initialized after DOM load
let authManager = null;
