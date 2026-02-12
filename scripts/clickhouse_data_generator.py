#!/usr/bin/env python3
"""
ClickHouse Data Generator for ObserveX (Simplified Schema)

Generates data for 3 tables: spans, logs, incidents
Metrics are derived from spans via materialized views.

Uses REST API ingestion endpoints instead of direct ClickHouse insertion.

Usage:
    python clickhouse_data_generator.py --clear  # Clear and regenerate
    python clickhouse_data_generator.py          # Generate new data
"""

import argparse
import random
import uuid
import requests
from datetime import datetime, timedelta
from typing import List
import clickhouse_connect

# Service definitions
SERVICES = {
    "api-gateway": {"endpoints": ["/api/v1/users", "/api/v1/orders", "/api/v1/products", "/api/v1/payments"]},
    "user-service": {"endpoints": ["/users", "/users/{id}", "/users/auth", "/users/profile"]},
    "order-service": {"endpoints": ["/orders", "/orders/{id}", "/orders/status", "/orders/history"]},
    "payment-service": {"endpoints": ["/payments", "/payments/process", "/payments/refund", "/payments/verify"]},
    "inventory-service": {"endpoints": ["/inventory", "/inventory/check", "/inventory/reserve"]},
    "notification-service": {"endpoints": ["/notify/email", "/notify/sms", "/notify/push"]},
}

LOG_LEVELS = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"]
LOG_LEVEL_WEIGHTS = [5, 15, 60, 15, 5]

HTTP_METHODS = ["GET", "POST", "PUT", "DELETE"]
HTTP_STATUS_CODES = [200, 201, 400, 401, 404, 500, 503]
HTTP_STATUS_WEIGHTS = [60, 10, 5, 3, 7, 10, 5]

ERROR_MESSAGES = [
    "Connection timeout", "Database pool exhausted", "Auth token expired",
    "Rate limit exceeded", "Service unavailable", "Invalid payload",
]

INFO_MESSAGES = [
    "Request processed", "User authenticated", "Order created",
    "Payment processed", "Cache hit", "Query executed",
]


class ClickHouseDataGenerator:
    """Generates observability data for ClickHouse (simplified 3-table schema)."""

    def __init__(self, host: str, port: int, database: str, user: str, password: str,
                 api_url: str = "http://localhost:13000", auth_token: str = None):
        self.client = clickhouse_connect.get_client(
            host=host, port=port, database=database,
            username=user, password=password
        )
        self.team_ids = []
        self.api_url = api_url
        self.auth_token = auth_token
        self.use_api = auth_token is not None  # Use API if token provided, else direct insertion

    def clear_data(self):
        """Clear all data from ClickHouse tables."""
        print("\n🗑️  Clearing existing data...")
        for table in ["spans", "logs", "incidents"]:
            try:
                self.client.command(f"TRUNCATE TABLE IF EXISTS {table}")
                print(f"  ✓ Cleared {table}")
            except Exception as e:
                print(f"  ⚠ Could not clear {table}: {e}")

    def set_team_ids(self, team_ids: List[str]):
        self.team_ids = team_ids
        print(f"  ✓ Using {len(team_ids)} team IDs")

    def generate_logs(self, hours_back: int = 24, logs_per_hour: int = 500):
        """Generate log entries."""
        print(f"\n📝 Generating logs ({hours_back}h, {logs_per_hour} logs/hour)...")

        now = datetime.utcnow()
        batch_size = 5000
        total_inserted = 0

        for team_id in self.team_ids:
            rows = []
            for hour in range(hours_back):
                for _ in range(logs_per_hour):
                    timestamp = now - timedelta(hours=hour, minutes=random.randint(0, 59),
                                                seconds=random.randint(0, 59))
                    service_name = random.choice(list(SERVICES.keys()))
                    level = random.choices(LOG_LEVELS, weights=LOG_LEVEL_WEIGHTS)[0]

                    if level == "ERROR":
                        message = random.choice(ERROR_MESSAGES)
                        exception = f"java.lang.RuntimeException: {message}\n\tat com.example.Service.method(Service.java:42)"
                    else:
                        message = random.choice(INFO_MESSAGES)
                        exception = ""

                    trace_id = uuid.uuid4().hex[:32] if random.random() > 0.3 else ""
                    span_id = uuid.uuid4().hex[:16] if trace_id else ""

                    rows.append([
                        team_id, timestamp, level, service_name,
                        f"com.example.{service_name.replace('-', '.')}.Handler",
                        message, trace_id, span_id,
                        f"host-{random.randint(1, 5)}", f"pod-{service_name}-{random.randint(1, 3)}",
                        service_name, f"thread-{random.randint(1, 20)}", exception, {}
                    ])

                    if len(rows) >= batch_size:
                        self._insert_logs(rows)
                        total_inserted += len(rows)
                        rows = []

            if rows:
                self._insert_logs(rows)
                total_inserted += len(rows)

        print(f"  ✓ Inserted {total_inserted:,} logs")

    def _insert_logs(self, rows):
        if self.use_api:
            self._insert_logs_via_api(rows)
        else:
            self.client.insert("logs", rows, column_names=[
                "team_id", "timestamp", "level", "service_name", "logger",
                "message", "trace_id", "span_id", "host", "pod",
                "container", "thread", "exception", "attributes"
            ])

    def _insert_logs_via_api(self, rows):
        """Insert logs via REST API ingestion endpoint."""
        logs_payload = []
        for row in rows:
            log_entry = {
                "serviceName": row[3],
                "level": row[2],
                "message": row[5],
                "logger": row[4],
                "traceId": row[6] if row[6] else None,
                "spanId": row[7] if row[7] else None,
                "host": row[8],
                "pod": row[9],
                "container": row[10],
                "thread": row[11],
                "exception": row[12],
                "attributes": row[13],
                "timestamp": int(row[1].timestamp() * 1000)  # Convert to milliseconds
            }
            logs_payload.append(log_entry)

        # Send in batches of 1000
        batch_size = 1000
        for i in range(0, len(logs_payload), batch_size):
            batch = logs_payload[i:i + batch_size]
            try:
                response = requests.post(
                    f"{self.api_url}/api/ingest/logs",
                    json=batch,
                    headers={"Authorization": f"Bearer {self.auth_token}"},
                    timeout=30
                )
                response.raise_for_status()
            except Exception as e:
                print(f"  ⚠ API ingestion failed, falling back to direct insertion: {e}")
                # Fallback to direct insertion
                self.client.insert("logs", rows[i:i + batch_size], column_names=[
                    "team_id", "timestamp", "level", "service_name", "logger",
                    "message", "trace_id", "span_id", "host", "pod",
                    "container", "thread", "exception", "attributes"
                ])

    def generate_spans(self, hours_back: int = 24, traces_per_hour: int = 100):
        """Generate spans (unified traces + spans table)."""
        print(f"\n🔗 Generating spans ({hours_back}h, {traces_per_hour} traces/hour)...")

        now = datetime.utcnow()
        span_batch = []
        total_traces = 0
        total_spans = 0

        for team_id in self.team_ids:
            for hour in range(hours_back):
                for _ in range(traces_per_hour):
                    trace_id = uuid.uuid4().hex[:32]
                    start_time = now - timedelta(hours=hour, minutes=random.randint(0, 59))

                    # Generate spans for this trace
                    spans = self._generate_trace_spans(team_id, trace_id, start_time)

                    for span in spans:
                        span_batch.append([
                            team_id, trace_id, span["span_id"], span.get("parent_span_id"),
                            span["is_root"],
                            span["operation_name"], span["service_name"], span["span_kind"],
                            span["start_time"], span["end_time"], span["duration_ms"],
                            span["status"], span.get("status_message", ""),
                            span.get("http_method", ""), span.get("http_url", ""),
                            span.get("http_status_code", 0),
                            f"host-{random.randint(1, 5)}",
                            f"pod-{span['service_name']}-{random.randint(1, 3)}",
                            span["service_name"], {}
                        ])

                    total_traces += 1
                    total_spans += len(spans)

                    if len(span_batch) >= 5000:
                        self._insert_spans(span_batch)
                        span_batch = []

            if span_batch:
                self._insert_spans(span_batch)
                span_batch = []

        print(f"  ✓ Inserted {total_traces:,} traces, {total_spans:,} spans")

    def _generate_trace_spans(self, team_id, trace_id, start_time):
        """Generate realistic span hierarchy for a trace."""
        spans = []

        # Root span (API Gateway)
        root_span_id = uuid.uuid4().hex[:16]
        root_duration = random.randint(50, 500)
        http_method = random.choice(HTTP_METHODS)
        http_status = random.choices(HTTP_STATUS_CODES, weights=HTTP_STATUS_WEIGHTS)[0]

        root_span = {
            "span_id": root_span_id,
            "parent_span_id": None,
            "is_root": 1,
            "operation_name": random.choice(SERVICES["api-gateway"]["endpoints"]),
            "service_name": "api-gateway",
            "span_kind": "SERVER",
            "start_time": start_time,
            "end_time": start_time + timedelta(milliseconds=root_duration),
            "duration_ms": root_duration,
            "status": "ERROR" if http_status >= 500 else "OK",
            "http_method": http_method,
            "http_url": f"https://api.example.com{random.choice(SERVICES['api-gateway']['endpoints'])}",
            "http_status_code": http_status,
        }
        spans.append(root_span)

        # Child spans (downstream services)
        current_time = start_time + timedelta(milliseconds=5)
        remaining_duration = root_duration - 10
        downstream_services = random.sample(list(SERVICES.keys())[1:], k=random.randint(2, 4))

        for service_name in downstream_services:
            span_duration = random.randint(10, max(20, remaining_duration // 2))
            span_id = uuid.uuid4().hex[:16]

            span = {
                "span_id": span_id,
                "parent_span_id": root_span_id,
                "is_root": 0,
                "operation_name": random.choice(SERVICES[service_name]["endpoints"]),
                "service_name": service_name,
                "span_kind": "SERVER",
                "start_time": current_time,
                "end_time": current_time + timedelta(milliseconds=span_duration),
                "duration_ms": span_duration,
                "status": "OK" if random.random() > 0.05 else "ERROR",
            }
            spans.append(span)
            current_time += timedelta(milliseconds=span_duration + random.randint(1, 5))

        return spans

    def _insert_spans(self, rows):
        if self.use_api:
            self._insert_spans_via_api(rows)
        else:
            self.client.insert("spans", rows, column_names=[
                "team_id", "trace_id", "span_id", "parent_span_id", "is_root",
                "operation_name", "service_name", "span_kind",
                "start_time", "end_time", "duration_ms", "status", "status_message",
                "http_method", "http_url", "http_status_code",
                "host", "pod", "container", "attributes"
            ])

    def _insert_spans_via_api(self, rows):
        """Insert spans via REST API ingestion endpoint."""
        spans_payload = []
        for row in rows:
            span_entry = {
                "traceId": row[1],
                "spanId": row[2],
                "parentSpanId": row[3] if row[3] else None,
                "isRoot": bool(row[4]),
                "operationName": row[5],
                "serviceName": row[6],
                "spanKind": row[7],
                "startTime": row[8].isoformat() + "Z",
                "endTime": row[9].isoformat() + "Z",
                "durationMs": row[10],
                "status": row[11],
                "statusMessage": row[12] if row[12] else None,
                "httpMethod": row[13] if row[13] else None,
                "httpUrl": row[14] if row[14] else None,
                "httpStatusCode": row[15] if row[15] else None,
                "host": row[16],
                "pod": row[17],
                "container": row[18],
                "attributes": row[19]
            }
            spans_payload.append(span_entry)

        # Send in batches of 1000
        batch_size = 1000
        for i in range(0, len(spans_payload), batch_size):
            batch = spans_payload[i:i + batch_size]
            try:
                response = requests.post(
                    f"{self.api_url}/api/ingest/spans",
                    json=batch,
                    headers={"Authorization": f"Bearer {self.auth_token}"},
                    timeout=30
                )
                response.raise_for_status()
            except Exception as e:
                print(f"  ⚠ API ingestion failed, falling back to direct insertion: {e}")
                # Fallback to direct insertion
                self.client.insert("spans", rows[i:i + batch_size], column_names=[
                    "team_id", "trace_id", "span_id", "parent_span_id", "is_root",
                    "operation_name", "service_name", "span_kind",
                    "start_time", "end_time", "duration_ms", "status", "status_message",
                    "http_method", "http_url", "http_status_code",
                    "host", "pod", "container", "attributes"
                ])

    def generate_incidents(self, days_back: int = 30, incidents_per_day: int = 5):
        """Generate alert incidents."""
        print(f"\n🚨 Generating incidents ({days_back} days, {incidents_per_day}/day)...")

        now = datetime.utcnow()
        rows = []

        severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
        statuses = ["OPEN", "ACKNOWLEDGED", "RESOLVED"]

        for team_id in self.team_ids:
            for day in range(days_back):
                for _ in range(incidents_per_day):
                    created_at = now - timedelta(days=day, hours=random.randint(0, 23))
                    status = random.choice(statuses)
                    severity = random.choice(severities)
                    service_name = random.choice(list(SERVICES.keys()))

                    resolved_at = None
                    acknowledged_at = None
                    acknowledged_by = None

                    if status in ["ACKNOWLEDGED", "RESOLVED"]:
                        acknowledged_at = created_at + timedelta(minutes=random.randint(5, 60))
                        acknowledged_by = "demo@observex.io"
                    if status == "RESOLVED":
                        resolved_at = acknowledged_at + timedelta(minutes=random.randint(30, 240))

                    rows.append([
                        team_id, str(uuid.uuid4()), str(uuid.uuid4()),
                        f"{severity} alert: {service_name} - High error rate",
                        f"Error rate exceeded threshold for {service_name}",
                        severity, "P1" if severity == "CRITICAL" else "P2",
                        status, "prometheus", service_name,
                        created_at, created_at, resolved_at,
                        acknowledged_at, acknowledged_by, {}
                    ])

        if rows:
            self.client.insert("incidents", rows, column_names=[
                "team_id", "incident_id", "alert_policy_id", "title", "description",
                "severity", "priority", "status", "source", "service_name",
                "created_at", "updated_at", "resolved_at", "acknowledged_at",
                "acknowledged_by", "attributes"
            ])

        print(f"  ✓ Inserted {len(rows):,} incidents")

    def run(self, clear: bool = False, hours_back: int = 24):
        """Run the data generation for 3 tables: spans, logs, incidents."""
        print("\n" + "="*60)
        print("🚀 ClickHouse Data Generator (Simplified Schema)")
        print("   Tables: spans, logs, incidents")
        print("="*60)

        if clear:
            self.clear_data()

        self.generate_spans(hours_back=hours_back)
        self.generate_logs(hours_back=hours_back)
        self.generate_incidents()

        print("\n" + "="*60)
        print("✅ Data generation complete!")
        print("="*60)


def main():
    parser = argparse.ArgumentParser(description="Generate ClickHouse data for ObserveX")
    parser.add_argument("--host", default="localhost", help="ClickHouse host")
    parser.add_argument("--port", type=int, default=8123, help="ClickHouse HTTP port")
    parser.add_argument("--database", default="observex", help="Database name")
    parser.add_argument("--user", default="observex", help="Username")
    parser.add_argument("--password", default="observex123", help="Password")
    parser.add_argument("--clear", action="store_true", help="Clear existing data")
    parser.add_argument("--hours", type=int, default=24, help="Hours of data to generate")
    parser.add_argument("--team-ids", nargs="+", help="Team UUIDs to use")
    parser.add_argument("--api-url", default="http://localhost:13000", help="Backend API URL")
    parser.add_argument("--auth-token", help="JWT authentication token (if provided, uses API ingestion)")

    args = parser.parse_args()

    generator = ClickHouseDataGenerator(
        host=args.host, port=args.port, database=args.database,
        user=args.user, password=args.password,
        api_url=args.api_url, auth_token=args.auth_token
    )

    # Use provided team IDs or generate sample ones
    if args.team_ids:
        generator.set_team_ids(args.team_ids)
    else:
        # Default sample team IDs
        generator.set_team_ids([
            "11111111-1111-1111-1111-111111111111",
            "22222222-2222-2222-2222-222222222222",
        ])

    if args.auth_token:
        print("  ℹ️  Using REST API ingestion endpoints")
    else:
        print("  ℹ️  Using direct ClickHouse insertion")

    generator.run(clear=args.clear, hours_back=args.hours)


if __name__ == "__main__":
    main()

