# StudyBuddy Backend - Quick Start Guide

## Prerequisites
- Java 17 or higher
- Maven 3.6+

## Quick Start (Linux/Mac)

1. Extract the ZIP file
2. Navigate to the project directory:
   ```bash
   cd studybuddy-backend
   ```

3. Run the application:
   ```bash
   ./run.sh
   ```

## Quick Start (Windows)

1. Extract the ZIP file
2. Open Command Prompt and navigate to the project directory
3. Run:
   ```cmd
   mvn clean install -DskipTests
   mvn spring-boot:run
   ```

## Access the Application

Once running, access:
- **API Base**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **H2 Console**: http://localhost:8080/h2-console
  - JDBC URL: `jdbc:h2:file:./data/studybuddy`
  - Username: `sa`
  - Password: (leave blank)

## Testing the API

### 1. Register a User
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "password123",
    "fullName": "John Doe"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "password123"
  }'
```

Save the returned JWT token!

### 3. Create a Course
```bash
curl -X POST http://localhost:8080/api/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": "CS101",
    "name": "Introduction to Computer Science",
    "description": "Fundamental concepts of computer science",
    "faculty": "Engineering",
    "semester": "Fall 2024"
  }'
```

### 4. Create a Study Group
```bash
curl -X POST http://localhost:8080/api/groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Algorithms Study Group",
    "description": "Weekly study sessions for algorithms",
    "topic": "Data Structures and Algorithms",
    "maxSize": 5,
    "visibility": "open",
    "course": {"id": 1}
  }'
```

## Project Structure

```
studybuddy-backend/
├── src/main/java/com/studybuddy/
│   ├── StudyBuddyApplication.java    # Main application
│   ├── config/                        # Configuration
│   ├── controller/                    # REST Controllers
│   ├── model/                         # JPA Entities
│   ├── repository/                    # Data Access Layer
│   ├── security/                      # Security & JWT
│   └── dto/                           # Data Transfer Objects
├── src/main/resources/
│   └── application.properties         # Configuration
├── pom.xml                            # Maven dependencies
├── README.md                          # Full documentation
└── QUICKSTART.md                      # This file
```

## Key Features Implemented

✅ User Registration & Authentication (JWT)
✅ User Profile Management
✅ Course Management
✅ Study Group Creation & Management
✅ Group Membership (Join/Leave)
✅ H2 Database (easily switchable to PostgreSQL)
✅ RESTful API
✅ Swagger API Documentation
✅ CORS Configuration
✅ Password Encryption

## Next Steps

1. Review the full `README.md` for detailed documentation
2. Explore the Swagger UI for all available endpoints
3. Add more features:
   - Chat/Messaging system
   - File upload functionality
   - NLP-based matching algorithm
   - Room sharing feature
   - WebSocket for real-time chat

## Troubleshooting

### Port 8080 already in use
Change the port in `application.properties`:
```properties
server.port=8081
```

### Maven build fails
Ensure you have Java 17:
```bash
java -version
```

### Database issues
Delete the `data/` directory and restart to reset the database.

## Support

For issues, refer to the main `README.md` or check the application logs.
