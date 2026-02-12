# Runtime only - expects pre-built JAR from local build
FROM amazoncorretto:17-alpine
WORKDIR /app

# Add non-root user
RUN addgroup -S observex && adduser -S observex -G observex

# Copy pre-built JAR from local target directory
COPY target/*.jar app.jar

# Change ownership
RUN chown observex:observex app.jar

USER observex

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

EXPOSE 8080

# JVM options
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

