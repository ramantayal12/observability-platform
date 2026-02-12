#!/bin/bash

# ObserveX - Database Startup Script
# Starts MySQL, ClickHouse, and Redis (one-time setup, persists across restarts)

set -e

echo "🗄️  Starting ObserveX Databases"
echo "==============================="
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

# Check if docker-compose.databases.yml exists
if [ ! -f "docker-compose.databases.yml" ]; then
    echo "❌ docker-compose.databases.yml not found!"
    exit 1
fi

# Create network if it doesn't exist
echo "🔧 Creating Docker network..."
docker network create observex-network 2>/dev/null || echo "Network already exists"

# Check if databases are already running
if docker ps | grep -q observex-mysql && docker ps | grep -q observex-clickhouse && docker ps | grep -q observex-redis; then
    echo ""
    echo "✅ Databases are already running!"
    echo ""
    echo "Services:"
    echo "  • MySQL:      localhost:13306"
    echo "  • ClickHouse: http://localhost:18123"
    echo "  • Redis:      localhost:16379"
    echo ""
    echo "To restart databases:"
    echo "  docker-compose -f docker-compose.databases.yml restart"
    echo ""
    echo "To stop databases:"
    echo "  docker-compose -f docker-compose.databases.yml down"
    echo ""
    exit 0
fi

# Start database services
echo ""
echo "🐳 Starting database services (MySQL, ClickHouse, Redis)..."
echo "This may take 1-2 minutes on first start..."
echo ""

docker-compose -f docker-compose.databases.yml up -d

echo ""
echo "⏳ Waiting for databases to be healthy..."
echo ""

# Wait for services to be healthy
max_wait=120
elapsed=0
while [ $elapsed -lt $max_wait ]; do
    mysql_health=$(docker inspect --format='{{.State.Health.Status}}' observex-mysql 2>/dev/null || echo "starting")
    clickhouse_health=$(docker inspect --format='{{.State.Health.Status}}' observex-clickhouse 2>/dev/null || echo "starting")
    redis_health=$(docker inspect --format='{{.State.Health.Status}}' observex-redis 2>/dev/null || echo "starting")
    
    echo "  MySQL: $mysql_health | ClickHouse: $clickhouse_health | Redis: $redis_health"
    
    if [ "$mysql_health" = "healthy" ] && [ "$clickhouse_health" = "healthy" ] && [ "$redis_health" = "healthy" ]; then
        echo ""
        echo "✅ All databases are healthy!"
        break
    fi
    
    sleep 5
    elapsed=$((elapsed + 5))
done

if [ $elapsed -ge $max_wait ]; then
    echo ""
    echo "⚠️  Databases took longer than expected to start."
    echo "Check logs with: docker-compose -f docker-compose.databases.yml logs"
fi

echo ""
echo "🎉 Databases are running!"
echo ""
echo "Services:"
echo "  • MySQL:      localhost:13306"
echo "  • ClickHouse: http://localhost:18123"
echo "  • Redis:      localhost:16379"
echo ""
echo "Database credentials:"
echo "  MySQL:      observex / observex123"
echo "  ClickHouse: observex / observex123"
echo ""
echo "View logs:"
echo "  docker-compose -f docker-compose.databases.yml logs -f"
echo ""
echo "Next step: Generate sample data with ./generate-data.sh"
echo ""

