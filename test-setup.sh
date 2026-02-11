#!/bin/bash

# ObserveX - Setup Test Script
# Tests if all services are running correctly

set -e

echo "🧪 Testing ObserveX Setup"
echo "========================="
echo ""

# Check if Colima is running
echo "1. Checking Colima..."
if colima status &> /dev/null; then
    echo "   ✅ Colima is running"
else
    echo "   ❌ Colima is not running. Run: ./start-colima.sh"
    exit 1
fi

# Check if backend containers are running
echo ""
echo "2. Checking backend containers..."
containers=("observex-mysql" "observex-clickhouse" "observex-redis" "observex-backend")
for container in "${containers[@]}"; do
    if docker ps | grep -q "$container"; then
        echo "   ✅ $container is running"
    else
        echo "   ❌ $container is not running"
        exit 1
    fi
done

# Check if frontend container is running
echo ""
echo "3. Checking frontend container..."
if docker ps | grep -q "observex-frontend"; then
    echo "   ✅ observex-frontend is running"
else
    echo "   ⚠️  observex-frontend is not running. Run: ./start-frontend.sh"
fi

# Test backend health
echo ""
echo "4. Testing backend health..."
if curl -s http://localhost:18080/actuator/health | grep -q "UP"; then
    echo "   ✅ Backend is healthy"
else
    echo "   ❌ Backend health check failed"
    exit 1
fi

# Test MySQL connection
echo ""
echo "5. Testing MySQL connection..."
if docker exec observex-mysql mysqladmin ping -h localhost -u observex -pobservex123 &> /dev/null; then
    echo "   ✅ MySQL is accessible (port 13306)"
else
    echo "   ❌ MySQL connection failed"
    exit 1
fi

# Test ClickHouse connection
echo ""
echo "6. Testing ClickHouse connection..."
if curl -s http://localhost:18123/ping | grep -q "Ok"; then
    echo "   ✅ ClickHouse is accessible (port 18123)"
else
    echo "   ❌ ClickHouse connection failed"
    exit 1
fi

# Test Redis connection
echo ""
echo "7. Testing Redis connection..."
if docker exec observex-redis redis-cli ping | grep -q "PONG"; then
    echo "   ✅ Redis is accessible (port 16379)"
else
    echo "   ❌ Redis connection failed"
    exit 1
fi

# Test frontend
echo ""
echo "8. Testing frontend..."
if curl -s http://localhost:13000/pages/login.html | grep -q "ObserveX"; then
    echo "   ✅ Frontend is accessible (port 13000)"
else
    echo "   ⚠️  Frontend is not accessible. Run: ./start-frontend.sh"
fi

echo ""
echo "✅ All tests passed!"
echo ""
echo "Access the application:"
echo "  🌐 http://localhost:13000/pages/login.html"
echo ""

