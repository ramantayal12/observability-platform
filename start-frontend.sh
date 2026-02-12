#!/bin/bash

# ObserveX - Frontend Startup Script
# Starts NGINX frontend with reverse proxy to backend

set -e

echo "🚀 Starting ObserveX Frontend"
echo "============================="
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

# Check if backend is running
if ! docker ps | grep -q observex-backend; then
    echo "⚠️  Backend is not running!"
    echo ""
    echo "Start backend first:"
    echo "  ./start-backend.sh"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if docker-compose.frontend.yml exists
if [ ! -f "docker-compose.frontend.yml" ]; then
    echo "❌ docker-compose.frontend.yml not found!"
    exit 1
fi

# Stop any existing frontend containers
echo "🛑 Stopping existing frontend containers..."
docker-compose -f docker-compose.frontend.yml down 2>/dev/null || true

# Start frontend service (rebuild to pick up any changes)
echo ""
echo "🐳 Starting frontend service (NGINX)..."
echo ""

docker-compose -f docker-compose.frontend.yml up -d --build

echo ""
echo "⏳ Waiting for frontend to be ready..."
sleep 3

# Check if frontend is healthy
frontend_health=$(docker inspect --format='{{.State.Health.Status}}' observex-frontend 2>/dev/null || echo "unknown")

if [ "$frontend_health" = "healthy" ] || [ "$frontend_health" = "starting" ]; then
    echo "✅ Frontend is running!"
else
    echo "⚠️  Frontend health status: $frontend_health"
fi

echo ""
echo "🎉 Frontend is ready!"
echo ""
echo "Access the application:"
echo "  🌐 http://localhost:13000/pages/login.html"
echo ""
echo "Demo credentials:"
echo "  Email:    demo@observex.io"
echo "  Password: any password"
echo ""
echo "View logs:"
echo "  docker-compose -f docker-compose.frontend.yml logs -f"
echo ""

