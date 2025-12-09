/**
 * BaseWidget - Base class for all dashboard widgets
 * Provides common functionality for rendering, updating, and managing widgets
 */
class BaseWidget {
    constructor(config = {}) {
        this.id = config.id || this.generateId();
        this.title = config.title || 'Widget';
        this.type = config.type || 'base';
        this.metric = config.metric || null;
        this.container = null;
        this.data = null;
        this.isLoading = false;
        this.error = null;
        
        // Event bus for communication
        this.eventBus = EventBus.getInstance();
        
        // Bind methods
        this.render = this.render.bind(this);
        this.update = this.update.bind(this);
        this.destroy = this.destroy.bind(this);
    }

    /**
     * Generate unique widget ID
     */
    generateId() {
        return `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Render the widget container
     */
    render(parentElement) {
        if (!parentElement) {
            console.error('[BaseWidget] Parent element is required');
            return null;
        }

        // Create widget container
        const container = document.createElement('div');
        container.className = 'widget-card';
        container.id = `widget-${this.id}`;
        
        // Create widget structure
        container.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title">${this.title}</h3>
                <div class="widget-actions">
                    ${this.renderActions()}
                </div>
            </div>
            <div class="widget-body">
                <div class="widget-content" id="widget-content-${this.id}">
                    ${this.renderLoading()}
                </div>
            </div>
        `;

        // Append to parent
        parentElement.appendChild(container);
        this.container = container;

        // Setup event listeners
        this.setupEventListeners();

        return container;
    }

    /**
     * Render widget actions (override in subclasses)
     */
    renderActions() {
        return `
            <button class="btn btn-ghost btn-sm widget-refresh" title="Refresh">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <path d="M7 1a6 6 0 00-6 6h2a4 4 0 014-4V1zm0 12a6 6 0 006-6h-2a4 4 0 01-4 4v2z"/>
                </svg>
            </button>
            <button class="btn btn-ghost btn-sm widget-remove" title="Remove">×</button>
        `;
    }

    /**
     * Render loading state
     */
    renderLoading() {
        return '<div class="loading-spinner">Loading...</div>';
    }

    /**
     * Render error state
     */
    renderError(error) {
        return `
            <div class="widget-error">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <p>${error || 'Failed to load widget'}</p>
            </div>
        `;
    }

    /**
     * Render empty state
     */
    renderEmpty() {
        return '<div class="widget-empty">No data available</div>';
    }

    /**
     * Render widget content (override in subclasses)
     */
    renderContent(data) {
        return `<div class="widget-placeholder">Widget content for ${this.type}</div>`;
    }

    /**
     * Update widget with new data
     */
    async update(data) {
        this.data = data;
        this.error = null;
        this.isLoading = false;

        const contentContainer = document.getElementById(`widget-content-${this.id}`);
        if (!contentContainer) return;

        try {
            if (!data || (Array.isArray(data) && data.length === 0)) {
                contentContainer.innerHTML = this.renderEmpty();
            } else {
                contentContainer.innerHTML = this.renderContent(data);
                this.afterRender();
            }
        } catch (error) {
            console.error(`[${this.type}Widget] Error updating:`, error);
            this.error = error.message;
            contentContainer.innerHTML = this.renderError(error.message);
        }
    }

    /**
     * Hook called after content is rendered (override in subclasses)
     */
    afterRender() {
        // Override in subclasses for post-render logic (e.g., chart initialization)
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.container) return;

        // Refresh button
        const refreshBtn = this.container.querySelector('.widget-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.onRefresh());
        }

        // Remove button
        const removeBtn = this.container.querySelector('.widget-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.onRemove());
        }
    }

    /**
     * Handle refresh action
     */
    onRefresh() {
        this.eventBus.emit('WIDGET_REFRESH', { widgetId: this.id });
    }

    /**
     * Handle remove action
     */
    onRemove() {
        this.eventBus.emit('WIDGET_REMOVE', { widgetId: this.id });
        this.destroy();
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;
        const contentContainer = document.getElementById(`widget-content-${this.id}`);
        if (!contentContainer) return;

        if (loading) {
            contentContainer.innerHTML = this.renderLoading();
        }
    }

    /**
     * Set error state
     */
    setError(error) {
        this.error = error;
        const contentContainer = document.getElementById(`widget-content-${this.id}`);
        if (!contentContainer) return;

        contentContainer.innerHTML = this.renderError(error);
    }

    /**
     * Destroy the widget
     */
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.data = null;
    }

    /**
     * Get widget configuration
     */
    getConfig() {
        return {
            id: this.id,
            title: this.title,
            type: this.type,
            metric: this.metric
        };
    }

    /**
     * Update widget configuration
     */
    updateConfig(config) {
        if (config.title) this.title = config.title;
        if (config.metric) this.metric = config.metric;
        
        // Update header if container exists
        if (this.container) {
            const titleElement = this.container.querySelector('.widget-title');
            if (titleElement) {
                titleElement.textContent = this.title;
            }
        }
    }
}

