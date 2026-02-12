#!/usr/bin/env python3
"""
Data Generator Script for ObserveX Observability Platform

This script generates all mock data for the observability platform.
It connects directly to the MySQL database and populates:
- Organizations
- Teams
- Users and user-team mappings
- Services
- Traces and Spans
- Logs
- Metrics
- Chart configurations
- API endpoints
- Alerts (rules and incidents)

Usage:
    python data_generator.py --clear  # Clear and regenerate all data
    python data_generator.py          # Only generate if tables are empty
"""

import argparse
import random
import uuid
import json
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import mysql.connector
from mysql.connector import Error


class DataGenerator:
    """Generates all mock observability data."""

    def __init__(self, db_config: Dict[str, Any]):
        self.db_config = db_config
        self.connection = None
        self.org_id = None
        self.teams = []
        self.services = {}

    def connect(self):
        """Establish database connection."""
        try:
            self.connection = mysql.connector.connect(**self.db_config)
            if self.connection.is_connected():
                print(f"✓ Connected to MySQL database: {self.db_config['database']}")
                return True
        except Error as e:
            print(f"✗ Error connecting to MySQL: {e}")
            return False

    def disconnect(self):
        """Close database connection."""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            print("\n✓ Database connection closed")

    def execute(self, sql: str, params: tuple = None, fetch: bool = False):
        """Execute SQL and optionally fetch results."""
        cursor = self.connection.cursor(dictionary=True)
        cursor.execute(sql, params)
        if fetch:
            result = cursor.fetchall()
            cursor.close()
            return result
        self.connection.commit()
        last_id = cursor.lastrowid
        cursor.close()
        return last_id

    def execute_many(self, sql: str, data: List[tuple]):
        """Execute SQL for multiple rows."""
        cursor = self.connection.cursor()
        cursor.executemany(sql, data)
        self.connection.commit()
        cursor.close()

    def clear_all_data(self):
        """Clear all existing data from MySQL tables.
        Note: Time-series data (spans, logs) are in ClickHouse, not MySQL.
        """
        print("\n🗑️  Clearing existing MySQL data...")
        tables = [
            "services", "alerts", "chart_configs", "api_endpoints",
            "user_teams", "users", "teams", "organizations"
        ]
        for table in tables:
            try:
                self.execute(f"DELETE FROM {table}")
                print(f"  ✓ Cleared {table}")
            except Error:
                pass  # Table might not exist yet
        print("  ℹ️  Note: ClickHouse data (spans, logs, incidents) not affected")

    def ensure_tables(self):
        """Ensure all required tables exist."""
        print("\n📋 Ensuring tables exist...")

        # api_endpoints table (not created by JPA)
        self.execute("""
            CREATE TABLE IF NOT EXISTS api_endpoints (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                team_id BIGINT NOT NULL,
                endpoint VARCHAR(255) NOT NULL,
                method VARCHAR(10) NOT NULL,
                base_latency DOUBLE NOT NULL,
                base_throughput DOUBLE NOT NULL,
                base_error_rate DOUBLE NOT NULL,
                enabled BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_api_endpoints_team (team_id)
            )
        """)
        print("  ✓ Tables verified")


    # ==================== ORGANIZATION ====================
    def create_organization(self) -> int:
        """Create demo organization."""
        print("\n🏢 Creating organization...")
        now = datetime.now()
        org_id = self.execute("""
            INSERT INTO organizations (name, slug, plan, active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, ("ObserveX Demo", "observex-demo", "enterprise", True, now, now))
        print(f"  ✓ Created organization: ObserveX Demo (ID: {org_id})")
        return org_id

    # ==================== TEAMS ====================
    def create_teams(self, org_id: int) -> List[Dict]:
        """Create teams for the organization."""
        print("\n👥 Creating teams...")
        now = datetime.now()
        teams_data = [
            {"name": "Platform Team", "slug": "platform", "color": "#774FF8"},
            {"name": "Backend Team", "slug": "backend", "color": "#12B76A"},
            {"name": "Frontend Team", "slug": "frontend", "color": "#F79009"},
        ]

        teams = []
        for t in teams_data:
            team_id = self.execute("""
                INSERT INTO teams (name, slug, organization_id, color, active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (t["name"], t["slug"], org_id, t["color"], True, now, now))
            teams.append({"id": team_id, "name": t["name"], "slug": t["slug"], "color": t["color"]})
            print(f"  ✓ Created team: {t['name']} (ID: {team_id})")

        return teams

    # ==================== USERS ====================
    def create_users(self, org_id: int, teams: List[Dict]):
        """Create demo users and assign to teams."""
        print("\n👤 Creating users...")
        now = datetime.now()

        # Create demo user
        user_id = self.execute("""
            INSERT INTO users (email, name, role, organization_id, active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, ("demo@observex.io", "Demo User", "admin", org_id, True, now, now))
        print(f"  ✓ Created user: demo@observex.io (ID: {user_id})")

        # Assign user to all teams
        for i, team in enumerate(teams):
            role = "admin" if i == 0 else "member"
            self.execute("""
                INSERT INTO user_teams (user_id, team_id, role, joined_at)
                VALUES (%s, %s, %s, %s)
            """, (user_id, team["id"], role, now))
        print(f"  ✓ Assigned user to {len(teams)} teams")

    # ==================== SERVICES ====================
    def create_services(self, org_id: int, teams: List[Dict]) -> Dict[int, List[Dict]]:
        """Create services for each team."""
        print("\n🔧 Creating services...")
        now = datetime.now()

        service_templates = {
            "platform": ["api-gateway", "auth-service", "user-service", "notification-service"],
            "backend": ["order-service", "payment-service", "inventory-service", "shipping-service"],
            "frontend": ["web-app", "mobile-bff", "cdn-service", "analytics-service"],
        }

        services = {}
        for team in teams:
            services[team["id"]] = []
            svc_names = service_templates.get(team["slug"], ["default-service"])

            for svc_name in svc_names:
                svc_id = self.execute("""
                    INSERT INTO services (organization_id, team_id, name, status, first_seen, last_seen,
                                         metric_count, log_count, trace_count, error_count, error_rate, version, environment)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (org_id, team["id"], svc_name, "healthy", now - timedelta(days=30), now,
                      random.randint(1000, 10000), random.randint(5000, 50000), random.randint(100, 1000),
                      random.randint(10, 100), random.uniform(0.1, 2.0), "1.0.0", "production"))
                services[team["id"]].append({"id": svc_id, "name": svc_name})

            print(f"  ✓ Created {len(svc_names)} services for {team['name']}")

        return services

    # ==================== TIME-SERIES DATA ====================
    # NOTE: Traces, logs, and metrics are now stored in ClickHouse, not MySQL.
    # Use clickhouse_data_generator.py to generate time-series data.
    # The methods create_traces_and_spans(), create_logs(), and create_metrics()
    # have been removed as they tried to insert into non-existent MySQL tables.

    # ==================== CHART CONFIGS ====================
    def create_chart_configs(self, teams: List[Dict]):
        """Create chart configurations for each team."""
        print("\n📈 Creating chart configurations...")
        now = datetime.now()

        for team in teams:
            configs = []

            # Overview page charts
            overview_charts = [
                {"chart_id": "latency", "title": f"Latency Overview - {team['slug']}", "chart_type": "line", "unit": "ms", "data_key": "latencyData", "display_order": 1},
                {"chart_id": "throughput", "title": "Throughput", "chart_type": "line", "unit": "req/min", "data_key": "throughputData", "display_order": 2},
                {"chart_id": "errorRate", "title": "Error Rate", "chart_type": "line", "unit": "%", "data_key": "errorRateData", "display_order": 3},
                {"chart_id": "serviceLatency", "title": "Service Latency", "chart_type": "bar", "unit": "ms", "data_key": "serviceLatency", "display_order": 4},
            ]

            for chart in overview_charts:
                configs.append((team["id"], "overview", chart["chart_id"], chart["title"], chart["chart_type"],
                               chart["unit"], chart["data_key"], None, chart["display_order"], True, now))

            # Metrics page charts
            metrics_charts = [
                {"chart_id": "latency", "title": "Latency Trends", "chart_type": "line", "unit": "ms", "data_key": "latencyData", "display_order": 1},
                {"chart_id": "throughput", "title": "Throughput Trends", "chart_type": "line", "unit": "req/min", "data_key": "throughputData", "display_order": 2},
                {"chart_id": "errorRate", "title": "Error Rate Trends", "chart_type": "line", "unit": "%", "data_key": "errorData", "display_order": 3},
                {"chart_id": "p99", "title": "P99 Latency", "chart_type": "line", "unit": "ms", "data_key": "latencyData", "percentile": 99, "display_order": 4},
            ]

            for chart in metrics_charts:
                configs.append((team["id"], "metrics", chart["chart_id"], chart["title"], chart["chart_type"],
                               chart["unit"], chart["data_key"], chart.get("percentile"), chart["display_order"], True, now))

            self.execute_many("""
                INSERT INTO chart_configs (team_id, page_type, chart_id, title, chart_type, unit, data_key, percentile, display_order, enabled, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, configs)

            print(f"  ✓ Created {len(configs)} chart configs for {team['name']}")

    # ==================== API ENDPOINTS ====================
    def create_api_endpoints(self, teams: List[Dict]):
        """Create API endpoint configurations for each team."""
        print("\n🔗 Creating API endpoints...")
        now = datetime.now()

        for team in teams:
            random.seed(team["id"])  # Consistent data per team

            endpoint_templates = [
                {"method": "GET", "path": f"/api/v1/{team['slug']}/users"},
                {"method": "POST", "path": f"/api/v1/{team['slug']}/data"},
                {"method": "GET", "path": f"/api/v1/{team['slug']}/status"},
                {"method": "PUT", "path": f"/api/v1/{team['slug']}/config"},
                {"method": "DELETE", "path": f"/api/v1/{team['slug']}/cache"},
                {"method": "GET", "path": f"/api/v1/{team['slug']}/metrics"},
            ]

            endpoints = []
            for ep in endpoint_templates:
                endpoints.append((
                    team["id"], f"{ep['method']} {ep['path']}", ep["method"],
                    30 + random.random() * 150, 100 + random.random() * 500,
                    0.1 + random.random() * 3, True, now
                ))

            self.execute_many("""
                INSERT INTO api_endpoints (team_id, endpoint, method, base_latency, base_throughput, base_error_rate, enabled, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, endpoints)

            print(f"  ✓ Created {len(endpoints)} API endpoints for {team['name']}")

    # ==================== ALERTS ====================
    def create_alerts(self, org_id: int, teams: List[Dict], services: Dict[int, List[Dict]]):
        """Create alert rules and incidents for each team."""
        print("\n🚨 Creating alerts...")
        now = datetime.now()

        alert_templates = [
            {"name": "High API Latency", "metric": "api.latency", "operator": ">", "threshold": 1000, "severity": "critical", "type": "metric"},
            {"name": "High Error Rate", "metric": "error.rate", "operator": ">", "threshold": 5, "severity": "critical", "type": "metric"},
            {"name": "Low Throughput", "metric": "throughput", "operator": "<", "threshold": 100, "severity": "warning", "type": "metric"},
            {"name": "High Memory Usage", "metric": "memory.usage", "operator": ">", "threshold": 85, "severity": "warning", "type": "apm"},
            {"name": "High CPU Usage", "metric": "cpu.usage", "operator": ">", "threshold": 80, "severity": "warning", "type": "apm"},
            {"name": "Database Connection Pool", "metric": "db.connections", "operator": ">", "threshold": 90, "severity": "critical", "type": "metric"},
            {"name": "Request Queue Depth", "metric": "queue.depth", "operator": ">", "threshold": 1000, "severity": "warning", "type": "metric"},
            {"name": "Cache Hit Rate Low", "metric": "cache.hit_rate", "operator": "<", "threshold": 80, "severity": "info", "type": "metric"},
            {"name": "Error Log Spike", "metric": "log.error_count", "operator": ">", "threshold": 100, "severity": "critical", "type": "log"},
            {"name": "Slow Trace Detected", "metric": "trace.duration", "operator": ">", "threshold": 5000, "severity": "warning", "type": "trace"},
        ]

        statuses = ["active", "acknowledged", "resolved", "muted"]

        for team in teams:
            team_services = services.get(team["id"], [])
            if not team_services:
                continue

            alerts_data = []
            for i, template in enumerate(alert_templates):
                svc = team_services[i % len(team_services)]
                status = random.choice(statuses)
                created_at = now - timedelta(days=random.randint(1, 30))
                triggered_at = now - timedelta(hours=random.randint(1, 48)) if status != "muted" else None
                acknowledged_at = triggered_at + timedelta(minutes=random.randint(5, 30)) if status in ["acknowledged", "resolved"] and triggered_at else None
                resolved_at = acknowledged_at + timedelta(hours=random.randint(1, 4)) if status == "resolved" and acknowledged_at else None

                # Generate current value based on threshold
                if template["operator"] == ">":
                    current_value = template["threshold"] * (1 + random.uniform(0.1, 0.5)) if status == "active" else template["threshold"] * random.uniform(0.5, 0.9)
                else:
                    current_value = template["threshold"] * (1 - random.uniform(0.1, 0.5)) if status == "active" else template["threshold"] * random.uniform(1.1, 1.5)

                alerts_data.append((
                    org_id, team["id"], template["name"], template["type"], template["metric"], template["operator"],
                    template["threshold"], template["severity"], svc["name"], status,
                    round(current_value, 2), created_at, triggered_at, acknowledged_at, resolved_at
                ))

            self.execute_many("""
                INSERT INTO alerts (organization_id, team_id, name, type, metric, operator, threshold, severity,
                                   service_name, status, current_value, created_at, triggered_at, acknowledged_at, resolved_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, alerts_data)

            print(f"  ✓ Created {len(alerts_data)} alerts for {team['name']}")


    # ==================== MAIN RUN ====================
    def run(self, clear_existing: bool = False):
        """Run the complete data generation process."""
        if not self.connect():
            return False

        try:
            print("\n" + "="*60)
            print("🚀 ObserveX Data Generator")
            print("="*60)

            # Ensure tables exist
            self.ensure_tables()

            # Clear existing data if requested
            if clear_existing:
                self.clear_all_data()

            # Create organization
            org_id = self.create_organization()

            # Create teams
            teams = self.create_teams(org_id)

            # Create users
            self.create_users(org_id, teams)

            # Create services
            services = self.create_services(org_id, teams)

            # Skip traces, logs, metrics - those go into ClickHouse
            # Use clickhouse_data_generator.py for time-series data

            # Create chart configurations
            self.create_chart_configs(teams)

            # Create API endpoints
            self.create_api_endpoints(teams)

            # Create alerts
            self.create_alerts(org_id, teams, services)

            print("\n" + "="*60)
            print("✅ MySQL data generation complete!")
            print("="*60)
            print("\n📋 Summary:")
            print(f"   • 1 organization")
            print(f"   • {len(teams)} teams")
            print(f"   • 1 user (demo@observex.io)")
            print(f"   • {sum(len(s) for s in services.values())} services")
            print(f"   • {8 * len(teams)} chart configs")
            print(f"   • {6 * len(teams)} API endpoints")
            print(f"   • {10 * len(teams)} alerts")
            print("\n📊 Note: Time-series data (traces, logs, metrics) will be generated in ClickHouse")
            print("   Run clickhouse_data_generator.py to populate ClickHouse")
            print("\n🔑 Login credentials:")
            print("   Email: demo@observex.io")
            print("   Password: (any password)")

            return True

        except Error as e:
            print(f"\n✗ Error during data generation: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            self.disconnect()


def main():
    parser = argparse.ArgumentParser(
        description="Generate mock data for ObserveX Observability Platform",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python data_generator.py --clear          # Clear and regenerate all data
  python data_generator.py                  # Generate data (fails if exists)
  python data_generator.py --host db.local  # Use custom database host
        """
    )
    parser.add_argument("--host", default="localhost", help="MySQL host (default: localhost)")
    parser.add_argument("--port", type=int, default=3306, help="MySQL port (default: 3306)")
    parser.add_argument("--database", default="metabase", help="Database name (default: metabase)")
    parser.add_argument("--user", default="metabase", help="Database user (default: metabase)")
    parser.add_argument("--password", default="metabasepass", help="Database password")
    parser.add_argument("--clear", action="store_true", help="Clear existing data before generating")

    args = parser.parse_args()

    db_config = {
        "host": args.host,
        "port": args.port,
        "database": args.database,
        "user": args.user,
        "password": args.password
    }

    generator = DataGenerator(db_config)
    success = generator.run(clear_existing=args.clear)
    exit(0 if success else 1)


if __name__ == "__main__":
    main()