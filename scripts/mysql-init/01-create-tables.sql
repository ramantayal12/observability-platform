-- MySQL Schema for ObserveX
-- Core tables for multi-tenant observability platform

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(50) UNIQUE,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    plan VARCHAR(50),
    max_teams INT,
    max_users_per_team INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50),
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    color VARCHAR(50),
    icon VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_team_org (organization_id),
    INDEX idx_team_slug (slug),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_org (organization_id),
    INDEX idx_user_email (email),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User-Team membership table
CREATE TABLE IF NOT EXISTS user_teams (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    team_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_team_user (user_id),
    INDEX idx_user_team_team (team_id),
    UNIQUE KEY uk_user_team (user_id, team_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    team_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20),
    last_seen DATETIME NOT NULL,
    first_seen DATETIME NOT NULL,
    metric_count BIGINT,
    log_count BIGINT,
    trace_count BIGINT,
    error_count BIGINT,
    error_rate DOUBLE,
    version VARCHAR(255),
    environment VARCHAR(50),
    metadata JSON,
    INDEX idx_services_org (organization_id),
    INDEX idx_services_team (team_id),
    INDEX idx_services_name (name),
    UNIQUE KEY uk_service_team_name (team_id, name),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API Endpoints table
CREATE TABLE IF NOT EXISTS api_endpoints (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    base_latency DOUBLE NOT NULL,
    base_throughput DOUBLE NOT NULL,
    base_error_rate DOUBLE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_api_endpoints_team (team_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    team_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    type VARCHAR(20) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    service_name VARCHAR(100),
    `condition` VARCHAR(500),
    metric VARCHAR(100),
    operator VARCHAR(20),
    threshold DOUBLE,
    duration_minutes INT,
    current_value DOUBLE,
    triggered_by VARCHAR(255),
    triggered_at DATETIME,
    acknowledged_at DATETIME,
    acknowledged_by VARCHAR(255),
    resolved_at DATETIME,
    resolved_by VARCHAR(255),
    muted_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_alert_org (organization_id),
    INDEX idx_alert_team (team_id),
    INDEX idx_alert_status (status),
    INDEX idx_alert_severity (severity),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Team Overview Data table
CREATE TABLE IF NOT EXISTS team_overview_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    timestamp DATETIME NOT NULL,
    avg_latency DOUBLE,
    throughput DOUBLE,
    error_rate DOUBLE,
    active_services INT,
    total_requests BIGINT,
    error_count BIGINT,
    cpu_usage DOUBLE,
    memory_usage DOUBLE,
    INDEX idx_team_overview_team (team_id),
    INDEX idx_team_overview_timestamp (timestamp),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chart Configurations table
CREATE TABLE IF NOT EXISTS chart_configs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    page_type VARCHAR(50) NOT NULL,
    chart_id VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    chart_type VARCHAR(20) NOT NULL DEFAULT 'line',
    unit VARCHAR(20),
    data_key VARCHAR(50) NOT NULL,
    percentile INT,
    display_order INT NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_chart_config_team_page (team_id, page_type),
    INDEX idx_chart_config_team (team_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

