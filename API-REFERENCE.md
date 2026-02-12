# ObserveX API Reference

Complete API reference with ready-to-use curl commands.

---

## 🔐 Authentication

### 1. Login
Get JWT token for authentication.

```bash
# Login
curl -X POST http://localhost:18080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@observex.io",
    "password": "demo123"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "user": { ... }
#   }
# }

# Save token for subsequent requests
export TOKEN="<your-token-here>"
```

### 2. Get Current User Context
```bash
curl -X GET http://localhost:18080/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Core APIs (Minimum Essential)

### 3. Get Dashboard Overview
**Main dashboard data - metrics, logs, traces summary**

```bash
# Get overview for last 1 hour
END_TIME=$(date +%s)000
START_TIME=$((END_TIME - 3600000))

curl -X GET "http://localhost:18080/api/dashboard/overview?startTime=${START_TIME}&endTime=${END_TIME}" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Get Teams
**List all teams for current user**

```bash
curl -X GET http://localhost:18080/api/teams/my-teams \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📥 Data Ingestion

### 5. Ingest Spans (Traces)
**Send trace/span data to ClickHouse**

```bash
curl -X POST http://localhost:18080/api/ingest/spans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "traceId": "trace-123",
      "spanId": "span-456",
      "parentSpanId": null,
      "serviceName": "api-gateway",
      "operationName": "GET /api/users",
      "startTime": "2026-02-12T10:00:00Z",
      "endTime": "2026-02-12T10:00:00.150Z",
      "durationMs": 150,
      "status": "OK",
      "httpMethod": "GET",
      "httpStatusCode": 200,
      "httpUrl": "/api/users",
      "isRoot": true
    }
  ]'
```

### 6. Ingest Logs
**Send log data to ClickHouse**

```bash
curl -X POST http://localhost:18080/api/ingest/logs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "timestamp": "2026-02-12T10:00:00Z",
      "level": "INFO",
      "serviceName": "api-gateway",
      "logger": "com.example.ApiController",
      "message": "User request processed successfully",
      "traceId": "trace-123",
      "spanId": "span-456"
    }
  ]'
```

---

## 📈 Query APIs (ClickHouse Data)

### 7. Get Service Metrics
**Query metrics derived from spans**

```bash
# Get metrics for specific team (use team UUID from /api/teams/my-teams)
TEAM_UUID="00000000-0000-0000-0000-000000000034"
END_TIME=$(date +%s)000
START_TIME=$((END_TIME - 3600000))

curl -X GET "http://localhost:18080/api/clickhouse/teams/${TEAM_UUID}/services/metrics?startTime=${START_TIME}&endTime=${END_TIME}" \
  -H "Authorization: Bearer $TOKEN"
```

### 8. Get Logs
**Query logs from ClickHouse**

```bash
TEAM_UUID="00000000-0000-0000-0000-000000000034"
END_TIME=$(date +%s)000
START_TIME=$((END_TIME - 3600000))

curl -X GET "http://localhost:18080/api/clickhouse/teams/${TEAM_UUID}/logs?startTime=${START_TIME}&endTime=${END_TIME}&limit=100" \
  -H "Authorization: Bearer $TOKEN"
```

### 9. Get Traces
**Query traces from ClickHouse**

```bash
TEAM_UUID="00000000-0000-0000-0000-000000000034"
END_TIME=$(date +%s)000
START_TIME=$((END_TIME - 3600000))

curl -X GET "http://localhost:18080/api/clickhouse/teams/${TEAM_UUID}/traces?startTime=${START_TIME}&endTime=${END_TIME}&limit=100" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔧 Complete Test Flow

### Step 1: Login and Get Token
```bash
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:18080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@observex.io", "password": "demo123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
echo "Token: $TOKEN"
```

### Step 2: Get Your Teams
```bash
TEAMS=$(curl -s -X GET http://localhost:18080/api/teams/my-teams \
  -H "Authorization: Bearer $TOKEN")

echo $TEAMS | jq '.'

# Extract first team ID
TEAM_ID=$(echo $TEAMS | jq -r '.data[0].id')
TEAM_UUID=$(printf "00000000-0000-0000-0000-%012d" $TEAM_ID)
echo "Team UUID: $TEAM_UUID"
```

### Step 3: Ingest Sample Data
```bash
# Ingest a span
curl -X POST http://localhost:18080/api/ingest/spans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "[{
    \"traceId\": \"test-trace-$(date +%s)\",
    \"spanId\": \"test-span-$(date +%s)\",
    \"serviceName\": \"test-service\",
    \"operationName\": \"GET /test\",
    \"startTime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"endTime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"durationMs\": 100,
    \"status\": \"OK\",
    \"httpMethod\": \"GET\",
    \"httpStatusCode\": 200,
    \"isRoot\": true
  }]"
```

### Step 4: Query Dashboard
```bash
END_TIME=$(date +%s)000
START_TIME=$((END_TIME - 3600000))

curl -s -X GET "http://localhost:18080/api/dashboard/overview?startTime=${START_TIME}&endTime=${END_TIME}" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Step 5: Query ClickHouse Data
```bash
# Get service metrics
curl -s -X GET "http://localhost:18080/api/clickhouse/teams/${TEAM_UUID}/services/metrics?startTime=${START_TIME}&endTime=${END_TIME}" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## 📋 API Summary

| Category | Endpoint | Method | Purpose |
|----------|----------|--------|---------|
| **Auth** | `/api/auth/login` | POST | Login and get JWT token |
| **Auth** | `/api/auth/me` | GET | Get current user context |
| **Teams** | `/api/teams/my-teams` | GET | Get user's teams |
| **Dashboard** | `/api/dashboard/overview` | GET | Main dashboard data |
| **Ingest** | `/api/ingest/spans` | POST | Ingest traces/spans |
| **Ingest** | `/api/ingest/logs` | POST | Ingest logs |
| **Query** | `/api/clickhouse/teams/{uuid}/services/metrics` | GET | Service metrics |
| **Query** | `/api/clickhouse/teams/{uuid}/logs` | GET | Query logs |
| **Query** | `/api/clickhouse/teams/{uuid}/traces` | GET | Query traces |

---

## 🎯 Current API Structure

**Total:** 8 controllers

### Core Controllers (Essential - Keep):
1. ✅ **AuthController** (`/api/auth`) - Login, user context
2. ✅ **DashboardController** (`/api/dashboard`) - Dashboard overview
3. ✅ **ClickHouseDataController** (`/api/v2`) - Granular ClickHouse queries
4. ✅ **TelemetryIngestionController** (`/api/ingest`) - Ingest spans/logs
5. ✅ **TeamController** (`/api/teams`) - List user teams

### Optional Controllers (Can Remove Later):
6. ⚠️ **OrganizationController** - Not needed for single-org
7. ⚠️ **UserController** - Covered by AuthController
8. ⚠️ **AlertController** - Not fully implemented

**Note:** ClickHouseDataController provides granular queries (logs, traces, metrics by service/endpoint) while DashboardController provides aggregated views. Both are useful.


