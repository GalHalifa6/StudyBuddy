# StudyBuddy Backend - MVP

## Overview
StudyBuddy is a collaborative learning platform designed to help university students find compatible study partners, form effective study groups, and coordinate their learning activities.

## Technology Stack
- **Framework**: Spring Boot 3.2.0
- **Java Version**: 17
- **Database**: H2 (Development), PostgreSQL (Production)
- **Security**: Spring Security + JWT
- **Build Tool**: Maven
- **Documentation**: Springdoc OpenAPI (Swagger)

## Project Structure
```
studybuddy-backend/
├── src/main/java/com/studybuddy/
│   ├── StudyBuddyApplication.java      # Main application entry point
│   ├── config/                          # Configuration classes
│   │   ├── SecurityConfig.java         # Spring Security configuration
│   │   ├── WebConfig.java              # CORS and Web MVC configuration
│   │   └── ModelMapperConfig.java      # ModelMapper bean configuration
│   ├── controller/                      # REST API Controllers
│   │   ├── AuthController.java         # Authentication endpoints
│   │   ├── CourseController.java       # Course management endpoints
│   │   ├── GroupController.java        # Study group endpoints
│   │   ├── MessageController.java      # Chat/messaging endpoints
│   │   ├── FileController.java         # File upload/download endpoints
│   │   └── MatchingController.java     # Group matching/recommendation endpoints
│   ├── model/                           # JPA Entity models
│   │   ├── User.java                   # User entity
│   │   ├── Course.java                 # Course entity
│   │   ├── StudyGroup.java             # Study group entity
│   │   ├── Message.java                # Chat message entity
│   │   ├── FileUpload.java             # File upload entity
│   │   ├── RoomShare.java              # Room sharing entity
│   │   └── ChatSummary.java            # Auto-generated chat summary entity
│   ├── repository/                      # JPA Repositories
│   │   ├── UserRepository.java
│   │   ├── CourseRepository.java
│   │   ├── StudyGroupRepository.java
│   │   ├── MessageRepository.java
│   │   ├── FileUploadRepository.java
│   │   ├── RoomShareRepository.java
│   │   └── ChatSummaryRepository.java
│   ├── service/                         # Business logic layer
│   │   ├── UserService.java
│   │   ├── CourseService.java
│   │   ├── StudyGroupService.java
│   │   ├── MessageService.java
│   │   ├── FileService.java
│   │   ├── MatchingService.java         # NLP-based matching service
│   │   └── NLPService.java              # NLP utilities (embeddings, summarization)
│   ├── security/                        # Security components
│   │   ├── JwtUtils.java                # JWT token utilities
│   │   ├── JwtAuthenticationFilter.java # JWT filter
│   │   └── UserDetailsServiceImpl.java  # User details service
│   └── dto/                             # Data Transfer Objects
│       ├── AuthDto.java                 # Authentication DTOs
│       ├── CourseDto.java               # Course DTOs
│       ├── GroupDto.java                # Group DTOs
│       ├── MessageDto.java              # Message DTOs
│       └── MatchingDto.java             # Matching DTOs
├── src/main/resources/
│   └── application.properties           # Application configuration
├── pom.xml                              # Maven dependencies
└── README.md                            # This file
```

## Core Features (MVP)

### 1. Authentication & User Management
- User registration and login with JWT authentication
- User profile management with learning preferences
- Profile embeddings for intelligent matching

### 2. Course Management
- Course creation and discovery
- Course enrollment
- Course lobbies for group discovery

### 3. Study Group Management
- Create/join/leave study groups
- Smart group recommendations based on NLP matching
- Group visibility settings (open, approval-based, private)
- Member management and roles

### 4. Chat & Messaging
- Real-time group chat
- Message history
- Pinned messages
- Auto-generated chat summaries with action items

### 5. File Sharing
- Upload and share study materials within groups
- File storage and retrieval
- Q&A over uploaded materials (simplified in MVP)

### 6. Room Sharing
- Share physical study spaces with other groups
- Coordinate in-person study sessions
- Availability tracking

### 7. NLP-Powered Features
- Intelligent group matching based on user profiles
- Automatic chat summarization
- Action item extraction
- Content-based file search (simplified in MVP)

## Getting Started

### Prerequisites
- Java 17 or higher
- Maven 3.6+
- (Optional) PostgreSQL for production database

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd studybuddy-backend
   ```

2. **Build the project**
   ```bash
   mvn clean install
   ```

3. **Run the application**
   ```bash
   mvn spring-boot:run
   ```

   The application will start on `http://localhost:8080`

### Configuration

Edit `src/main/resources/application.properties` to configure:
- Database connection
- JWT secret and expiration
- File upload settings
- CORS origins
- Logging levels

### Database

#### H2 Console (Development)
- Access the H2 console at: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:file:./data/studybuddy`
- Username: `sa`
- Password: (leave blank)

#### PostgreSQL (Production)
Update `application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/studybuddy
spring.datasource.username=your_username
spring.datasource.password=your_password
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
```

## API Documentation

Once the application is running, access the Swagger UI at:
```
http://localhost:8080/swagger-ui.html
```

### Main API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `PUT /api/auth/profile` - Update user profile

#### Courses
- `GET /api/courses` - List all courses
- `POST /api/courses` - Create a new course
- `GET /api/courses/{id}` - Get course details
- `POST /api/courses/{id}/enroll` - Enroll in a course

#### Groups
- `GET /api/groups/course/{courseId}` - Get all groups for a course
- `POST /api/groups` - Create a new study group
- `GET /api/groups/{id}` - Get group details
- `POST /api/groups/{id}/join` - Join a group
- `POST /api/groups/{id}/leave` - Leave a group

#### Matching
- `POST /api/matching/recommend` - Get personalized group recommendations
- `POST /api/matching/find-buddies` - Find compatible study partners

#### Messages
- `GET /api/messages/group/{groupId}` - Get group chat history
- `POST /api/messages` - Send a message
- `POST /api/messages/{groupId}/summarize` - Generate chat summary

#### Files
- `POST /api/files/upload` - Upload a file to a group
- `GET /api/files/group/{groupId}` - List group files
- `GET /api/files/{id}/download` - Download a file

#### Room Sharing
- `POST /api/rooms` - Create a room share offer
- `GET /api/rooms/available` - Get available room shares
- `POST /api/rooms/{id}/request` - Request to share a room

## Development Notes

### NLP Features (MVP Implementation)
For the MVP, NLP features use simplified implementations:
- **Embeddings**: Hash-based pseudo-embeddings (replace with sentence-transformers in production)
- **Summarization**: Rule-based extractive summarization (replace with abstractive models in production)
- **Q&A**: Simple keyword matching (replace with RAG pipeline in production)

### Production Enhancements
To make this production-ready, consider:
1. Implementing real sentence transformers for embeddings
2. Adding Redis for caching and session management
3. Implementing WebSocket for real-time chat
4. Adding file storage service (AWS S3, etc.)
5. Implementing proper logging and monitoring
6. Adding rate limiting and API throttling
7. Implementing comprehensive test suite
8. Setting up CI/CD pipeline
9. Adding database migrations (Flyway/Liquibase)
10. Implementing proper error handling and validation

## Security

- Passwords are hashed using BCrypt
- JWT tokens for stateless authentication
- CORS configured for frontend origins
- Input validation on all endpoints
- SQL injection protection via JPA/Hibernate

## Testing

Run tests with:
```bash
mvn test
```

## Building for Production

1. Update `application.properties` for production settings
2. Build the JAR file:
   ```bash
   mvn clean package -DskipTests
   ```
3. Run the JAR:
   ```bash
   java -jar target/studybuddy-backend-1.0.0.jar
   ```

## Environment Variables

For production, use environment variables instead of hardcoded values:
```bash
export JWT_SECRET=your-secret-key
export DB_URL=jdbc:postgresql://localhost:5432/studybuddy
export DB_USERNAME=your_username
export DB_PASSWORD=your_password
```

## License

[Specify your license]

## Contributors

- Amit Asher
- Ron Kadosh
- Gal Halifa
- Keren Greenberg

## Support

For issues and questions, please open an issue on the GitHub repository.
