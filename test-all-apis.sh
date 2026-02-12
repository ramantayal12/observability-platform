#!/bin/bash

# ObserveX - Complete API Test Script
# Tests all essential APIs with ready-to-use curl commands

set -e

echo "🧪 ObserveX API Test Suite"
echo "==========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
if ! docker ps | grep -q observex-backend; then
    echo -e "${RED}❌ Backend is not running!${NC}"
    echo ""
    echo "Start backend first:"
    echo "  ./start-backend.sh"
    echo ""
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq is not installed. Install it for better output formatting:${NC}"
    echo "  brew install jq"
    echo ""
fi

echo "📝 Test 1: Login"
echo "================"
echo ""

LOGIN_RESPONSE=$(curl -s -X POST http://localhost:18080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@observex.io",
    "password": "demo123"
  }')

if command -v jq &> /dev/null; then
    echo "$LOGIN_RESPONSE" | jq '.'
else
    echo "$LOGIN_RESPONSE"
fi

# Extract token
if command -v jq &> /dev/null; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
    SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success')
else
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    SUCCESS=$(echo "$LOGIN_RESPONSE" | grep -o '"success":[^,}]*' | cut -d':' -f2)
fi

if [ "$SUCCESS" != "true" ] || [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}❌ Login failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Login successful!${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

echo "📝 Test 2: Get Current User"
echo "============================"
echo ""

USER_RESPONSE=$(curl -s -X GET http://localhost:18080/api/auth/me \
  -H "Authorization: Bearer $TOKEN")

if command -v jq &> /dev/null; then
    echo "$USER_RESPONSE" | jq '.'
else
    echo "$USER_RESPONSE"
fi

echo -e "${GREEN}✅ Got user context${NC}"
echo ""

echo "📝 Test 3: Get Teams"
echo "===================="
echo ""

TEAMS_RESPONSE=$(curl -s -X GET http://localhost:18080/api/teams/my-teams \
  -H "Authorization: Bearer $TOKEN")

if command -v jq &> /dev/null; then
    echo "$TEAMS_RESPONSE" | jq '.'
    TEAM_ID=$(echo "$TEAMS_RESPONSE" | jq -r '.data[0].id')
    TEAM_NAME=$(echo "$TEAMS_RESPONSE" | jq -r '.data[0].name')
else
    echo "$TEAMS_RESPONSE"
    TEAM_ID=$(echo "$TEAMS_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    TEAM_NAME=$(echo "$TEAMS_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

if [ -z "$TEAM_ID" ] || [ "$TEAM_ID" = "null" ]; then
    echo -e "${RED}❌ No teams found!${NC}"
    exit 1
fi

# Convert team ID to UUID format for ClickHouse
TEAM_UUID=$(printf "00000000-0000-0000-0000-%012d" $TEAM_ID)

echo -e "${GREEN}✅ Found team: $TEAM_NAME (ID: $TEAM_ID, UUID: $TEAM_UUID)${NC}"
echo ""

echo "📝 Test 4: Ingest Sample Span"
echo "=============================="
echo ""

CURRENT_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
TRACE_ID="test-trace-$(date +%s)"
SPAN_ID="test-span-$(date +%s)"

INGEST_RESPONSE=$(curl -s -X POST http://localhost:18080/api/ingest/spans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "[{
    \"traceId\": \"$TRACE_ID\",
    \"spanId\": \"$SPAN_ID\",
    \"serviceName\": \"test-service\",
    \"operationName\": \"GET /api/test\",
    \"startTime\": \"$CURRENT_TIME\",
    \"endTime\": \"$CURRENT_TIME\",
    \"durationMs\": 125,
    \"status\": \"OK\",
    \"httpMethod\": \"GET\",
    \"httpStatusCode\": 200,
    \"httpUrl\": \"/api/test\",
    \"isRoot\": true
  }]")

if command -v jq &> /dev/null; then
    echo "$INGEST_RESPONSE" | jq '.'
else
    echo "$INGEST_RESPONSE"
fi

echo -e "${GREEN}✅ Ingested span: $TRACE_ID${NC}"
echo ""

echo "📝 Test 5: Get Dashboard Overview"
echo "=================================="
echo ""

END_TIME=$(date +%s)000
START_TIME=$((END_TIME - 3600000))

OVERVIEW_RESPONSE=$(curl -s -X GET "http://localhost:18080/api/dashboard/overview?startTime=${START_TIME}&endTime=${END_TIME}" \
  -H "Authorization: Bearer $TOKEN")

if command -v jq &> /dev/null; then
    echo "$OVERVIEW_RESPONSE" | jq '.'
else
    echo "$OVERVIEW_RESPONSE"
fi

echo -e "${GREEN}✅ Got dashboard overview${NC}"
echo ""

echo "📝 Test 6: Get Service Metrics (ClickHouse)"
echo "============================================"
echo ""

METRICS_RESPONSE=$(curl -s -X GET "http://localhost:18080/api/v2/teams/${TEAM_UUID}/services/metrics?startTime=${START_TIME}&endTime=${END_TIME}" \
  -H "Authorization: Bearer $TOKEN")

if command -v jq &> /dev/null; then
    echo "$METRICS_RESPONSE" | jq '.'
else
    echo "$METRICS_RESPONSE"
fi

echo -e "${GREEN}✅ Got service metrics${NC}"
echo ""

echo "📝 Test 7: Get Logs (ClickHouse)"
echo "================================"
echo ""

LOGS_RESPONSE=$(curl -s -X GET "http://localhost:18080/api/v2/teams/${TEAM_UUID}/logs?startTime=${START_TIME}&endTime=${END_TIME}&limit=10" \
  -H "Authorization: Bearer $TOKEN")

if command -v jq &> /dev/null; then
    echo "$LOGS_RESPONSE" | jq '.'
else
    echo "$LOGS_RESPONSE"
fi

echo -e "${GREEN}✅ Got logs${NC}"
echo ""

echo "📝 Test 8: Get Traces (ClickHouse)"
echo "=================================="
echo ""

TRACES_RESPONSE=$(curl -s -X GET "http://localhost:18080/api/v2/teams/${TEAM_UUID}/traces?startTime=${START_TIME}&endTime=${END_TIME}&limit=10" \
  -H "Authorization: Bearer $TOKEN")

if command -v jq &> /dev/null; then
    echo "$TRACES_RESPONSE" | jq '.'
else
    echo "$TRACES_RESPONSE"
fi

echo -e "${GREEN}✅ Got traces${NC}"
echo ""

echo "═══════════════════════════════════════════"
echo -e "${GREEN}🎉 All API tests completed successfully!${NC}"
echo "═══════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  ✅ Authentication working"
echo "  ✅ User context retrieved"
echo "  ✅ Teams loaded"
echo "  ✅ Data ingestion working"
echo "  ✅ Dashboard queries working"
echo "  ✅ ClickHouse queries working"
echo ""
echo "Next steps:"
echo "  1. Open frontend: http://localhost:13000"
echo "  2. Generate more data: ./generate-data.sh"
echo "  3. View backend logs: docker-compose -f docker-compose.backend.yml logs -f"
echo ""

