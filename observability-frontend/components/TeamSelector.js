/**
 * TeamSelector Component
 * Dropdown for selecting the current team context
 * Filters all data by the selected team
 */
class TeamSelector {
    constructor(options = {}) {
        this.containerId = options.containerId || 'teamSelectorContainer';
        this.onTeamChange = options.onTeamChange || null;
        this.teams = [];
        this.currentTeam = null;
        this.isOpen = false;
        
        this.init();
    }
    
    async init() {
        await this.loadContext();
        this.render();
        this.attachEventListeners();
    }
    
    async loadContext() {
        try {
            // Use TenantService if available
            const tenantService = window.TenantService?.getInstance();
            if (tenantService) {
                await tenantService.init();
                this.teams = tenantService.getTeams() || [];
                this.currentTeam = tenantService.getCurrentTeam() || (this.teams.length > 0 ? this.teams[0] : null);
                this.user = tenantService.user || null;
                this.organization = tenantService.organization || null;
            } else {
                // Fallback to direct API call
                const authService = window.AuthService?.getInstance();
                const headers = authService?.getAuthHeader() || {};

                let response = await fetch('/api/auth/context', { headers });
                if (!response.ok) {
                    response = await fetch('/api/mock/context');
                }

                const data = await response.json();
                const contextData = data.success && data.data ? data.data : data;

                this.teams = contextData.teams || [];
                this.currentTeam = contextData.currentTeam || (this.teams.length > 0 ? this.teams[0] : null);
                this.user = contextData.user || null;
                this.organization = contextData.organization || null;
            }

            // Store in state manager if available
            if (window.stateManager) {
                stateManager.set('teams', this.teams);
                stateManager.set('currentTeam', this.currentTeam);
                stateManager.set('user', this.user);
                stateManager.set('organization', this.organization);
            }

            // Store in localStorage for persistence
            if (this.currentTeam) {
                localStorage.setItem('observability_current_team', JSON.stringify(this.currentTeam));
            }
        } catch (error) {
            console.error('Failed to load context:', error);
            // Use cached team if available
            const cached = localStorage.getItem('observability_current_team');
            if (cached) {
                this.currentTeam = JSON.parse(cached);
            }
        }
    }
    
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        const teamColor = this.currentTeam?.color || '#3B82F6';
        const teamName = this.currentTeam?.name || 'Select Team';
        
        container.innerHTML = `
            <div class="team-selector">
                <button class="team-selector-btn" id="teamSelectorBtn">
                    <span class="team-indicator" style="background-color: ${teamColor}"></span>
                    <span class="team-name">${teamName}</span>
                    <svg class="team-chevron" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    </svg>
                </button>
                <div class="team-selector-dropdown" id="teamSelectorDropdown">
                    <div class="team-dropdown-header">
                        <span class="team-dropdown-title">Switch Team</span>
                    </div>
                    <div class="team-dropdown-list">
                        ${this.renderTeamList()}
                    </div>
                    <div class="team-dropdown-footer">
                        <span class="org-name">${this.organization?.name || 'Organization'}</span>
                    </div>
                </div>
            </div>
        `;
        
        this.addStyles();
    }
    
    renderTeamList() {
        if (!this.teams || this.teams.length === 0) {
            return '<div class="team-item-empty">No teams available</div>';
        }
        
        return this.teams.map(team => {
            const isActive = this.currentTeam?.id === team.id;
            const roleLabel = team.role ? `<span class="team-role">${team.role}</span>` : '';
            
            return `
                <div class="team-item ${isActive ? 'active' : ''}" data-team-id="${team.id}">
                    <span class="team-indicator" style="background-color: ${team.color || '#6B7280'}"></span>
                    <span class="team-item-name">${team.name}</span>
                    ${roleLabel}
                    ${isActive ? '<svg class="team-check" width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" stroke-width="2" fill="none"/></svg>' : ''}
                </div>
            `;
        }).join('');
    }
    
    addStyles() {
        if (document.getElementById('teamSelectorStyles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'teamSelectorStyles';
        styles.textContent = `
            .team-selector { position: relative; }
            .team-selector-btn {
                display: flex; align-items: center; gap: 8px;
                padding: 6px 12px; background: var(--bg-secondary);
                border: 1px solid var(--border-color); border-radius: 6px;
                color: var(--text-primary); cursor: pointer;
                font-size: 13px; font-weight: 500;
                transition: all 0.15s ease;
            }
            .team-selector-btn:hover { background: var(--bg-tertiary); border-color: var(--primary-color); }
            .team-indicator { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
            .team-name { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .team-chevron { transition: transform 0.15s ease; opacity: 0.6; }
            .team-selector.open .team-chevron { transform: rotate(180deg); }
            .team-selector-dropdown {
                position: absolute; top: calc(100% + 4px); left: 0;
                min-width: 220px; background: var(--bg-primary);
                border: 1px solid var(--border-color); border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                opacity: 0; visibility: hidden; transform: translateY(-8px);
                transition: all 0.15s ease; z-index: 1000;
            }
            .team-selector.open .team-selector-dropdown { opacity: 1; visibility: visible; transform: translateY(0); }
            .team-dropdown-header { padding: 10px 12px; border-bottom: 1px solid var(--border-color); }
            .team-dropdown-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.5px; }
            .team-dropdown-list { max-height: 240px; overflow-y: auto; padding: 6px; }
            .team-item {
                display: flex; align-items: center; gap: 8px;
                padding: 8px 10px; border-radius: 6px; cursor: pointer;
                transition: background 0.1s ease;
            }
            .team-item:hover { background: var(--bg-secondary); }
            .team-item.active { background: var(--primary-color-alpha, rgba(59, 130, 246, 0.1)); }
            .team-item-name { flex: 1; font-size: 13px; color: var(--text-primary); }
            .team-role { font-size: 10px; padding: 2px 6px; background: var(--bg-tertiary); border-radius: 4px; color: var(--text-secondary); }
            .team-check { color: var(--primary-color); }
            .team-dropdown-footer { padding: 8px 12px; border-top: 1px solid var(--border-color); }
            .org-name { font-size: 11px; color: var(--text-tertiary); }
            .team-item-empty { padding: 16px; text-align: center; color: var(--text-secondary); font-size: 13px; }
        `;
        document.head.appendChild(styles);
    }
    
    attachEventListeners() {
        const btn = document.getElementById('teamSelectorBtn');
        const dropdown = document.getElementById('teamSelectorDropdown');
        const selector = document.querySelector('.team-selector');
        
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }
        
        if (dropdown) {
            dropdown.addEventListener('click', (e) => {
                const teamItem = e.target.closest('.team-item');
                if (teamItem) {
                    const teamId = parseInt(teamItem.dataset.teamId);
                    this.selectTeam(teamId);
                }
            });
        }
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.team-selector')) {
                this.close();
            }
        });
    }
    
    toggle() {
        this.isOpen = !this.isOpen;
        const selector = document.querySelector('.team-selector');
        if (selector) {
            selector.classList.toggle('open', this.isOpen);
        }
    }
    
    close() {
        this.isOpen = false;
        const selector = document.querySelector('.team-selector');
        if (selector) {
            selector.classList.remove('open');
        }
    }
    
    selectTeam(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team || team.id === this.currentTeam?.id) {
            this.close();
            return;
        }
        
        this.currentTeam = team;
        localStorage.setItem('observability_current_team', JSON.stringify(team));
        
        if (window.stateManager) {
            stateManager.set('currentTeam', team);
        }
        
        // Emit event
        if (window.eventBus) {
            eventBus.emit('team:changed', team);
        }
        
        // Callback
        if (this.onTeamChange) {
            this.onTeamChange(team);
        }
        
        // Show notification
        if (window.notificationManager) {
            notificationManager.success(`Switched to ${team.name}`);
        }
        
        this.close();
        this.render();
        this.attachEventListeners();
    }
    
    getCurrentTeam() {
        return this.currentTeam;
    }
    
    getTeamId() {
        return this.currentTeam?.id || null;
    }
}

// Make it globally available
window.TeamSelector = TeamSelector;

