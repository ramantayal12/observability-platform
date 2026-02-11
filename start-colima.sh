#!/bin/bash

# ObserveX - Colima Docker Setup Script
# This script starts Colima with appropriate resources and launches the ObserveX platform

set -e

echo "🚀 ObserveX Platform - Colima Setup"
echo "===================================="
echo ""

# Check if Colima is installed
if ! command -v colima &> /dev/null; then
    echo "❌ Colima is not installed!"
    echo ""
    echo "Install Colima using Homebrew:"
    echo "  brew install colima"
    echo ""
    exit 1
fi

# Check if Docker CLI is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker CLI is not installed!"
    echo ""
    echo "Install Docker CLI using Homebrew:"
    echo "  brew install docker docker-compose"
    echo ""
    exit 1
fi

# Stop existing Colima instance if running
if colima status &> /dev/null; then
    echo "⚠️  Colima is already running. Stopping it first..."
    colima stop
    sleep 2
fi

# Start Colima with appropriate resources
echo "🔧 Starting Colima with 4 CPUs, 8GB RAM, 50GB disk..."
colima start \
    --cpu 4 \
    --memory 8 \
    --disk 50 \
    --arch $(uname -m) \
    --vm-type=vz \
    --mount-type=virtiofs \
    --network-address

echo ""
echo "✅ Colima started successfully!"
echo ""

# Verify Docker is working
echo "🔍 Verifying Docker connection..."
docker ps > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Docker is working!"
else
    echo "❌ Docker connection failed!"
    exit 1
fi

echo ""
echo "📦 Colima is ready for ObserveX!"
echo ""
echo "Next steps:"
echo "  1. Start backend:  ./start-backend.sh"
echo "  2. Start frontend: ./start-frontend.sh"
echo "  3. Generate data:  ./generate-data.sh"
echo ""

