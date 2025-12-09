/**
 * NotificationManager - Toast notification system
 * Datadog-style notifications with auto-dismiss and stacking
 */

class NotificationManager extends BaseComponent {
    constructor() {
        super(null);
        this.notifications = [];
        this.container = null;
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
    }

    async beforeInit() {
        this.createContainer();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        this.container.style.cssText = `
            position: fixed;
            top: ${AppConfig.UI.SPACING.LG};
            right: ${AppConfig.UI.SPACING.LG};
            z-index: ${AppConfig.UI.Z_INDEX.NOTIFICATION};
            display: flex;
            flex-direction: column;
            gap: ${AppConfig.UI.SPACING.SM};
            max-width: 400px;
        `;
        document.body.appendChild(this.container);
        this.element = this.container;
    }

    subscribeToState() {
        this.subscribeEvent(Events.NOTIFICATION_SHOW, this.show.bind(this));
        this.subscribeEvent(Events.DATA_ERROR, (data) => {
            this.error(`Failed to load ${data.type}: ${data.error.message}`);
        });
    }

    /**
     * Show notification
     * @param {Object} options - Notification options
     */
    show(options) {
        const {
            message,
            type = 'info',
            duration = this.defaultDuration,
            action = null
        } = typeof options === 'string' ? { message: options } : options;

        const id = Date.now() + Math.random();
        const notification = this.createNotification(id, message, type, action);

        this.notifications.push({ id, element: notification, type });
        this.container.appendChild(notification);

        // Limit notifications
        if (this.notifications.length > this.maxNotifications) {
            this.dismiss(this.notifications[0].id);
        }

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }

        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        return id;
    }

    /**
     * Create notification element
     */
    createNotification(id, message, type, action) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.dataset.id = id;
        notification.style.cssText = `
            background: var(--bg-tertiary);
            border: 1px solid var(--border-primary);
            border-left: 3px solid ${this.getTypeColor(type)};
            border-radius: 8px;
            padding: ${AppConfig.UI.SPACING.MD};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: flex-start;
            gap: ${AppConfig.UI.SPACING.SM};
            transform: translateX(calc(100% + ${AppConfig.UI.SPACING.LG}));
            transition: transform ${AppConfig.UI.ANIMATION.NORMAL} ease;
            cursor: pointer;
        `;

        // Icon
        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        icon.innerHTML = this.getTypeIcon(type);
        icon.style.cssText = `
            flex-shrink: 0;
            width: 20px;
            height: 20px;
            color: ${this.getTypeColor(type)};
        `;

        // Content
        const content = document.createElement('div');
        content.className = 'notification-content';
        content.style.cssText = `
            flex: 1;
            font-size: 14px;
            line-height: 1.5;
            color: var(--text-primary);
        `;
        content.textContent = message;

        // Action button
        if (action) {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'notification-action';
            actionBtn.textContent = action.label;
            actionBtn.style.cssText = `
                background: transparent;
                border: none;
                color: ${this.getTypeColor(type)};
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: background ${AppConfig.UI.ANIMATION.FAST} ease;
            `;
            actionBtn.onclick = (e) => {
                e.stopPropagation();
                action.onClick();
                this.dismiss(id);
            };
            content.appendChild(actionBtn);
        }

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            flex-shrink: 0;
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-size: 20px;
            line-height: 1;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            transition: color ${AppConfig.UI.ANIMATION.FAST} ease;
        `;
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.dismiss(id);
        };

        notification.appendChild(icon);
        notification.appendChild(content);
        notification.appendChild(closeBtn);

        // Click to dismiss
        notification.onclick = () => this.dismiss(id);

        return notification;
    }

    /**
     * Dismiss notification
     */
    dismiss(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index === -1) return;

        const { element } = this.notifications[index];
        element.classList.remove('show');

        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.notifications.splice(index, 1);
        }, 250);
    }

    /**
     * Dismiss all notifications
     */
    dismissAll() {
        this.notifications.forEach(({ id }) => this.dismiss(id));
    }

    /**
     * Show success notification
     */
    success(message, options = {}) {
        return this.show({ message, type: 'success', ...options });
    }

    /**
     * Show error notification
     */
    error(message, options = {}) {
        return this.show({ message, type: 'error', duration: 0, ...options });
    }

    /**
     * Show warning notification
     */
    warning(message, options = {}) {
        return this.show({ message, type: 'warning', ...options });
    }

    /**
     * Show info notification
     */
    info(message, options = {}) {
        return this.show({ message, type: 'info', ...options });
    }

    /**
     * Get type color
     */
    getTypeColor(type) {
        const colors = {
            success: AppConfig.COLORS.SUCCESS,
            error: AppConfig.COLORS.ERROR,
            warning: AppConfig.COLORS.WARNING,
            info: AppConfig.COLORS.INFO
        };
        return colors[type] || colors.info;
    }

    /**
     * Get type icon
     */
    getTypeIcon(type) {
        const icons = {
            success: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
            error: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
            warning: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
            info: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>'
        };
        return icons[type] || icons.info;
    }

    /**
     * Singleton accessor
     */
    static getInstance() {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
        }
        return NotificationManager.instance;
    }
}

// Create singleton instance
const notificationManager = NotificationManager.getInstance();

// Add CSS for show animation
const style = document.createElement('style');
style.textContent = `
    .notification.show {
        transform: translateX(0) !important;
    }
    .notification-action:hover {
        background: rgba(255, 255, 255, 0.1) !important;
    }
    .notification-close:hover {
        color: var(--text-primary) !important;
    }
`;
document.head.appendChild(style);

