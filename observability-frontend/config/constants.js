/**
 * Application Constants
 * Centralized configuration for the entire application
 */

const AppConfig = {
    // API Configuration
    API: {
        BASE_URL: 'http://localhost:8080/api',
        // Use mock endpoints from backend (set to 'real' to use actual telemetry data)
        MODE: 'mock', // 'mock' or 'real'
        ENDPOINTS: {
            // Mock endpoints (generated data from backend)
            MOCK: {
                OVERVIEW: '/mock/overview',
                METRICS: '/mock/metrics',
                LOGS: '/mock/logs',
                TRACES: '/mock/traces',
                SERVICES: '/mock/services'
            },
            // Real endpoints (actual telemetry data from database)
            REAL: {
                OVERVIEW: '/dashboard/overview',
                METRICS: '/dashboard/metrics',
                LOGS: '/dashboard/logs',
                TRACES: '/dashboard/traces',
                SERVICES: '/dashboard/services'
            }
        },
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3
    },

    // UI Configuration
    UI: {
        // Datadog-style spacing system (8px base unit)
        SPACING: {
            XXS: '4px',   // 0.5 unit
            XS: '8px',    // 1 unit
            SM: '12px',   // 1.5 units
            MD: '16px',   // 2 units
            LG: '24px',   // 3 units
            XL: '32px',   // 4 units
            XXL: '48px',  // 6 units
            XXXL: '64px'  // 8 units
        },
        
        // Grid system
        GRID: {
            COLUMNS: 12,
            GAP: '20px',
            CONTAINER_MAX_WIDTH: '1920px'
        },

        // Animation durations
        ANIMATION: {
            FAST: '150ms',
            NORMAL: '250ms',
            SLOW: '350ms'
        },

        // Z-index layers
        Z_INDEX: {
            DROPDOWN: 1000,
            STICKY: 1020,
            MODAL_BACKDROP: 1040,
            MODAL: 1050,
            POPOVER: 1060,
            TOOLTIP: 1070,
            NOTIFICATION: 1080
        }
    },

    // Data Configuration
    DATA: {
        REFRESH_INTERVAL: 30000, // 30 seconds
        MAX_DATA_POINTS: 100,
        MAX_LOGS: 1000,
        MAX_TRACES: 100,
        DEBOUNCE_DELAY: 300
    },

    // Time Ranges
    TIME_RANGES: [
        { label: 'Last 5 minutes', value: 5 * 60 * 1000, key: '5m' },
        { label: 'Last 15 minutes', value: 15 * 60 * 1000, key: '15m' },
        { label: 'Last 30 minutes', value: 30 * 60 * 1000, key: '30m' },
        { label: 'Last 1 hour', value: 60 * 60 * 1000, key: '1h' },
        { label: 'Last 3 hours', value: 3 * 60 * 60 * 1000, key: '3h' },
        { label: 'Last 6 hours', value: 6 * 60 * 60 * 1000, key: '6h' },
        { label: 'Last 12 hours', value: 12 * 60 * 60 * 1000, key: '12h' },
        { label: 'Last 24 hours', value: 24 * 60 * 60 * 1000, key: '24h' },
        { label: 'Last 2 days', value: 2 * 24 * 60 * 60 * 1000, key: '2d' },
        { label: 'Last 7 days', value: 7 * 24 * 60 * 60 * 1000, key: '7d' }
    ],

    // Chart Colors (Datadog-inspired)
    COLORS: {
        PRIMARY: '#774FF8',
        SUCCESS: '#12B76A',
        WARNING: '#F79009',
        ERROR: '#F04438',
        INFO: '#0BA5EC',
        
        CHART: {
            BLUE: '#5E60CE',
            GREEN: '#73C991',
            YELLOW: '#F2CC0C',
            ORANGE: '#FF8C42',
            RED: '#F77F00',
            PURPLE: '#9E77ED',
            CYAN: '#06AED5',
            PINK: '#F72585'
        },

        BACKGROUND: {
            PRIMARY: '#0F1117',
            SECONDARY: '#1A1D26',
            TERTIARY: '#24272F',
            HOVER: '#2D3139'
        },

        TEXT: {
            PRIMARY: '#E4E7EB',
            SECONDARY: '#9FA6B2',
            TERTIARY: '#6E7781',
            MUTED: '#4D5562'
        },

        BORDER: {
            PRIMARY: '#2D3139',
            SECONDARY: '#24272F',
            HOVER: '#3D4149'
        }
    },

    // Widget Types
    WIDGET_TYPES: {
        TIMESERIES: {
            id: 'timeseries',
            name: 'Timeseries',
            icon: 'chart-line',
            defaultSize: 'medium'
        },
        STAT: {
            id: 'stat',
            name: 'Stat',
            icon: 'hash',
            defaultSize: 'small'
        },
        TABLE: {
            id: 'table',
            name: 'Table',
            icon: 'table',
            defaultSize: 'large'
        },
        HEATMAP: {
            id: 'heatmap',
            name: 'Heatmap',
            icon: 'grid',
            defaultSize: 'medium'
        },
        GAUGE: {
            id: 'gauge',
            name: 'Gauge',
            icon: 'gauge',
            defaultSize: 'small'
        }
    },

    // Metrics
    METRICS: {
        'api.latency': { name: 'API Latency', unit: 'ms', type: 'latency' },
        'service.latency': { name: 'Service Latency', unit: 'ms', type: 'latency' },
        'throughput': { name: 'Throughput', unit: 'req/min', type: 'rate' },
        'error.rate': { name: 'Error Rate', unit: 'errors/min', type: 'rate' },
        'cpu.usage': { name: 'CPU Usage', unit: '%', type: 'percentage' },
        'memory.usage': { name: 'Memory Usage', unit: '%', type: 'percentage' },
        'disk.io': { name: 'Disk I/O', unit: 'MB/s', type: 'rate' },
        'network.traffic': { name: 'Network Traffic', unit: 'MB/s', type: 'rate' }
    },

    // Aggregation Methods
    AGGREGATIONS: [
        { value: 'avg', label: 'Average' },
        { value: 'sum', label: 'Sum' },
        { value: 'min', label: 'Minimum' },
        { value: 'max', label: 'Maximum' },
        { value: 'p50', label: 'P50 (Median)' },
        { value: 'p90', label: 'P90' },
        { value: 'p95', label: 'P95' },
        { value: 'p99', label: 'P99' },
        { value: 'count', label: 'Count' }
    ],

    // Log Levels
    LOG_LEVELS: ['DEBUG', 'INFO', 'WARN', 'ERROR'],

    // Storage Keys
    STORAGE: {
        DASHBOARDS: 'observability_dashboards',
        PREFERENCES: 'observability_preferences',
        AUTO_REFRESH: 'observability_auto_refresh',
        TIME_RANGE: 'observability_time_range',
        THEME: 'observability_theme'
    },

    // Routes/Pages
    PAGES: {
        OVERVIEW: { path: 'index.html', title: 'Overview' },
        DASHBOARDS: { path: 'dashboards.html', title: 'Dashboards' },
        METRICS: { path: 'metrics.html', title: 'Metrics' },
        LOGS: { path: 'logs.html', title: 'Logs' },
        TRACES: { path: 'traces.html', title: 'Traces' },
        SERVICES: { path: 'services.html', title: 'Services' },
        ALERTS: { path: 'alerts.html', title: 'Alerts' }
    }
};

// Freeze configuration to prevent modifications
Object.freeze(AppConfig);

// Global API config for services
window.API_CONFIG = {
    BASE_URL: AppConfig.API.BASE_URL
};

