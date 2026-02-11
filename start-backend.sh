#!/bin/bash

# ObserveX - Backend Startup Script
# Starts MySQL, ClickHouse, Redis, and Spring Boot backend

set -e

echo "🚀 Starting ObserveX Backend Services"
echo "====================================="
echo ""

# Check if Colima is running
if ! colima status &> /dev/null; then
    echo "❌ Colima is not running!"
    echo ""
    echo "Start Colima first:"
    echo "  ./start-colima.sh"
    echo ""
    exit 1
fi

# Check if docker-compose.backend.yml exists
if [ ! -f "docker-compose.backend.yml" ]; then
    echo "❌ docker-compose.backend.yml not found!"
    exit 1
fi

# Create network if it doesn't exist
echo "🔧 Creating Docker network..."
docker network create observex-network 2>/dev/null || echo "Network already exists"

# Stop any existing backend containers
echo "🛑 Stopping existing backend containers..."
docker-compose -f docker-compose.backend.yml down 2>/dev/null || true

# Start backend services
echo ""
echo "🐳 Starting backend services (MySQL, ClickHouse, Redis, Backend)..."
echo "This may take 2-3 minutes for the first build..."
echo ""

docker-compose -f docker-compose.backend.yml up -d --build

echo ""
echo "⏳ Waiting for services to be healthy..."
echo ""

# Wait for services to be healthy
max_wait=180
elapsed=0
while [ $elapsed -lt $max_wait ]; do
    mysql_health=$(docker inspect --format='{{.State.Health.Status}}' observex-mysql 2>/dev/null || echo "starting")
    clickhouse_health=$(docker inspect --format='{{.State.Health.Status}}' observex-clickhouse 2>/dev/null || echo "starting")
    redis_health=$(docker inspect --format='{{.State.Health.Status}}' observex-redis 2>/dev/null || echo "starting")
    backend_health=$(docker inspect --format='{{.State.Health.Status}}' observex-backend 2>/dev/null || echo "starting")
    
    echo "  MySQL: $mysql_health | ClickHouse: $clickhouse_health | Redis: $redis_health | Backend: $backend_health"
    
    if [ "$mysql_health" = "healthy" ] && [ "$clickhouse_health" = "healthy" ] && \
       [ "$redis_health" = "healthy" ] && [ "$backend_health" = "healthy" ]; then
        echo ""
        echo "✅ All backend services are healthy!"
        break
    fi
    
    sleep 5
    elapsed=$((elapsed + 5))
done

if [ $elapsed -ge $max_wait ]; then
    echo ""
    echo "⚠️  Services took longer than expected to start."
    echo "Check logs with: docker-compose -f docker-compose.backend.yml logs"
fi

echo ""
echo "🎉 Backend is running!"
echo ""
echo "Services:"
echo "  • MySQL:      localhost:13306"
echo "  • ClickHouse: http://localhost:18123"
echo "  • Redis:      localhost:16379"
echo "  • Backend:    http://localhost:18080"
echo ""
echo "Health check: http://localhost:18080/actuator/health"
echo ""
echo "View logs:"
echo "  docker-compose -f docker-compose.backend.yml logs -f backend"
echo ""
echo "Next step: Generate sample data with ./generate-data.sh"
echo ""

