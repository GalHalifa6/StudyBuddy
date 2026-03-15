#!/bin/bash

echo "=========================================="
echo "   StudyBuddy Backend - MVP"
echo "=========================================="
echo ""

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo "Maven is not installed. Please install Maven first."
    exit 1
fi

# Check Java version
if ! command -v java &> /dev/null; then
    echo "Java is not installed. Please install Java 17 or higher."
    exit 1
fi

echo "Building the project..."
mvn clean install -DskipTests

if [ $? -eq 0 ]; then
    echo ""
    echo "Build successful! Starting the application..."
    echo ""
    echo "Application will be available at: http://localhost:8080"
    echo "Swagger UI: http://localhost:8080/swagger-ui.html"
    echo "H2 Console: http://localhost:8080/h2-console"
    echo ""
    mvn spring-boot:run
else
    echo "Build failed. Please check the error messages above."
    exit 1
fi
