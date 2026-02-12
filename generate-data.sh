#!/bin/bash

# ObserveX - Data Generator Script
# Generates sample observability data in MySQL and ClickHouse

set -e

echo "📊 ObserveX Data Generator"
echo "=========================="
echo ""

# Check if backend is running
if ! docker ps | grep -q observex-backend; then
    echo "❌ Backend is not running!"
    echo ""
    echo "Start backend first:"
    echo "  ./start-backend.sh"
    echo ""
    exit 1
fi

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed!"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "scripts/venv" ]; then
    echo "🔧 Creating Python virtual environment..."
    cd scripts
    python3 -m venv venv
    cd ..
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source scripts/venv/bin/activate

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install -q --upgrade pip
pip install -q -r scripts/requirements.txt

echo ""
echo "🗄️  Generating MySQL data (users, teams, organizations)..."
python3 scripts/data_generator.py \
    --host localhost \
    --port 13306 \
    --database observex \
    --user observex \
    --password observex123 \
    --clear

echo ""
echo "🔍 Querying team IDs from MySQL..."
# Get team IDs from MySQL and convert to UUIDs (format: 00000000-0000-0000-0000-000000000031)
TEAM_IDS=$(docker exec -i observex-mysql mysql -u observex -pobservex123 observex -N -e "SELECT id FROM teams ORDER BY id" | \
    awk '{printf "00000000-0000-0000-0000-%012d ", $1}')

if [ -z "$TEAM_IDS" ]; then
    echo "❌ No teams found in MySQL! Run MySQL data generator first."
    exit 1
fi

echo "  ✓ Found teams: $TEAM_IDS"

echo ""
echo "📈 Generating ClickHouse data (metrics, logs, traces)..."
python3 scripts/clickhouse_data_generator.py \
    --host localhost \
    --port 18123 \
    --database observex \
    --user observex \
    --password observex123 \
    --hours 24 \
    --team-ids $TEAM_IDS \
    --clear

echo ""
echo "✅ Data generation complete!"
echo ""
echo "Generated data:"
echo "  • Organizations: 1 (ObserveX Inc)"
echo "  • Teams: 3 (Platform, Backend, Frontend)"
echo "  • Users: 1 (demo@observex.io)"
echo "  • Services: 12 (4 per team)"
echo "  • Traces: ~10,000 (last 24 hours)"
echo "  • Logs: ~50,000 (last 24 hours)"
echo "  • Metrics: Derived from traces"
echo ""
echo "🌐 Access the application: http://localhost:13000/pages/login.html"
echo ""

