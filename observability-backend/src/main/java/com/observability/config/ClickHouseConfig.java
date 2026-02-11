package com.observability.config;

import com.clickhouse.jdbc.ClickHouseDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.Properties;

/**
 * ClickHouse configuration for high-performance time-series data storage.
 * Used for metrics, logs, traces, and spans.
 * Note: This is NOT the primary datasource - MySQL is used for JPA entities.
 */
@Configuration
public class ClickHouseConfig {

    @Value("${clickhouse.host:localhost}")
    private String host;

    @Value("${clickhouse.port:8123}")
    private int port;

    @Value("${clickhouse.database:observex}")
    private String database;

    @Value("${clickhouse.user:observex}")
    private String user;

    @Value("${clickhouse.password:observex123}")
    private String password;

    @Value("${clickhouse.socket-timeout:300000}")
    private int socketTimeout;

    @Value("${clickhouse.connection-timeout:10000}")
    private int connectionTimeout;

    @Bean(name = "clickHouseDataSource")
    public DataSource clickHouseDataSource() throws SQLException {
        String url = String.format("jdbc:clickhouse://%s:%d/%s", host, port, database);

        Properties properties = new Properties();
        properties.setProperty("user", user);
        properties.setProperty("password", password);
        properties.setProperty("socket_timeout", String.valueOf(socketTimeout));
        properties.setProperty("connection_timeout", String.valueOf(connectionTimeout));
        properties.setProperty("compress", "true");
        properties.setProperty("decompress", "true");

        return new ClickHouseDataSource(url, properties);
    }

    @Bean(name = "clickHouseJdbcTemplate")
    public JdbcTemplate clickHouseJdbcTemplate(@Qualifier("clickHouseDataSource") DataSource clickHouseDataSource) {
        JdbcTemplate jdbcTemplate = new JdbcTemplate(clickHouseDataSource);
        jdbcTemplate.setQueryTimeout(60); // 60 seconds query timeout
        return jdbcTemplate;
    }
}

