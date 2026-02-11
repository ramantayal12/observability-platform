#!/bin/bash

# ObserveX - Build Backend Locally
# This builds the JAR file on your Mac (faster than Docker build)

set -e

echo "🔨 Building ObserveX Backend"
echo "============================"
echo ""

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo "❌ Maven not found!"
    echo ""
    echo "Install Maven:"
    echo "  brew install maven"
    echo ""
    exit 1
fi

# Check Java version
echo "☕ Checking Java version..."
java -version 2>&1 | head -1

# Build the backend
echo ""
echo "📦 Building JAR file..."
cd observability-backend

# Clean and build
mvn clean package -DskipTests

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "JAR file created:"
    ls -lh target/*.jar | awk '{print "  " $9, "(" $5 ")"}'
    echo ""
    echo "Next steps:"
    echo "  1. Start backend: ./start-backend.sh"
    echo ""
else
    echo ""
    echo "❌ Build failed!"
    echo ""
    exit 1
fi

cd ..

