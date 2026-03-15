# Multi-stage build for StudyBuddy Backend
# Stage 1: Build the application
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and download dependencies (cached layer)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create non-root user and pre-create uploads directory with correct ownership
RUN addgroup -S spring && adduser -S spring -G spring && mkdir -p /app/uploads && chown -R spring:spring /app
USER spring:spring

# Copy the built JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port
EXPOSE 8080

# Install curl for health check (Alpine minimal images don't include it)
USER root
RUN apk add --no-cache curl
USER spring:spring

# Health check using unauthenticated endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

