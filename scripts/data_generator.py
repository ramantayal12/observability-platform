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
        """Clear all existing data from tables."""
        print("\n🗑️  Clearing existing data...")
        tables = [
            "spans", "traces", "logs", "metrics", "services", "alerts",
            "chart_configs", "api_endpoints", "user_teams", "users", "teams", "organizations"
        ]
        for table in tables:
            try:
                self.execute(f"DELETE FROM {table}")
                print(f"  ✓ Cleared {table}")
            except Error:
                pass  # Table might not exist yet

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


    # ==================== TRACES & SPANS ====================
    def create_traces_and_spans(self, org_id: int, teams: List[Dict], services: Dict[int, List[Dict]], num_traces: int = 50):
        """Create traces and spans for each team."""
        print("\n🔍 Creating traces and spans...")

        operations = ["GET /api/users", "POST /api/orders", "GET /api/products", "PUT /api/config", "DELETE /api/cache"]

        for team in teams:
            team_services = services.get(team["id"], [])
            if not team_services:
                continue

            traces_data = []
            spans_data = []

            for _ in range(num_traces):
                trace_id = uuid.uuid4().hex
                start_time = datetime.now() - timedelta(hours=random.randint(1, 24))
                duration = random.randint(50, 500)
                end_time = start_time + timedelta(milliseconds=duration)
                root_service = random.choice(team_services)
                status = random.choice(["SUCCESS", "SUCCESS", "SUCCESS", "ERROR"])
                span_count = random.randint(3, 8)

                traces_data.append((
                    org_id, team["id"], trace_id, start_time, end_time, duration,
                    root_service["name"], status, random.choice(operations), span_count
                ))

                # Create spans for this trace
                parent_span_id = None
                span_start = start_time
                for i in range(span_count):
                    span_id = uuid.uuid4().hex[:16]
                    span_duration = duration // span_count + random.randint(-10, 10)
                    span_end = span_start + timedelta(milliseconds=max(1, span_duration))
                    svc = team_services[i % len(team_services)]

                    spans_data.append((
                        org_id, team["id"], span_id, trace_id, parent_span_id,
                        random.choice(operations), span_start, span_end, max(1, span_duration),
                        svc["name"], "OK" if status == "SUCCESS" else random.choice(["OK", "ERROR"]),
                        random.choice(["SERVER", "CLIENT", "INTERNAL"]),
                        f"pod-{random.randint(1,5)}", f"container-{svc['name']}", f"node-{random.randint(1,3)}",
                        json.dumps({"http.method": "GET", "http.status_code": 200})
                    ))
                    parent_span_id = span_id
                    span_start = span_end

            # Batch insert traces
            self.execute_many("""
                INSERT INTO traces (organization_id, team_id, trace_id, start_time, end_time, duration,
                                   service_name, status, root_operation, span_count)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, traces_data)

            # Batch insert spans
            self.execute_many("""
                INSERT INTO spans (organization_id, team_id, span_id, trace_id, parent_span_id,
                                  operation_name, start_time, end_time, duration, service_name, status,
                                  kind, pod, container, node, attributes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, spans_data)

            print(f"  ✓ Created {len(traces_data)} traces and {len(spans_data)} spans for {team['name']}")

    # ==================== LOGS ====================
    def create_logs(self, org_id: int, teams: List[Dict], services: Dict[int, List[Dict]], num_logs: int = 200):
        """Create log entries for each team."""
        print("\n📝 Creating logs...")

        log_messages = [
            # INFO messages
            ("INFO", "Request processed successfully in {duration}ms"),
            ("INFO", "User {user_id} authenticated via OAuth2"),
            ("INFO", "Cache hit for key: {cache_key}"),
            ("INFO", "Database query completed in {duration}ms, rows affected: {rows}"),
            ("INFO", "Health check passed - all dependencies healthy"),
            ("INFO", "Scheduled job {job_name} completed successfully"),
            ("INFO", "Connection pool stats: active={active}, idle={idle}, waiting={waiting}"),
            ("INFO", "Message published to queue {queue_name}"),
            ("INFO", "API response: status={status}, latency={duration}ms"),
            ("INFO", "Feature flag {flag_name} evaluated to {value}"),
            # WARN messages
            ("WARN", "Slow query detected: {duration}ms exceeds threshold of 500ms"),
            ("WARN", "Rate limit approaching: {current}/{limit} requests"),
            ("WARN", "Memory usage at {percent}% - approaching threshold"),
            ("WARN", "Retry attempt {attempt}/3 for external service call"),
            ("WARN", "Circuit breaker {name} is half-open"),
            ("WARN", "Deprecated API endpoint called: {endpoint}"),
            ("WARN", "Connection pool exhausted, waiting for available connection"),
            ("WARN", "Cache miss rate elevated: {rate}%"),
            # ERROR messages
            ("ERROR", "Connection timeout after {duration}ms to {host}:{port}"),
            ("ERROR", "Failed to process request: {error_message}"),
            ("ERROR", "Database connection failed: {error_code}"),
            ("ERROR", "Authentication failed for user {user_id}: invalid credentials"),
            ("ERROR", "Circuit breaker {name} is OPEN - failing fast"),
            ("ERROR", "Message processing failed: {error_message}"),
            ("ERROR", "External API returned {status}: {error_message}"),
            ("ERROR", "Unhandled exception in {method}: {error_type}"),
            # DEBUG messages
            ("DEBUG", "Processing request payload: {bytes} bytes"),
            ("DEBUG", "Executing query: SELECT * FROM {table} WHERE id = {id}"),
            ("DEBUG", "HTTP request: {method} {path} - headers: {headers}"),
            ("DEBUG", "Serializing response object: {type}"),
        ]

        # Template values for log messages
        def format_log_message(template):
            return template.format(
                duration=random.randint(10, 2000),
                user_id=f"user-{random.randint(1000, 9999)}",
                cache_key=f"cache:{random.choice(['user', 'session', 'config', 'data'])}:{uuid.uuid4().hex[:8]}",
                rows=random.randint(1, 1000),
                job_name=random.choice(["cleanup", "sync", "report", "backup", "index"]),
                active=random.randint(5, 20),
                idle=random.randint(0, 10),
                waiting=random.randint(0, 5),
                queue_name=random.choice(["orders", "notifications", "events", "tasks"]),
                status=random.choice([200, 201, 204]),
                flag_name=random.choice(["new_ui", "beta_feature", "dark_mode", "v2_api"]),
                value=random.choice(["true", "false"]),
                current=random.randint(80, 95),
                limit=100,
                percent=random.randint(75, 95),
                attempt=random.randint(1, 3),
                name=random.choice(["payment-service", "inventory-service", "shipping-service"]),
                endpoint=random.choice(["/api/v1/legacy", "/api/old/users", "/api/deprecated"]),
                rate=random.randint(20, 40),
                host=random.choice(["db-primary", "cache-01", "api-gateway"]),
                port=random.choice([3306, 6379, 5432, 8080]),
                error_message=random.choice(["timeout", "connection refused", "invalid response", "rate limited"]),
                error_code=random.choice(["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"]),
                error_type=random.choice(["NullPointerException", "IOException", "TimeoutException"]),
                method=random.choice(["GET", "POST", "PUT", "DELETE"]),
                path=random.choice(["/api/users", "/api/orders", "/api/products"]),
                headers=random.randint(5, 15),
                bytes=random.randint(100, 50000),
                table=random.choice(["users", "orders", "products", "sessions"]),
                id=random.randint(1, 100000),
                type=random.choice(["UserDTO", "OrderResponse", "ProductList"])
            )

        for team in teams:
            team_services = services.get(team["id"], [])
            if not team_services:
                continue

            logs_data = []
            for _ in range(num_logs):
                level, message_template = random.choice(log_messages)
                svc = random.choice(team_services)
                timestamp = datetime.now() - timedelta(minutes=random.randint(1, 1440))

                # Format the message with realistic values
                formatted_message = format_log_message(message_template)

                logs_data.append((
                    org_id, team["id"], svc["name"], level, formatted_message,
                    timestamp, f"{svc['name']}.main", uuid.uuid4().hex if random.random() > 0.5 else None,
                    uuid.uuid4().hex[:16] if random.random() > 0.5 else None,
                    f"pod-{svc['name']}-{random.randint(1,5)}", f"container-{svc['name']}", f"node-{random.randint(1,3)}",
                    json.dumps({"request_id": uuid.uuid4().hex[:8], "trace_id": uuid.uuid4().hex[:16]})
                ))

            self.execute_many("""
                INSERT INTO logs (organization_id, team_id, service_name, level, message, timestamp,
                                 logger, trace_id, span_id, pod, container, node, attributes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, logs_data)

            print(f"  ✓ Created {len(logs_data)} logs for {team['name']}")

    # ==================== METRICS ====================
    def create_metrics(self, org_id: int, teams: List[Dict], services: Dict[int, List[Dict]], num_points: int = 100):
        """Create metric data points for each team."""
        print("\n📊 Creating metrics...")

        metric_types = ["latency", "throughput", "error_rate", "cpu_usage", "memory_usage"]
        endpoints = ["/api/users", "/api/orders", "/api/products", "/api/config", "/api/health"]

        for team in teams:
            team_services = services.get(team["id"], [])
            if not team_services:
                continue

            metrics_data = []
            for _ in range(num_points):
                svc = random.choice(team_services)
                metric_name = random.choice(metric_types)
                timestamp = datetime.now() - timedelta(minutes=random.randint(1, 1440))

                # Generate realistic values based on metric type
                if metric_name == "latency":
                    value = random.uniform(10, 500)
                elif metric_name == "throughput":
                    value = random.uniform(100, 1000)
                elif metric_name == "error_rate":
                    value = random.uniform(0, 5)
                elif metric_name == "cpu_usage":
                    value = random.uniform(10, 90)
                else:
                    value = random.uniform(20, 80)

                metrics_data.append((
                    org_id, team["id"], svc["name"], metric_name, random.choice(endpoints),
                    value, timestamp, random.choice(["GET", "POST", "PUT"]),
                    random.choice([200, 200, 200, 201, 400, 500]),
                    f"pod-{random.randint(1,5)}", f"container-{svc['name']}", f"node-{random.randint(1,3)}",
                    "request"
                ))

            self.execute_many("""
                INSERT INTO metrics (organization_id, team_id, service_name, metric_name, endpoint,
                                    value, timestamp, method, status_code, pod, container, node, operation_type)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, metrics_data)

            print(f"  ✓ Created {len(metrics_data)} metrics for {team['name']}")

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
            print("\n📈 Note: Time-series data (traces, logs, metrics) will be generated in ClickHouse")
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