#!/bin/bash

# ObserveX - Stop All Services Script

set -e

echo "🛑 Stopping ObserveX Platform"
echo "=============================="
echo ""

# Stop frontend
if [ -f "docker-compose.frontend.yml" ]; then
    echo "Stopping frontend..."
    docker-compose -f docker-compose.frontend.yml down 2>/dev/null || true
fi

# Stop backend
if [ -f "docker-compose.backend.yml" ]; then
    echo "Stopping backend..."
    docker-compose -f docker-compose.backend.yml down 2>/dev/null || true
fi

# Stop databases
if [ -f "docker-compose.databases.yml" ]; then
    echo "Stopping databases..."
    docker-compose -f docker-compose.databases.yml down 2>/dev/null || true
fi

# Remove network
echo "Removing Docker network..."
docker network rm observex-network 2>/dev/null || true

echo ""
echo "✅ All services stopped!"
echo ""
echo "Note: Database data is preserved in Docker volumes."
echo ""
echo "To stop Colima:"
echo "  colima stop"
echo ""
echo "To remove all data volumes (⚠️  DESTRUCTIVE):"
echo "  docker-compose -f docker-compose.databases.yml down -v"
echo ""

