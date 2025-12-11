/**
 * Trace Detail Page - Enterprise Waterfall View
 * Full-page trace visualization with span details
 */

(function() {
    'use strict';

    // Use PageUtils for common initialization
    if (!PageUtils.requireAuth()) return;

    // Get singleton instances using PageUtils
    const { eventBus, apiService, notificationManager } = PageUtils.getServices();

    let traceId = null;
    let traceData = null;
    let selectedSpanId = null;

    // Service colors for consistent visualization
    const serviceColors = [
        '#1CE783', '#5E60CE', '#F79009', '#0BA5EC', '#F04438',
        '#9E77ED', '#06AED5', '#F72585', '#73C991', '#FF8C42'
    ];
    const serviceColorMap = {};

    async function init() {
        console.log('Initializing Trace Detail page...');

        // Get trace ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        traceId = urlParams.get('id');

        if (!traceId) {
            showError('No trace ID provided');
            return;
        }

        // Setup UI using PageUtils
        PageUtils.setupTeamSelector();

        updateBreadcrumb();
        setupActions();
        await loadTrace();
    }

    function updateBreadcrumb() {
        const breadcrumb = document.getElementById('traceIdBreadcrumb');
        if (breadcrumb) {
            breadcrumb.textContent = traceId.substring(0, 16) + '...';
        }
    }

    function setupActions() {
        document.getElementById('copyTraceIdBtn')?.addEventListener('click', () => {
            navigator.clipboard.writeText(traceId);
            notificationManager.success('Trace ID copied to clipboard');
        });

        document.getElementById('viewLogsBtn')?.addEventListener('click', () => {
            window.location.href = `logs.html?trace-id=${traceId}`;
        });
    }

    async function loadTrace() {
        try {
            const data = await apiService.fetchTrace(traceId);
            traceData = data.trace;
            
            if (!traceData) {
                showError('Trace not found');
                return;
            }

            assignServiceColors(traceData.spans || []);
            renderTraceDetail();
        } catch (error) {
            console.error('Error loading trace:', error);
            showError('Failed to load trace');
        }
    }

    function assignServiceColors(spans) {
        const services = [...new Set(spans.map(s => s.serviceName))];
        services.forEach((service, i) => {
            serviceColorMap[service] = serviceColors[i % serviceColors.length];
        });
    }

    function showError(message) {
        const page = document.getElementById('traceDetailPage');
        page.innerHTML = `
            <div class="trace-error">
                <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
                <h3>${message}</h3>
                <a href="traces.html" class="btn btn-primary">Back to Traces</a>
            </div>
        `;
    }

    function renderTraceDetail() {
        const page = document.getElementById('traceDetailPage');
        const spans = traceData.spans || [];
        const duration = traceData.duration || 0;
        const timestamp = new Date(traceData.timestamp);

        page.innerHTML = `
            <div class="trace-detail-header-section">
                <div class="trace-title-row">
                    <div class="trace-title">
                        <span class="trace-status ${traceData.error ? 'error' : 'success'}">
                            ${traceData.error ? '✕' : '✓'}
                        </span>
                        <h1>${escapeHtml(traceData.operationName)}</h1>
                    </div>
                    <div class="trace-meta-badges">
                        <span class="meta-badge">${escapeHtml(traceData.serviceName)}</span>
                        <span class="meta-badge">${spans.length} spans</span>
                        <span class="meta-badge duration">${duration.toFixed(2)}ms</span>
                    </div>
                </div>
                <div class="trace-meta-row">
                    <div class="trace-meta-item">
                        <span class="meta-label">Trace ID</span>
                        <code class="meta-value">${traceData.traceId}</code>
                    </div>
                    <div class="trace-meta-item">
                        <span class="meta-label">Start Time</span>
                        <span class="meta-value">${timestamp.toLocaleString()}</span>
                    </div>
                    <div class="trace-meta-item">
                        <span class="meta-label">Duration</span>
                        <span class="meta-value">${duration.toFixed(2)}ms</span>
                    </div>
                </div>
            </div>
            
            <div class="trace-detail-body">
                <div class="waterfall-section">
                    ${renderServiceLegend(spans)}
                    ${renderTimelineHeader(duration)}
                    <div class="waterfall-spans" id="waterfallSpans">
                        ${renderWaterfallSpans(spans, duration)}
                    </div>
                </div>
                <div class="span-detail-section" id="spanDetailSection">
                    <div class="span-detail-placeholder">
                        <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                            <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                        </svg>
                        <p>Select a span to view details</p>
                    </div>
                </div>
            </div>
        `;

        setupSpanClickHandlers();
    }

    function renderServiceLegend(spans) {
        const services = [...new Set(spans.map(s => s.serviceName))];
        return `
            <div class="service-legend">
                ${services.map(service => `
                    <div class="legend-item">
                        <span class="legend-color" style="background: ${serviceColorMap[service]}"></span>
                        <span class="legend-label">${escapeHtml(service)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderTimelineHeader(duration) {
        const intervals = 5;
        const step = duration / intervals;
        return `
            <div class="timeline-header">
                <div class="timeline-label-col"></div>
                <div class="timeline-ruler">
                    ${Array.from({length: intervals + 1}, (_, i) => `
                        <span class="ruler-mark" style="left: ${(i / intervals) * 100}%">
                            ${(step * i).toFixed(0)}ms
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderWaterfallSpans(spans, totalDuration) {
        const traceStart = traceData.timestamp;

        return spans.map((span, index) => {
            const spanStart = span.startTime || traceStart;
            const spanDuration = span.duration || 0;
            const offset = ((spanStart - traceStart) / totalDuration) * 100;
            const width = Math.max((spanDuration / totalDuration) * 100, 0.5);
            const color = serviceColorMap[span.serviceName] || '#1CE783';
            const depth = span.depth || 0;

            return `
                <div class="waterfall-row ${span.error ? 'has-error' : ''}"
                     data-span-id="${span.spanId}"
                     data-span-index="${index}">
                    <div class="span-label-col" style="padding-left: ${depth * 16 + 8}px">
                        <span class="span-expand-icon">${depth > 0 ? '└' : '●'}</span>
                        <span class="span-service-name" style="color: ${color}">${escapeHtml(span.serviceName)}</span>
                        <span class="span-op-name">${escapeHtml(span.operationName)}</span>
                    </div>
                    <div class="span-timeline-col">
                        <div class="span-bar-wrapper">
                            <div class="span-bar"
                                 style="left: ${offset}%; width: ${width}%; background: ${color};">
                            </div>
                            <span class="span-duration-label" style="left: ${offset + width + 0.5}%">
                                ${spanDuration.toFixed(1)}ms
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function setupSpanClickHandlers() {
        document.querySelectorAll('.waterfall-row').forEach(row => {
            row.addEventListener('click', () => {
                const spanIndex = parseInt(row.dataset.spanIndex);
                selectSpan(spanIndex);
            });
        });
    }

    function selectSpan(index) {
        const spans = traceData.spans || [];
        const span = spans[index];
        if (!span) return;

        selectedSpanId = span.spanId;

        // Update selection UI
        document.querySelectorAll('.waterfall-row').forEach(row => {
            row.classList.toggle('selected', row.dataset.spanIndex === String(index));
        });

        renderSpanDetail(span);
    }

    function renderSpanDetail(span) {
        const section = document.getElementById('spanDetailSection');
        const color = serviceColorMap[span.serviceName] || '#1CE783';
        const tags = span.tags || {};
        const logs = span.logs || [];

        section.innerHTML = `
            <div class="span-detail-header">
                <div class="span-detail-title">
                    <span class="span-status ${span.error ? 'error' : 'success'}">
                        ${span.error ? '✕' : '✓'}
                    </span>
                    <h3>${escapeHtml(span.operationName)}</h3>
                </div>
                <button class="btn btn-icon btn-sm" id="closeSpanDetail">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                </button>
            </div>

            <div class="span-detail-content">
                <div class="span-info-grid">
                    <div class="span-info-item">
                        <span class="info-label">Service</span>
                        <span class="info-value" style="color: ${color}">${escapeHtml(span.serviceName)}</span>
                    </div>
                    <div class="span-info-item">
                        <span class="info-label">Duration</span>
                        <span class="info-value">${(span.duration || 0).toFixed(2)}ms</span>
                    </div>
                    <div class="span-info-item">
                        <span class="info-label">Span ID</span>
                        <code class="info-value">${span.spanId}</code>
                    </div>
                    <div class="span-info-item">
                        <span class="info-label">Parent ID</span>
                        <code class="info-value">${span.parentSpanId || 'None (root)'}</code>
                    </div>
                </div>

                <div class="span-section">
                    <h4>Attributes</h4>
                    <div class="attributes-table">
                        ${Object.entries(tags).length > 0 ? Object.entries(tags).map(([key, value]) => `
                            <div class="attribute-row">
                                <span class="attr-key">${escapeHtml(key)}</span>
                                <span class="attr-value">${escapeHtml(String(value))}</span>
                            </div>
                        `).join('') : '<div class="no-data">No attributes</div>'}
                    </div>
                </div>

                ${logs.length > 0 ? `
                    <div class="span-section">
                        <h4>Events</h4>
                        <div class="span-events">
                            ${logs.map(log => `
                                <div class="span-event">
                                    <span class="event-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
                                    <span class="event-message">${escapeHtml(log.message || log.event)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        document.getElementById('closeSpanDetail')?.addEventListener('click', () => {
            section.innerHTML = `
                <div class="span-detail-placeholder">
                    <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/>
                        <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                    </svg>
                    <p>Select a span to view details</p>
                </div>
            `;
            document.querySelectorAll('.waterfall-row').forEach(row => row.classList.remove('selected'));
        });
    }

    // Use PageUtils for common helper functions
    const escapeHtml = PageUtils.escapeHtml;
    const formatDuration = PageUtils.formatDuration;
    const getDurationColor = PageUtils.getDurationColor;

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
