# StudyBuddy Platform - Runbook

Complete setup and run instructions for the StudyBuddy monorepo (Backend + Web + Mobile).

---

## 📋 Prerequisites

### Required Software
- **Java 17+** (for Spring Boot backend)
- **Maven 3.8+** (for backend build)
- **Node.js 18+** (for web and mobile)
- **npm** or **yarn** (package manager)
- **Expo CLI** (for mobile development)
- **Git**

### Optional
- **PostgreSQL** (for production; H2 used by default for development)
- **Android Studio** / **Xcode** (for native mobile builds)

---

## 🗂️ Project Structure

```
studybuddy-backend/
├── src/main/java/com/studybuddy/    # Spring Boot backend
├── frontend/                         # React + Vite + Tailwind web app
└── studybuddy-mobile/               # Expo React Native mobile app
```

---

## 🚀 Quick Start

### 1. Backend Setup

#### 1.1. Configure Environment

```bash
# Navigate to backend root
cd studybuddy-backend

# Copy application.properties.example if not exists
# (Backend uses H2 database by default, no setup needed)
```

#### 1.2. Build Backend

```bash
# Using Maven
mvn clean install

# Or use the provided script (if available)
./run.sh
```

#### 1.3. Run Backend

```bash
# Option 1: Maven
mvn spring-boot:run

# Option 2: Run JAR (after building)
java -jar target/studybuddy-*.jar

# Default: http://localhost:8080
```

#### 1.4. Verify Backend

- API: http://localhost:8080/api
- H2 Console: http://localhost:8080/h2-console
  - JDBC URL: `jdbc:h2:file:./data/studybuddy`
  - Username: `sa`
  - Password: (empty)

---

### 2. Web Frontend Setup

#### 2.1. Navigate to Frontend

```bash
cd frontend
```

#### 2.2. Install Dependencies

```bash
npm install
# or
yarn install
```

#### 2.3. Configure Environment

Create `.env` file in `frontend/`:

```env
# API Base URL (without /api suffix)
VITE_API_BASE_URL=http://localhost:8080

# Optional: WebSocket Base URL (defaults to API_BASE_URL)
# VITE_WS_BASE_URL=ws://localhost:8080
```

#### 2.4. Run Development Server

```bash
npm run dev
# or
yarn dev

# Default: http://localhost:5173
```

#### 2.5. Build for Production

```bash
npm run build
# Output: frontend/dist/
```

---

### 3. Mobile App Setup

#### 3.1. Navigate to Mobile

```bash
cd studybuddy-mobile
```

#### 3.2. Install Dependencies

```bash
npm install
# or
yarn install
```

#### 3.3. Configure Environment

Option A: Environment Variables (recommended)

Create `.env` file in `studybuddy-mobile/`:

```env
# API Base URL (use your machine's IP for physical devices)
# For localhost testing on emulator:
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080

# For physical device testing, replace with your machine's IP:
# EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8080

# Optional: Enable mock mode for development
# USE_MOCKS=false
```

Option B: Expo Config

Edit `app.json` or `app.config.js`:

```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_API_BASE_URL": "http://localhost:8080"
    }
  }
}
```

#### 3.4. Find Your Machine's IP (for Physical Devices)

**Windows:**
```powershell
ipconfig
# Look for IPv4 Address under your network adapter
```

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```

#### 3.5. Run Mobile App

**Option A: Expo Go (Quick Testing)**
```bash
npm start
# or
yarn start

# Scan QR code with Expo Go app (iOS/Android)
```

**Option B: Development Build (Full Features)**
```bash
# iOS
npm run ios
# or
yarn ios

# Android
npm run android
# or
yarn android
```

**Note**: For Jitsi video calls, a development build (not Expo Go) may be required depending on native dependencies.

---

## 🔧 Configuration Details

### Backend Configuration

**File**: `src/main/resources/application.properties`

Key settings:
```properties
# Server
server.port=8080

# Database (H2 for development)
spring.datasource.url=jdbc:h2:file:./data/studybuddy
spring.datasource.username=sa
spring.datasource.password=

# JWT
jwt.secret=your-secret-key-change-in-production
jwt.expiration=86400000

# CORS (allows all origins in development)
cors.allowed-origins=*

# File Uploads
file.upload-dir=./uploads
spring.servlet.multipart.max-file-size=50MB
```

### Frontend Configuration

**File**: `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8080
```

### Mobile Configuration

**File**: `studybuddy-mobile/.env` or `app.json`

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_MACHINE_IP:8080
```

**Important**: Use your machine's IP address (not `localhost`) when testing on physical devices!

---

## 🌐 Network Configuration

### CORS Settings

Backend is configured to allow all origins (`*`) in development. For production, update `SecurityConfig.java`:

```java
configuration.setAllowedOriginPatterns(Arrays.asList(
    "https://yourdomain.com",
    "https://app.yourdomain.com"
));
```

### WebSocket

- **Endpoint**: `ws://localhost:8080/ws`
- **Protocol**: STOMP over SockJS
- **Topics**: 
  - `/topic/group/{groupId}` - Group messages
  - `/topic/session/{sessionId}/chat` - Session chat
  - `/topic/dm/{conversationId}` - Direct messages

---

## 📱 Mobile Development Notes

### Testing on Physical Devices

1. **Ensure backend allows your device's origin**:
   - Backend CORS is set to `*` by default (allows all)
   
2. **Use your machine's IP address**:
   - Find IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Update mobile `.env`: `EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:8080`

3. **Firewall**: Ensure port 8080 is accessible from your device

4. **Same Network**: Device and computer must be on same WiFi network

### Expo Go Limitations

- ✅ Most features work in Expo Go
- ⚠️ Jitsi video may require development build
- ⚠️ Some native modules may not work

### Creating Development Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build for your platform
eas build --profile development --platform ios
eas build --profile development --platform android
```

---

## 🧪 Testing

### Backend Tests

```bash
cd studybuddy-backend
mvn test
```

### Frontend Tests

```bash
cd frontend
npm run test
```

### Mobile Tests

```bash
cd studybuddy-mobile
npm run test  # If configured
```

---

## 🗄️ Database

### Development (H2)

- **Type**: File-based H2 database
- **Location**: `./data/studybuddy.mv.db`
- **Console**: http://localhost:8080/h2-console
- **Auto-created**: Database is created automatically on first run

### Production (PostgreSQL)

1. Update `application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/studybuddy
spring.datasource.username=youruser
spring.datasource.password=yourpassword
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
```

2. Add PostgreSQL driver to `pom.xml` (if not present)

3. Run migrations (if using Flyway/Liquibase)

---

## 🔐 Authentication

### Default Test Users

Create users via registration endpoint:
- `POST /api/auth/register`
- Roles: `USER`, `EXPERT`, `ADMIN`

### JWT Token

- **Header**: `Authorization: Bearer <token>`
- **Storage**: 
  - Web: `localStorage.token`
  - Mobile: Secure storage via Expo SecureStore
- **Expiration**: 24 hours (configurable)

---

## 🎥 Video Calls (Jitsi)

### How It Works

1. **Session Creation**: When a session is created/approved, backend generates Jitsi meeting link
2. **Format**: `https://meet.jit.si/studybuddy-{sessionId}-{token}`
3. **Web**: Embedded iframe in SessionRoom
4. **Mobile**: Opens in browser/app via `Linking.openURL()`

### Jitsi Configuration

- **Platform**: Jitsi Meet public instance
- **No API Key Required**: Uses public Jitsi service
- **Customization**: Can be configured in `MeetingService.java`

---

## 🐛 Troubleshooting

### Backend Issues

**Port 8080 already in use:**
```bash
# Change port in application.properties
server.port=8081
```

**Database errors:**
- Delete `./data/studybuddy.mv.db` to reset
- Restart backend to recreate schema

**CORS errors:**
- Verify `SecurityConfig.java` allows your origin
- Check browser console for specific CORS error

### Frontend Issues

**API connection failed:**
- Verify `VITE_API_BASE_URL` in `.env`
- Ensure backend is running
- Check browser console for errors

**WebSocket not connecting:**
- Verify `VITE_WS_BASE_URL` or default to API_BASE_URL
- Check backend WebSocket endpoint: `/ws`
- Verify token is included in headers

### Mobile Issues

**API connection failed:**
- Use machine IP, not `localhost`
- Verify device and computer on same network
- Check firewall settings
- Verify `EXPO_PUBLIC_API_BASE_URL` in `.env`

**Expo Go connection issues:**
- Try development build instead
- Check Expo Go version (update if needed)
- Verify backend CORS allows Expo Go origin

**Jitsi not working:**
- May require development build (not Expo Go)
- Verify meeting link is generated correctly
- Check browser/app permissions for camera/mic

---

## 📦 Deployment

### Backend Deployment

1. **Build JAR**:
```bash
mvn clean package -DskipTests
```

2. **Run JAR**:
```bash
java -jar target/studybuddy-*.jar
```

3. **Production Settings**:
   - Use PostgreSQL instead of H2
   - Set secure JWT secret
   - Configure CORS for specific origins
   - Set up SSL/HTTPS
   - Configure proper file upload directory

### Frontend Deployment

1. **Build**:
```bash
cd frontend
npm run build
```

2. **Deploy** `dist/` folder to:
   - Static hosting (Vercel, Netlify, GitHub Pages)
   - Web server (Nginx, Apache)
   - CDN

3. **Environment Variables**:
   - Set `VITE_API_BASE_URL` to production API URL
   - Set `VITE_WS_BASE_URL` if WebSocket on different domain

### Mobile Deployment

1. **Development Build**:
```bash
eas build --profile development
```

2. **Production Build**:
```bash
eas build --profile production
```

3. **App Store / Play Store**:
   - Follow Expo submission guide
   - Configure app.json metadata
   - Set up app signing

---

## 🔄 Development Workflow

### Typical Development Cycle

1. **Start Backend**:
```bash
cd studybuddy-backend
mvn spring-boot:run
```

2. **Start Web Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```

3. **Start Mobile** (Terminal 3, if needed):
```bash
cd studybuddy-mobile
npm start
```

### Making Changes

- **Backend**: Auto-reload via Spring Boot DevTools
- **Frontend**: Hot reload via Vite
- **Mobile**: Fast refresh via Expo

### Testing Changes

- **Backend**: Unit tests in `src/test/java/`
- **Frontend**: Tests in `frontend/src/test/`
- **Manual**: Use browser/mobile app to test features

---

## 📚 Key Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Sessions
- `GET /api/sessions/browse` - Browse public sessions
- `GET /api/sessions/{id}` - Get session details
- `POST /api/sessions/{id}/join` - Join session

### Session Requests (NEW)
- `POST /api/student-expert/session-requests` - Create request
- `GET /api/student-expert/session-requests/mine` - Get my requests
- `POST /api/experts/session-requests/{id}/approve` - Approve request
- `POST /api/experts/session-requests/{id}/reject` - Reject request

### Direct Messages (NEW)
- `POST /api/dm/conversations` - Create/get conversation
- `GET /api/dm/conversations` - List conversations
- `GET /api/dm/conversations/{id}/messages` - Get messages
- `POST /api/dm/conversations/{id}/messages` - Send message

### WebSocket
- `ws://localhost:8080/ws` - STOMP endpoint
- Subscribe to `/topic/dm/{conversationId}` for direct messages

---

## 🆘 Common Commands

### Backend
```bash
# Run
mvn spring-boot:run

# Build
mvn clean package

# Test
mvn test

# Reset database (delete data files)
rm -rf data/
```

### Frontend
```bash
# Dev server
npm run dev

# Build
npm run build

# Test
npm run test

# Lint
npm run lint
```

### Mobile
```bash
# Start Expo
npm start

# Clear cache
expo start -c

# Build
npm run android  # or ios
```

---

## 📞 Support

- **Backend Issues**: Check `src/main/resources/application.properties`
- **Frontend Issues**: Check browser console and `.env` file
- **Mobile Issues**: Check Expo logs and network configuration

---

**Last Updated**: After STEP 1-6 implementation  
**Version**: 1.0.0

