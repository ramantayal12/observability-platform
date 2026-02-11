# ObserveX - Observability Platform

Scalable, multi-tenant observability platform with metrics, traces, logs, and real-time dashboards.

**Stack:** Spring Boot, ClickHouse, Redis, MySQL, Vanilla JavaScript

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
```bash
brew install colima docker docker-compose
```

### Start Everything
```bash
./start-colima.sh          # Start Colima (30 sec)
./start-backend.sh         # Start backend services (2-3 min first time)
./generate-data.sh         # Generate sample data (1 min)
./start-frontend.sh        # Start frontend (10 sec)
```

### Access Application
**🌐 http://localhost:13000/pages/login.html**

**Login:** `demo@observex.io` / any password

### Stop Everything
```bash
./stop-all.sh
colima stop
```

---

## 📊 Services

| Service | Port | Purpose |
|---------|------|---------|
| Frontend (NGINX) | 13000 | Web UI + Reverse Proxy |
| Backend (Spring Boot) | 18080 | REST API |
| MySQL | 13306 | Users, Teams, Configs |
| ClickHouse HTTP | 18123 | Metrics, Logs, Traces |
| ClickHouse TCP | 19000 | Native Protocol |
| Redis | 16379 | Cache |

---

## 🔧 Useful Commands

### View Logs
```bash
docker-compose -f docker-compose.backend.yml logs -f backend
```

### Restart Backend
```bash
docker-compose -f docker-compose.backend.yml restart backend
```

### Access Databases
```bash
# MySQL
docker exec -it observex-mysql mysql -u observex -pobservex123 observex

# ClickHouse
docker exec -it observex-clickhouse clickhouse-client --user observex --password observex123

# Redis
docker exec -it observex-redis redis-cli
```

### Check Health
```bash
curl http://localhost:18080/actuator/health
```

### Test Setup
```bash
./test-setup.sh
```

### Clean Slate
```bash
./stop-all.sh
docker volume rm observability-platform_mysql_data observability-platform_clickhouse_data observability-platform_redis_data
colima delete
```

---

## 🐛 Troubleshooting

**Colima won't start? (VZ driver error)**
```bash
colima delete --force
./start-colima.sh
```

**Docker SSL certificate errors? (Corporate proxy/VPN)**
```bash
# Disconnect from VPN and try again
# Or use mobile hotspot / different network
```

**Backend won't start?**
```bash
docker-compose -f docker-compose.backend.yml logs backend
```

**Port conflicts?**
```bash
lsof -i :18080  # Check what's using backend port
lsof -i :13000  # Check what's using frontend port
```

**Need more resources?**
```bash
colima stop
colima start --cpu 4 --memory 10 --disk 50
```
