#!/bin/bash

# ObserveX - Start All Services Script
# Complete startup: Databases → Backend → Frontend

set -e

echo "🚀 Starting Complete ObserveX Platform"
echo "======================================="
echo ""

# Step 1: Start databases
echo "Step 1/3: Starting databases..."
./start-databases.sh

# Wait a bit for databases to stabilize
echo ""
echo "Waiting for databases to stabilize..."
sleep 5

# Step 2: Start backend
echo ""
echo "Step 2/3: Starting backend..."
./start-backend.sh

# Step 3: Start frontend
echo ""
echo "Step 3/3: Starting frontend..."
./start-frontend.sh

echo ""
echo "═══════════════════════════════════════"
echo "🎉 ObserveX Platform is fully running!"
echo "═══════════════════════════════════════"
echo ""
echo "Services:"
echo "  📊 Frontend:   http://localhost:13000"
echo "  🔧 Backend:    http://localhost:18080"
echo "  🗄️  MySQL:      localhost:13306"
echo "  📈 ClickHouse: http://localhost:18123"
echo "  💾 Redis:      localhost:16379"
echo ""
echo "Demo credentials:"
echo "  Email:    demo@observex.io"
echo "  Password: any password"
echo ""
echo "Next steps:"
echo "  1. Generate sample data: ./generate-data.sh"
echo "  2. Open browser: http://localhost:13000"
echo ""
echo "View logs:"
echo "  docker-compose -f docker-compose.databases.yml logs -f"
echo "  docker-compose -f docker-compose.backend.yml logs -f"
echo "  docker-compose -f docker-compose.frontend.yml logs -f"
echo ""

