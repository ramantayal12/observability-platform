# Setup Guide

## Quick Start

```bash
# Open the application
open observability-frontend/pages/index.html
```

**✅ Mock data enabled - Graphs display realistic data immediately!**
**✅ Time range selector working - Change from 5 minutes to 7 days**

## Mock Data vs Real Backend

The application is configured to use **mock data** by default, so you can see charts and data immediately without running the backend.

### Using Mock Data (Default - ✅ ENABLED)

In `config/constants.js`:
```javascript
USE_MOCK_DATA: true  // ✅ Currently enabled
```

**What you get:**
- ✅ No backend required
- ✅ Instant data visualization with realistic charts
- ✅ All 7 pages fully functional
- ✅ Auto-refreshing data
- ✅ Perfect for development and demos

### Using Real Backend

To connect to the actual backend:

1. Set `USE_MOCK_DATA: false` in `config/constants.js`
2. Start the backend:
   ```bash
   cd observability-backend
   mvn spring-boot:run
   ```
3. Refresh the frontend

## All Pages Working

All pages work with both mock and real data:

- **Overview** - System health dashboard with 4 live charts
- **Dashboards** - Custom dashboard builder
- **Metrics** - Metrics exploration with filters
- **Logs** - Real-time log viewer
- **Traces** - Distributed tracing
- **Services** - Service health monitoring
- **Alerts** - Alert management

## Configuration

Edit `config/constants.js` to customize:
- API URL
- Mock data toggle
- Refresh intervals
- Chart colors
- Time ranges

