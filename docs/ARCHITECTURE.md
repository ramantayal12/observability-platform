# ObserveX Architecture

## Overview

ObserveX is a scalable observability platform designed to handle enterprise-level traffic (PayPal-scale). The architecture uses a polyglot persistence approach with specialized databases for different data types.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NGINX (Port 3000)                               │
│                         Reverse Proxy + Load Balancer                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Static Files (Frontend)  │  /api/* → Backend Servers (upstream pool)       │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Spring Boot Backend (Port 8080)                       │
│                              REST API Layer                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  TeamDataController (v1)  │  ClickHouseDataController (v2)                  │
│  MySQL-backed endpoints   │  ClickHouse-backed endpoints                    │
└─────────────────────────────────────────────────────────────────────────────┘
         │                              │                           │
         ▼                              ▼                           ▼
┌─────────────────┐    ┌─────────────────────────┐    ┌─────────────────────┐
│     MySQL       │    │       ClickHouse        │    │       Redis         │
│   (Port 3306)   │    │      (Port 8123)        │    │    (Port 6379)      │
├─────────────────┤    ├─────────────────────────┤    ├─────────────────────┤
│ • Users         │    │ • spans (traces+metrics)│    │ • Real-time cache   │
│ • Teams         │    │ • logs                  │    │ • Session data      │
│ • Organizations │    │ • incidents             │    │ • Hot aggregations  │
│ • Chart configs │    │ • Materialized views    │    │ • Rate limiting     │
│ • Alert policies│    │                         │    │                     │
└─────────────────┘    └─────────────────────────┘    └─────────────────────┘
```

## Components

### 1. NGINX (Reverse Proxy)

**Purpose:** Unified entry point for all traffic

**Features:**
- Load balancing across backend instances (least_conn algorithm)
- Static file serving for frontend
- API request proxying to backend
- Gzip compression
- Security headers
- Connection pooling (keepalive)

**Configuration:** `nginx.conf`

### 2. Spring Boot Backend

**Purpose:** REST API layer with business logic

**Endpoints:**
| Path | Version | Data Source | Description |
|------|---------|-------------|-------------|
| `/api/teams/*` | v1 | MySQL | Team data, mock data |
| `/api/v2/teams/*/metrics` | v2 | ClickHouse | Time-series metrics |
| `/api/v2/teams/*/logs` | v2 | ClickHouse | Log queries |
| `/api/v2/teams/*/traces` | v2 | ClickHouse | Distributed traces |
| `/api/v2/teams/*/incidents` | v2 | ClickHouse | Alert incidents |

### 3. ClickHouse (Time-Series Database)

**Purpose:** High-performance storage for observability data

**Tables (Simplified Schema - 3 tables):**

| Table | Purpose | TTL | Partitioning |
|-------|---------|-----|--------------|
| `spans` | Traces + spans + metrics source | 7 days | Daily + team_id |
| `logs` | Log entries | 14 days | Daily + team_id |
| `incidents` | Alert incidents | 90 days | Monthly + team_id |

**Key Design Decisions:**
- **Unified spans table:** Traces and spans merged with `is_root` flag
- **Metrics from spans:** Derived via materialized views, not stored separately
- **LowCardinality:** Used for columns with few unique values (service_name, level)
- **MergeTree engine:** Optimized for time-series queries

**Materialized Views:**
- `service_metrics_1m` - Per-service aggregations
- `endpoint_metrics_1m` - Per-endpoint aggregations  
- `log_counts_1m` - Log level counts

### 4. MySQL (Relational Database)

**Purpose:** Configuration and user data

**Tables:**
- `users` - User accounts
- `teams` - Team definitions
- `organizations` - Organization hierarchy
- `user_teams` - User-team mappings
- `chart_configs` - Dashboard configurations
- `alert_policies` - Alert rule definitions
- `services` - Service registry

### 5. Redis (Cache Layer)

**Purpose:** Real-time caching and session management

**Cache Keys:**
| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `metrics:{teamId}:{metric}` | 30s | Real-time metrics |
| `service_health:{teamId}` | 60s | Service health status |
| `log_facets:{teamId}:{range}` | 120s | Log filter facets |
| `trace_summary:{teamId}:{range}` | 120s | Trace statistics |
| `alert_counts:{teamId}` | 60s | Alert counts by status |

## Data Flow

### Write Path (Ingestion)
```
Telemetry Data → Backend API → ClickHouse (direct insert)
                            → Redis (cache invalidation)
```

### Read Path (Queries)
```
Frontend → NGINX → Backend → Redis (cache check)
                          → ClickHouse (if cache miss)
                          → Response + Cache update
```

## Scaling Strategies

### Horizontal Scaling

**Backend:**
```yaml
# docker-compose.yml - Add more backend instances
backend-1:
  build: ./observability-backend
  ...
backend-2:
  build: ./observability-backend
  ...
```

**NGINX upstream:**
```nginx
upstream backend_servers {
    least_conn;
    server backend-1:8080;
    server backend-2:8080;
    server backend-3:8080;
}
```

### ClickHouse Scaling

**Sharding by team_id:**
```sql
-- Distributed table across shards
CREATE TABLE spans_distributed AS spans
ENGINE = Distributed(cluster, observex, spans, sipHash64(team_id))
```

### Redis Scaling

**Redis Cluster for high availability:**
```yaml
redis-1:
  image: redis:7-alpine
  command: redis-server --cluster-enabled yes
redis-2:
  ...
redis-3:
  ...
```

## Deployment

### Quick Start
```bash
# Start all services
docker-compose up -d

# Generate sample data
pip install clickhouse-connect
python scripts/clickhouse_data_generator.py --clear --hours 24

# Access application
open http://localhost:3000
```

### Production Considerations

1. **SSL/TLS:** Add HTTPS termination at NGINX
2. **Secrets:** Use Docker secrets or Vault for credentials
3. **Monitoring:** Add Prometheus metrics endpoint
4. **Logging:** Centralize container logs
5. **Backups:** Configure ClickHouse and MySQL backups

## File Structure

```
observex/
├── docker-compose.yml          # Container orchestration
├── nginx.conf                  # Reverse proxy config
├── observability-backend/      # Spring Boot application
│   ├── Dockerfile
│   └── src/main/java/com/observability/
│       ├── controller/         # REST endpoints
│       ├── service/            # Business logic
│       ├── repository/         # Data access
│       │   └── clickhouse/     # ClickHouse repos
│       └── config/             # Configuration
├── observability-frontend/     # Vanilla JS frontend
│   ├── assets/js/              # Page scripts
│   ├── components/             # Reusable components
│   ├── core/                   # Shared utilities
│   └── services/               # API clients
└── scripts/
    ├── clickhouse-init/        # ClickHouse schema
    └── clickhouse_data_generator.py
```

