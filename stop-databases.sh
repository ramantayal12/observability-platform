#!/bin/bash

# ObserveX - Stop Databases Script
# Stops MySQL, ClickHouse, and Redis

echo "🛑 Stopping ObserveX Databases"
echo "==============================="
echo ""

docker-compose -f docker-compose.databases.yml down

echo ""
echo "✅ Databases stopped!"
echo ""
echo "Note: Data is preserved in Docker volumes."
echo ""
echo "To remove all data (⚠️  DESTRUCTIVE):"
echo "  docker-compose -f docker-compose.databases.yml down -v"
echo ""

