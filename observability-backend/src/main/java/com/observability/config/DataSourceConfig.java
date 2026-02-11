package com.observability.config;

import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

/**
 * DataSource configuration to ensure MySQL is the primary datasource for JPA.
 * ClickHouse is configured separately and used only for time-series data.
 */
@Configuration
public class DataSourceConfig {

    /**
     * Primary datasource properties from spring.datasource.*
     */
    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource")
    public DataSourceProperties dataSourceProperties() {
        return new DataSourceProperties();
    }

    /**
     * Primary datasource bean for JPA/Hibernate
     * This ensures JPA entities use MySQL, not ClickHouse
     */
    @Bean
    @Primary
    public DataSource dataSource(DataSourceProperties dataSourceProperties) {
        return dataSourceProperties.initializeDataSourceBuilder().build();
    }
}

