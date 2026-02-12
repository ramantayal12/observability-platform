#!/bin/bash

# ObserveX - Backend Startup Script
# Starts Spring Boot backend (requires databases to be running)

set -e

echo "🚀 Starting ObserveX Backend"
echo "============================"
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

# Check if databases are running
if ! docker ps | grep -q observex-mysql || ! docker ps | grep -q observex-clickhouse || ! docker ps | grep -q observex-redis; then
    echo "❌ Databases are not running!"
    echo ""
    echo "Start databases first:"
    echo "  ./start-databases.sh"
    echo ""
    exit 1
fi

# Check if docker-compose.backend.yml exists
if [ ! -f "docker-compose.backend.yml" ]; then
    echo "❌ docker-compose.backend.yml not found!"
    exit 1
fi

# Stop any existing backend containers
echo "🛑 Stopping existing backend container..."
docker-compose -f docker-compose.backend.yml down 2>/dev/null || true

# Build backend JAR
echo ""
echo "📦 Building backend JAR..."
cd observability-backend

# Check if Maven wrapper exists, otherwise use system mvn
if [ -f "./mvnw" ]; then
    ./mvnw clean package -DskipTests
    BUILD_STATUS=$?
elif command -v mvn &> /dev/null; then
    mvn clean package -DskipTests
    BUILD_STATUS=$?
else
    echo "❌ Maven not found! Please install Maven or add Maven wrapper."
    echo "   Install Maven: brew install maven"
    cd ..
    exit 1
fi

cd ..

if [ $BUILD_STATUS -ne 0 ]; then
    echo "❌ Backend build failed!"
    exit 1
fi

echo "✅ Backend JAR built successfully!"

# Start backend service
echo ""
echo "🐳 Starting backend service..."
echo ""

docker-compose -f docker-compose.backend.yml up -d --build

echo ""
echo "⏳ Waiting for backend to be healthy..."
echo ""

# Wait for backend to be healthy
max_wait=120
elapsed=0
while [ $elapsed -lt $max_wait ]; do
    backend_health=$(docker inspect --format='{{.State.Health.Status}}' observex-backend 2>/dev/null || echo "starting")

    echo "  Backend: $backend_health"

    if [ "$backend_health" = "healthy" ]; then
        echo ""
        echo "✅ Backend is healthy!"
        break
    fi

    sleep 5
    elapsed=$((elapsed + 5))
done

if [ $elapsed -ge $max_wait ]; then
    echo ""
    echo "⚠️  Backend took longer than expected to start."
    echo "Check logs with: docker-compose -f docker-compose.backend.yml logs"
fi

echo ""
echo "🎉 Backend is running!"
echo ""
echo "Backend API: http://localhost:18080"
echo "Health check: http://localhost:18080/actuator/health"
echo ""
echo "View logs:"
echo "  docker-compose -f docker-compose.backend.yml logs -f backend"
echo ""
echo "Next step: Start frontend with ./start-frontend.sh"
echo ""

