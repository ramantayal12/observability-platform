package com.sample;

import com.observability.client.ObservabilityClient;
import com.observability.client.config.ObservabilityConfig;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import com.observability.client.interceptor.ObservabilityFilter;

@SpringBootApplication
public class SampleApplication {

    @Value("${observability.backend-url}")
    private String backendUrl;

    @Value("${observability.service-name}")
    private String serviceName;

    @Value("${observability.api-key:}")
    private String apiKey;

    public static void main(String[] args) {
        SpringApplication.run(SampleApplication.class, args);
    }

    @PostConstruct
    public void initObservability() {
        ObservabilityConfig config = ObservabilityConfig.builder()
                .backendUrl(backendUrl)
                .serviceName(serviceName)
                .apiKey(apiKey.isEmpty() ? null : apiKey)
                .metricsEnabled(true)
                .logsEnabled(true)
                .tracingEnabled(true)
                .batchSize(50)
                .flushIntervalMs(5000)
                .build();

        ObservabilityClient.initialize(config);
        System.out.println("✅ Observability initialized for service: " + serviceName);
    }

    @PreDestroy
    public void shutdownObservability() {
        if (ObservabilityClient.getInstance() != null) {
            ObservabilityClient.getInstance().shutdown();
        }
    }

    @Bean
    public FilterRegistrationBean<ObservabilityFilter> observabilityFilter() {
        FilterRegistrationBean<ObservabilityFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new ObservabilityFilter());
        registrationBean.addUrlPatterns("/*");
        registrationBean.setOrder(1);
        return registrationBean;
    }
}
