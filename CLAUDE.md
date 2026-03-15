# StudyBuddy — Claude Code Project Guide

## Purpose
StudyBuddy is a university collaborative learning platform where students can form study groups, match with complementary teammates, attend expert sessions (video via Jitsi), and communicate in real-time. It has a Spring Boot backend, React web frontend, and Expo React Native mobile app.

## Architecture

### Backend (Spring Boot 3.2.0 / Java 17)
- **Location:** `src/main/java/com/studybuddy/`
- **Pattern:** Controller → Service → Repository (standard Spring layering)
- **Database:** H2 (dev), PostgreSQL 15 (prod via Docker)
- **Auth:** JWT (HMAC-SHA256) + Google OAuth2
- **Real-time:** WebSocket via STOMP/SockJS
- **Email:** SendGrid SMTP
- **Video:** Jitsi JaaS (JWT-signed meeting links)
- **Async:** ThreadPoolTaskExecutor for group profile recalculation

### Frontend (React 18 / TypeScript / Vite)
- **Location:** `frontend/`
- **State:** React Context (Auth, Theme, Toast) — no Redux
- **Styling:** Tailwind CSS with custom components
- **API:** Axios with JWT interceptor
- **Real-time:** STOMP WebSocket hooks
- **Build:** `npm run dev` (port 3000), `npm run build`

### Mobile (Expo 54 / React Native)
- **Location:** `studybuddy-mobile/`
- **State:** React Context + React Query (TanStack)
- **Forms:** React Hook Form + Zod validation
- **Navigation:** React Navigation (tabs + stack)
- **Token storage:** Expo Secure Store (encrypted)

## Key Modules (Backend)
| Module | Purpose |
|--------|---------|
| `auth/` | Registration, login, OAuth2, email verification |
| `group/` | Study group CRUD, membership, join requests |
| `matching/` | Cosine-similarity group recommendations |
| `messaging/` | Group chat (WebSocket + REST) |
| `notification/` | In-app notification system |
| `expert/` | Expert profiles, sessions, Q&A, reviews |
| `quiz/` | Personality quiz for matching profiles |
| `admin/` | User management, audit logs, domain whitelist |
| `feed/` | Personalized activity feed |
| `file/` | File upload/download for groups |
| `email/` | SendGrid integration, verification flow |

## Build / Run / Test Commands

### Backend
```bash
# Set JAVA_HOME first
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-17.0.17.10-hotspot"

mvn compile              # Compile
mvn test                 # Run tests
mvn clean package        # Build JAR
mvn spring-boot:run      # Run dev server (port 8080)
```

### Frontend
```bash
cd frontend
npm install
npm run dev              # Dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint check
npm test                 # Vitest
npm run test:coverage    # With coverage
```

### Mobile
```bash
cd studybuddy-mobile
npm install
npx expo start           # Dev server
```

### Docker (full stack)
```bash
docker-compose up --build
```

## Configuration
- All config is environment-variable driven (see `env.example`)
- Spring profiles: `dev` (default), `prod` (set `SPRING_PROFILES_ACTIVE=prod`)
- Dev profile enables H2 console and DEBUG logging
- Prod profile uses `ddl-auto=validate` and INFO logging

## Critical Rules

### Must Preserve
- **Matching algorithm** (`MatchingService`) — gap-filling with cosine similarity is a core differentiator
- **Three-visibility model** for groups: `open`, `approval`, `private`
- **Email verification flow** — required before login for non-OAuth users
- **STOMP WebSocket protocol** — both web and mobile depend on it
- **JWT auth flow** — stateless, no session cookies

### Danger Zones
- `GroupController` — complex membership logic, many null-safety edge cases
- `SecurityConfig` — changes here affect all auth; test thoroughly
- `NotificationService` — called from many controllers; transactional boundaries matter
- `MatchingService` — math-heavy; changes affect recommendation quality
- `application.properties` — `ddl-auto` MUST be `update` (dev) or `validate` (prod), NEVER `create` in production

### Code Standards
- Use `@Transactional` on all service write methods
- Always null-check entity relationships (`.getCreator()`, `.getMembers()`, `.getCourse()`)
- Return `Map<String, Object>` from controllers to avoid Jackson circular reference issues
- Use environment variables for all secrets and environment-specific config
- Log at appropriate levels: ERROR for failures, INFO for operations, DEBUG for dev detail

## Testing
- Backend: JUnit 5 + Mockito + MockMvc (23 test files, ~33% coverage)
- Frontend: Vitest + React Testing Library + MSW (3 test files, low coverage)
- Mobile: No tests yet
- CI: GitHub Actions (`.github/workflows/ci.yml`)
