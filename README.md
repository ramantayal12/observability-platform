# ObserveX - Observability Platform

A multi-tenant observability platform with metrics, traces, logs, and real-time dashboards.

## Quick Start

### 1. Start MySQL Database
Ensure MySQL is running with database `metabase` (user: `metabase`, password: `metabasepass`).

### 2. Generate Sample Data
```bash
cd scripts
python3 -m venv venv
source venv/bin/activate
pip install mysql-connector-python
python3 data_generator.py --clear
```

### 3. Start Backend
```bash
cd observability-backend
mvn spring-boot:run
```
Backend runs on `http://localhost:8080`

### 4. Open Frontend
```bash
cd observability-frontend
python3 -m http.server 3000
```
Open `http://localhost:3000`

## Project Structure

```
├── observability-backend/    # Spring Boot API (Java 17)
├── observability-frontend/   # Web dashboard (Vanilla JS + Chart.js)
└── scripts/
    └── data_generator.py     # Python script to generate all mock data
```

## Data Generator

The Python script generates all observability data:

| Data | Description |
|------|-------------|
| Organizations | Multi-tenant org structure |
| Teams | Platform, Backend, Frontend teams |
| Users | Demo user with team access |
| Services | 4 services per team |
| Traces & Spans | Distributed tracing data |
| Logs | Application logs |
| Metrics | Performance metrics |
| Chart Configs | Dashboard chart settings |
| API Endpoints | Team-specific endpoints |

```bash
# Regenerate all data
python3 data_generator.py --clear

# Custom database connection
python3 data_generator.py --host localhost --port 3306 --database metabase
```

## API Endpoints

All endpoints require `X-User-Id` and `X-Team-Id` headers for team access validation.

| Endpoint | Description |
|----------|-------------|
| `GET /api/teams/{id}/data/overview` | Dashboard overview data |
| `GET /api/teams/{id}/data/metrics` | Metrics with chart configs |
| `GET /api/teams/{id}/data/logs` | Log entries |
| `GET /api/teams/{id}/data/traces` | Distributed traces |

## Technologies

- **Backend**: Spring Boot 3.2, Java 17, MySQL, JPA/Hibernate
- **Frontend**: Vanilla JavaScript, Chart.js
- **Data**: Python 3 for data generation
