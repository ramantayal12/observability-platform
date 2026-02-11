# Runtime stage - Use pre-built JAR from local build
# Use amazoncorretto which has better ARM64 support
FROM amazoncorretto:17-alpine
WORKDIR /app

# Install wget for health checks
RUN apk add --no-cache wget

# Add non-root user for security
RUN addgroup -S observex && adduser -S observex -G observex

# Copy the pre-built JAR from local target directory
COPY target/*.jar app.jar

# Change ownership
RUN chown observex:observex app.jar

USER observex

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Expose port
EXPOSE 8080

# JVM options for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

