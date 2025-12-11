/**
 * Command Palette Component
 * Enterprise-level command palette with keyboard shortcuts (Cmd/Ctrl + K)
 */
(function() {
    'use strict';

    class CommandPalette {
        constructor() {
            this.isOpen = false;
            this.selectedIndex = 0;
            this.filteredCommands = [];
            this.commands = this.getCommands();
            this.init();
        }

        getCommands() {
            return [
                { id: 'nav-overview', label: 'Go to Overview', category: 'Navigation', icon: '📊', action: () => window.location.href = 'index.html', shortcut: 'G O' },
                { id: 'nav-metrics', label: 'Go to Metrics', category: 'Navigation', icon: '📈', action: () => window.location.href = 'metrics.html', shortcut: 'G M' },
                { id: 'nav-logs', label: 'Go to Logs', category: 'Navigation', icon: '📝', action: () => window.location.href = 'logs.html', shortcut: 'G L' },
                { id: 'nav-traces', label: 'Go to Traces', category: 'Navigation', icon: '🔗', action: () => window.location.href = 'traces.html', shortcut: 'G T' },
                { id: 'nav-alerts', label: 'Go to Alerts', category: 'Navigation', icon: '🔔', action: () => window.location.href = 'alerts.html', shortcut: 'G A' },
                { id: 'nav-services', label: 'Go to Services', category: 'Navigation', icon: '⚙️', action: () => window.location.href = 'services.html', shortcut: 'G S' },
                { id: 'nav-dashboards', label: 'Go to Dashboards', category: 'Navigation', icon: '📋', action: () => window.location.href = 'dashboards.html', shortcut: 'G D' },
                { id: 'action-refresh', label: 'Refresh Data', category: 'Actions', icon: '🔄', action: () => this.triggerRefresh(), shortcut: 'R' },
                { id: 'action-search-logs', label: 'Search Logs', category: 'Actions', icon: '🔍', action: () => this.goToLogsSearch(), shortcut: '/' },
                { id: 'action-search-traces', label: 'Search Traces', category: 'Actions', icon: '🔍', action: () => this.goToTracesSearch() },
                { id: 'time-5m', label: 'Set Time Range: Last 5 minutes', category: 'Time Range', icon: '⏱️', action: () => this.setTimeRange('5m') },
                { id: 'time-15m', label: 'Set Time Range: Last 15 minutes', category: 'Time Range', icon: '⏱️', action: () => this.setTimeRange('15m') },
                { id: 'time-1h', label: 'Set Time Range: Last 1 hour', category: 'Time Range', icon: '⏱️', action: () => this.setTimeRange('1h') },
                { id: 'time-24h', label: 'Set Time Range: Last 24 hours', category: 'Time Range', icon: '⏱️', action: () => this.setTimeRange('24h') },
                { id: 'filter-errors', label: 'Show Only Errors', category: 'Filters', icon: '❌', action: () => this.filterErrors() },
                { id: 'help-shortcuts', label: 'Show Keyboard Shortcuts', category: 'Help', icon: '⌨️', action: () => this.showShortcuts(), shortcut: '?' },
            ];
        }

        init() {
            this.render();
            this.bindEvents();
        }

        render() {
            const palette = document.createElement('div');
            palette.id = 'commandPalette';
            palette.className = 'command-palette';
            palette.innerHTML = `
                <div class="command-palette-backdrop"></div>
                <div class="command-palette-modal">
                    <div class="command-palette-header">
                        <svg class="command-search-icon" width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                        </svg>
                        <input type="text" class="command-input" placeholder="Type a command or search..." id="commandInput">
                        <kbd class="command-kbd">ESC</kbd>
                    </div>
                    <div class="command-palette-body" id="commandResults">
                        <!-- Commands populated here -->
                    </div>
                    <div class="command-palette-footer">
                        <span class="command-hint"><kbd>↑↓</kbd> Navigate</span>
                        <span class="command-hint"><kbd>↵</kbd> Select</span>
                        <span class="command-hint"><kbd>ESC</kbd> Close</span>
                    </div>
                </div>
            `;
            document.body.appendChild(palette);
            this.element = palette;
            this.input = document.getElementById('commandInput');
            this.results = document.getElementById('commandResults');
        }

        bindEvents() {
            // Global keyboard shortcut (Cmd/Ctrl + K)
            document.addEventListener('keydown', (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    this.toggle();
                }
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });

            // Backdrop click
            this.element.querySelector('.command-palette-backdrop').addEventListener('click', () => this.close());

            // Input handling
            this.input.addEventListener('input', () => this.filterCommands());
            this.input.addEventListener('keydown', (e) => this.handleInputKeydown(e));
        }

        toggle() {
            this.isOpen ? this.close() : this.open();
        }

        open() {
            this.isOpen = true;
            this.element.classList.add('open');
            this.input.value = '';
            this.selectedIndex = 0;
            this.filterCommands();
            setTimeout(() => this.input.focus(), 50);
        }

        close() {
            this.isOpen = false;
            this.element.classList.remove('open');
        }

        filterCommands() {
            const query = this.input.value.toLowerCase().trim();
            this.filteredCommands = query 
                ? this.commands.filter(cmd => 
                    cmd.label.toLowerCase().includes(query) || 
                    cmd.category.toLowerCase().includes(query))
                : this.commands;
            this.selectedIndex = 0;
            this.renderCommands();
        }

        renderCommands() {
            const grouped = {};
            this.filteredCommands.forEach(cmd => {
                if (!grouped[cmd.category]) grouped[cmd.category] = [];
                grouped[cmd.category].push(cmd);
            });

            let html = '';
            Object.entries(grouped).forEach(([category, commands]) => {
                html += `<div class="command-group"><div class="command-group-label">${category}</div>`;
                commands.forEach((cmd, idx) => {
                    const globalIdx = this.filteredCommands.indexOf(cmd);
                    html += `
                        <div class="command-item ${globalIdx === this.selectedIndex ? 'selected' : ''}" data-index="${globalIdx}">
                            <span class="command-icon">${cmd.icon}</span>
                            <span class="command-label">${cmd.label}</span>
                            ${cmd.shortcut ? `<kbd class="command-shortcut">${cmd.shortcut}</kbd>` : ''}
                        </div>
                    `;
                });
                html += '</div>';
            });
            this.results.innerHTML = html || '<div class="command-empty">No commands found</div>';

            // Click handlers
            this.results.querySelectorAll('.command-item').forEach(item => {
                item.addEventListener('click', () => {
                    const idx = parseInt(item.dataset.index);
                    this.executeCommand(this.filteredCommands[idx]);
                });
            });
        }

        handleInputKeydown(e) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
                this.renderCommands();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.renderCommands();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.filteredCommands[this.selectedIndex]) {
                    this.executeCommand(this.filteredCommands[this.selectedIndex]);
                }
            }
        }

        executeCommand(cmd) {
            this.close();
            if (cmd && cmd.action) cmd.action();
        }

        // Action helpers
        triggerRefresh() {
            const refreshBtn = document.getElementById('refreshBtn');
            if (refreshBtn) refreshBtn.click();
        }

        goToLogsSearch() {
            window.location.href = 'logs.html';
            setTimeout(() => {
                const searchInput = document.getElementById('logsSearchInput');
                if (searchInput) searchInput.focus();
            }, 500);
        }

        goToTracesSearch() {
            window.location.href = 'traces.html';
            setTimeout(() => {
                const searchInput = document.getElementById('traceQueryInput');
                if (searchInput) searchInput.focus();
            }, 500);
        }

        setTimeRange(range) {
            if (window.eventBus) {
                window.eventBus.emit('timeRange:changed', { range });
            }
        }

        filterErrors() {
            window.location.href = 'logs.html?level=ERROR';
        }

        showShortcuts() {
            const modal = document.createElement('div');
            modal.className = 'shortcuts-modal';
            modal.innerHTML = `
                <div class="shortcuts-backdrop"></div>
                <div class="shortcuts-content">
                    <h3>Keyboard Shortcuts</h3>
                    <div class="shortcuts-grid">
                        <div class="shortcut-item"><kbd>⌘/Ctrl + K</kbd><span>Open Command Palette</span></div>
                        <div class="shortcut-item"><kbd>G O</kbd><span>Go to Overview</span></div>
                        <div class="shortcut-item"><kbd>G M</kbd><span>Go to Metrics</span></div>
                        <div class="shortcut-item"><kbd>G L</kbd><span>Go to Logs</span></div>
                        <div class="shortcut-item"><kbd>G T</kbd><span>Go to Traces</span></div>
                        <div class="shortcut-item"><kbd>G A</kbd><span>Go to Alerts</span></div>
                        <div class="shortcut-item"><kbd>G S</kbd><span>Go to Services</span></div>
                        <div class="shortcut-item"><kbd>R</kbd><span>Refresh Data</span></div>
                        <div class="shortcut-item"><kbd>/</kbd><span>Search</span></div>
                        <div class="shortcut-item"><kbd>?</kbd><span>Show Shortcuts</span></div>
                    </div>
                    <button class="btn btn-primary" onclick="this.closest('.shortcuts-modal').remove()">Close</button>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('.shortcuts-backdrop').addEventListener('click', () => modal.remove());
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new CommandPalette());
    } else {
        new CommandPalette();
    }

    window.CommandPalette = CommandPalette;
})();

