/**
 * FacetFilter Component
 * Reusable facet filter with checkbox-style selection and search bar
 */

class FacetFilter {
    constructor(options = {}) {
        this.containerId = options.containerId;
        this.title = options.title || 'Filter';
        this.items = options.items || []; // [{value, label, count, color?}]
        this.selectedValues = new Set(options.selectedValues || []);
        this.multiSelect = options.multiSelect !== false; // default true
        this.showSearch = options.showSearch !== false; // default true
        this.showCounts = options.showCounts !== false; // default true
        this.onChange = options.onChange || (() => {});
        this.searchQuery = '';
        
        this.container = document.getElementById(this.containerId);
        if (this.container) {
            this.render();
        }
    }

    /**
     * Update items and re-render
     */
    setItems(items) {
        this.items = items;
        this.render();
    }

    /**
     * Get selected values
     */
    getSelectedValues() {
        return Array.from(this.selectedValues);
    }

    /**
     * Set selected values
     */
    setSelectedValues(values) {
        this.selectedValues = new Set(values);
        this.render();
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedValues.clear();
        this.searchQuery = '';
        this.render();
        this.onChange(this.getSelectedValues());
    }

    /**
     * Render the component
     */
    render(updateItemsOnly = false) {
        if (!this.container) return;

        const filteredItems = this.items.filter(item => {
            if (!this.searchQuery) return true;
            return item.label.toLowerCase().includes(this.searchQuery.toLowerCase());
        });

        // If only updating items (e.g., during search), just update the items container
        if (updateItemsOnly) {
            const itemsContainer = this.container.querySelector('.facet-filter-items');
            if (itemsContainer) {
                itemsContainer.innerHTML = filteredItems.length === 0
                    ? '<div class="facet-filter-empty">No items found</div>'
                    : filteredItems.map(item => this.renderItem(item)).join('');
                this.attachItemListeners();
                return;
            }
        }

        this.container.innerHTML = `
            <div class="facet-filter">
                <div class="facet-filter-header">
                    <span class="facet-filter-title">${this.escapeHtml(this.title)}</span>
                    ${this.selectedValues.size > 0 ? `
                        <button class="facet-filter-clear" title="Clear">×</button>
                    ` : ''}
                </div>
                ${this.showSearch ? `
                    <div class="facet-filter-search">
                        <input type="text"
                               class="facet-filter-search-input"
                               placeholder="Search ${this.title.toLowerCase()}..."
                               value="${this.escapeHtml(this.searchQuery)}">
                    </div>
                ` : ''}
                <div class="facet-filter-items">
                    ${filteredItems.length === 0 ? `
                        <div class="facet-filter-empty">No items found</div>
                    ` : filteredItems.map(item => this.renderItem(item)).join('')}
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Render a single item
     */
    renderItem(item) {
        const isSelected = this.selectedValues.has(item.value);
        const colorDot = item.color ? `<span class="facet-item-dot" style="background: ${item.color}"></span>` : '';
        
        return `
            <div class="facet-filter-item ${isSelected ? 'selected' : ''}" data-value="${this.escapeHtml(item.value)}">
                <div class="facet-filter-checkbox">
                    <svg class="facet-checkbox-icon" viewBox="0 0 16 16" fill="currentColor">
                        ${isSelected ? '<path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>' : ''}
                    </svg>
                </div>
                <span class="facet-filter-label">
                    ${colorDot}
                    ${this.escapeHtml(item.label)}
                </span>
                ${this.showCounts && item.count !== undefined ? `
                    <span class="facet-filter-count">${item.count}</span>
                ` : ''}
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Search input - use 'input' event for real-time filtering
        const searchInput = this.container.querySelector('.facet-filter-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                // Only update items, keep search input focused
                this.render(true);
            });
        }

        // Clear button
        const clearBtn = this.container.querySelector('.facet-filter-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSelection());
        }

        // Attach item listeners
        this.attachItemListeners();
    }

    /**
     * Attach item click listeners (separated for partial updates)
     */
    attachItemListeners() {
        this.container.querySelectorAll('.facet-filter-item').forEach(item => {
            item.addEventListener('click', () => {
                const value = item.dataset.value;
                this.toggleItem(value);
            });
        });
    }

    /**
     * Toggle item selection
     */
    toggleItem(value) {
        if (this.selectedValues.has(value)) {
            this.selectedValues.delete(value);
        } else {
            if (!this.multiSelect) {
                this.selectedValues.clear();
            }
            this.selectedValues.add(value);
        }
        this.render();
        this.onChange(this.getSelectedValues());
    }

    /**
     * Escape HTML
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.FacetFilter = FacetFilter;
}

