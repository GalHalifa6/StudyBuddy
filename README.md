# StudyBuddy

A comprehensive collaborative learning platform for university students to find study partners, form groups, and coordinate learning activities.

## Overview

StudyBuddy helps students connect with compatible study partners, create and join study groups, share materials, access expert tutoring, and collaborate in real-time. The platform includes a Spring Boot backend, React web application, and React Native mobile app.

## Features

- **Smart Matching** - Find compatible study partners using intelligent matching algorithms
- **Study Groups** - Create, discover, and join study groups with real-time chat
- **Expert Sessions** - Book tutoring sessions with verified experts via video conferencing
- **Q&A Community** - Ask and answer questions with voting system
- **Quiz System** - Create and take quizzes for self-assessment
- **File Sharing** - Share study materials within groups
- **Real-time Messaging** - Group chat and direct messages via WebSocket
- **Course Management** - Organize groups and content by course
- **Admin Panel** - User management, expert verification, and audit logs

## Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Spring Boot | 3.2.0 | REST API framework |
| Java | 17 | Programming language |
| Spring Security | - | Authentication & authorization |
| JWT | 0.12.3 | Token-based auth |
| OAuth2 | - | Google SSO |
| WebSocket/STOMP | - | Real-time messaging |
| JPA/Hibernate | - | ORM |
| H2/PostgreSQL | - | Database |
| Springdoc OpenAPI | 2.3.0 | API documentation |

### Frontend (Web)
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI framework |
| TypeScript | 5.2.2 | Type safety |
| Vite | 5.0.8 | Build tool |
| Tailwind CSS | 3.4.0 | Styling |
| React Router | 6.21.0 | Navigation |
| Axios | 1.6.2 | HTTP client |
| STOMP.js | 7.2.1 | WebSocket client |

### Mobile App
| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.5 | Mobile framework |
| Expo | 54.0.0 | Development platform |
| TypeScript | 5.9.2 | Type safety |
| React Navigation | - | Navigation |
| React Query | 4.35.10 | Data fetching |
| React Hook Form | 7.51.5 | Form handling |

## Project Structure

```
StudyBuddy/
├── src/main/java/com/studybuddy/    # Backend (Java)
│   ├── config/                       # Spring configuration
│   ├── controller/                   # REST API controllers (21)
│   ├── model/                        # JPA entities (34)
│   ├── repository/                   # Data access (30)
│   ├── service/                      # Business logic (13)
│   ├── security/                     # JWT & auth
│   └── dto/                          # Data transfer objects
├── frontend/                         # Web app (React)
│   └── src/
│       ├── api/                      # API services (18)
│       ├── pages/                    # Page components (31)
│       ├── components/               # Reusable UI
│       ├── context/                  # Auth, Theme, Toast
│       └── hooks/                    # Custom hooks
├── studybuddy-mobile/                # Mobile app (React Native)
│   └── src/
│       ├── api/                      # API services (17)
│       ├── features/                 # Feature modules (13)
│       ├── components/               # Reusable UI
│       ├── navigation/               # Navigation setup
│       └── auth/                     # Auth context
├── src/test/                         # Backend tests
└── .github/workflows/                # CI/CD pipeline
```

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+
- Maven 3.6+
- (Optional) PostgreSQL for production

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/StudyBuddy.git
cd StudyBuddy
```

### Running the Backend

```bash
# Build and run
mvn clean install
mvn spring-boot:run
```

The API will be available at `http://localhost:8080`

**API Documentation:** `http://localhost:8080/swagger-ui.html`

**H2 Console (dev):** `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:file:./data/studybuddy`
- Username: `sa`
- Password: (blank)

### Running the Web Frontend

```bash
cd frontend
npm install
npm run dev
```

The web app will be available at `http://localhost:5173`

### Running the Mobile App

```bash
cd studybuddy-mobile
npm install
npx expo start
```

Scan the QR code with Expo Go app or press:
- `a` for Android emulator
- `i` for iOS simulator
- `w` for web browser

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/google` | Google OAuth login |
| PUT | `/api/auth/profile` | Update profile |
| POST | `/api/auth/verify-email` | Verify email |

### Courses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | List all courses |
| POST | `/api/courses` | Create course |
| GET | `/api/courses/{id}` | Get course details |
| POST | `/api/courses/{id}/enroll` | Enroll in course |

### Study Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups/course/{courseId}` | List groups for course |
| POST | `/api/groups` | Create group |
| GET | `/api/groups/{id}` | Get group details |
| POST | `/api/groups/{id}/join` | Join group |
| POST | `/api/groups/{id}/leave` | Leave group |

### Matching
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/matching/recommend` | Get group recommendations |
| POST | `/api/matching/find-buddies` | Find study partners |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/group/{groupId}` | Get group messages |
| POST | `/api/messages` | Send message |
| WebSocket | `/ws` | Real-time messaging |

### Expert System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/experts` | List experts |
| POST | `/api/experts/sessions` | Book session |
| GET | `/api/experts/sessions/upcoming` | Get upcoming sessions |

### Quizzes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quiz` | List quizzes |
| POST | `/api/quiz` | Create quiz |
| POST | `/api/quiz/{id}/submit` | Submit quiz answers |

## Testing

### Backend Tests

```bash
# Run all tests
mvn test

# Run with coverage report
mvn test jacoco:report

# Run unit tests only
mvn test -Dtest="com.studybuddy.test.unit.*"

# Run integration tests only
mvn test -Dtest="com.studybuddy.test.integration.*"
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Configuration

### Backend Configuration

Edit `src/main/resources/application.properties`:

```properties
# Database (Production)
spring.datasource.url=jdbc:postgresql://localhost:5432/studybuddy
spring.datasource.username=your_username
spring.datasource.password=your_password

# JWT
jwt.secret=your-secret-key
jwt.expiration=86400000

# Google OAuth
spring.security.oauth2.client.registration.google.client-id=your-client-id
spring.security.oauth2.client.registration.google.client-secret=your-client-secret
```

### Environment Variables

```bash
export JWT_SECRET=your-secret-key
export DB_URL=jdbc:postgresql://localhost:5432/studybuddy
export DB_USERNAME=your_username
export DB_PASSWORD=your_password
export GOOGLE_CLIENT_ID=your-google-client-id
export GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Building for Production

### Backend

```bash
mvn clean package -DskipTests
java -jar target/studybuddy-backend-1.0.0.jar
```

### Frontend

```bash
cd frontend
npm run build
```

Build output will be in `frontend/dist/`

### Mobile App

```bash
cd studybuddy-mobile
npx expo build:android  # For Android APK
npx expo build:ios      # For iOS IPA
```

## Security

- BCrypt password hashing
- JWT token authentication
- OAuth2 Google SSO
- CORS protection
- Input validation
- SQL injection protection via JPA
- XSS protection

## CI/CD

The project uses GitHub Actions for continuous integration:
- Automated testing on pull requests
- Code coverage reporting via Codecov
- Build verification

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Contributors

- Amit Asher
- Ron Kadosh
- Gal Halifa
- Keren Greenberg

## License

This project is licensed under the MIT License - see the LICENSE file for details.
