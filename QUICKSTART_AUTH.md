# Authentication System - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Get Google OAuth Credentials (2 minutes)

1. Go to https://console.cloud.google.com/
2. Create project → "StudyBuddy"
3. Enable "Google+ API"
4. Credentials → Create OAuth 2.0 Client ID
5. Add redirect URI: `http://localhost:8080/login/oauth2/code/google`
6. Copy **Client ID** and **Client Secret**

### Step 2: Get SendGrid API Key (2 minutes)

1. Sign up at https://sendgrid.com/ (free tier available)
2. Settings → API Keys → Create API Key
3. Name: "StudyBuddy", Permission: Full Access
4. Copy the API key
5. Settings → Sender Authentication → Verify email (e.g., noreply@yourdomain.com)

### Step 3: Configure Application (1 minute)

**Windows (PowerShell):**
```powershell
$env:GOOGLE_CLIENT_ID="your-client-id-here"
$env:GOOGLE_CLIENT_SECRET="your-client-secret-here"
$env:SENDGRID_API_KEY="SG.xxxxxxxxxxxxx"
$env:MAIL_FROM_ADDRESS="noreply@yourdomain.com"
$env:FRONTEND_URL="http://localhost:3000"
```

**Mac/Linux (Bash):**
```bash
export GOOGLE_CLIENT_ID="your-client-id-here"
export GOOGLE_CLIENT_SECRET="your-client-secret-here"
export SENDGRID_API_KEY="SG.xxxxxxxxxxxxx"
export MAIL_FROM_ADDRESS="noreply@yourdomain.com"
export FRONTEND_URL="http://localhost:3000"
```

**Or edit `application.properties` (for quick testing only):**
```properties
spring.security.oauth2.client.registration.google.client-id=your-client-id-here
spring.security.oauth2.client.registration.google.client-secret=your-client-secret-here
spring.mail.password=SG.xxxxxxxxxxxxx
spring.mail.from=noreply@yourdomain.com
```

### Step 4: Run the Application

```bash
mvn clean install
mvn spring-boot:run
```

---

## 🧪 Test It Out

### Test 1: Login with Demo User

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

Expected response: JWT token with user info ✅

### Test 2: Register New User

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newstudent",
    "email": "newstudent@tau.ac.il",
    "password": "password123",
    "fullName": "New Student"
  }'
```

Expected: Success message + verification email sent ✅

### Test 3: Check Allowed Domains

```bash
# Login as admin first to get token
TOKEN="your-jwt-token-here"

curl -X GET http://localhost:8080/api/admin/domains \
  -H "Authorization: Bearer $TOKEN"
```

Expected: List of Israeli universities ✅

### Test 4: Google Sign-In

Visit in browser:
```
http://localhost:8080/oauth2/authorization/google
```

Expected: Google consent screen → Redirect with JWT ✅

---

## 📋 What's Pre-Configured

### ✅ Allowed Email Domains (50+)
- Tel Aviv University: `tau.ac.il`, `mail.tau.ac.il`, `post.tau.ac.il`
- Technion: `technion.ac.il`, `campus.technion.ac.il`
- Hebrew University: `huji.ac.il`, `mail.huji.ac.il`
- Ben-Gurion University: `bgu.ac.il`, `post.bgu.ac.il`
- Bar-Ilan University: `biu.ac.il`, `mail.biu.ac.il`
- ...and 20+ more institutions
- Demo domain: `studybuddy.com`

### ✅ Test Accounts
| Username | Password | Email | Role |
|----------|----------|-------|------|
| admin | admin123 | admin@studybuddy.com | ADMIN |
| sarah.student | student123 | sarah@studybuddy.com | USER |
| david.learner | student123 | david@studybuddy.com | USER |
| maya.coder | student123 | maya@studybuddy.com | USER |

---

## 🔗 API Endpoints Summary

### Public Endpoints
```
POST   /api/auth/register          - Register with email verification
POST   /api/auth/login             - Login (requires verified email)
GET    /api/auth/verify-email      - Verify email with token
POST   /api/auth/resend-verification - Resend verification email
GET    /oauth2/authorization/google - Start Google OAuth flow
```

### Protected Endpoints (Admin only)
```
GET    /api/admin/domains          - List all domains
POST   /api/admin/domains          - Add new domain
PUT    /api/admin/domains/{id}     - Update domain
DELETE /api/admin/domains/{id}     - Delete domain
```

---

## 🎨 Frontend Integration Example

### React/JavaScript

```javascript
// Login
async function login(username, password) {
  const response = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json();
  
  if (data.errorCode === 'EMAIL_NOT_VERIFIED') {
    alert('Please verify your email first!');
    return;
  }
  
  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = '/dashboard';
  }
}

// Google Sign-In Button
<button onClick={() => window.location.href = 'http://localhost:8080/oauth2/authorization/google'}>
  Sign in with Google
</button>

// Google Callback Handler (on /auth/google/callback route)
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  
  if (token) {
    localStorage.setItem('token', token);
    // Fetch user info and redirect
    fetchUserInfo(token);
  }
}, []);
```

---

## 🐛 Troubleshooting

### Email not sending?
- ✅ Check SendGrid API key is valid
- ✅ Verify sender email in SendGrid dashboard
- ✅ Check logs: Look for "Verification email sent to..."
- ✅ Check spam folder

### Google OAuth redirect failing?
- ✅ Verify redirect URI exactly matches in Google Console
- ✅ Must include protocol: `http://` not `https://` for localhost
- ✅ Port must match: `:8080`

### Domain validation failing?
- ✅ Run: `curl http://localhost:8080/api/admin/domains` (as admin)
- ✅ Check if domain exists in list
- ✅ Email domain must match exactly (case-insensitive)

### Can't login after verification?
- ✅ Check H2 console: http://localhost:8080/h2-console
- ✅ Database: `jdbc:h2:file:./data/studybuddy`
- ✅ Query: `SELECT * FROM USERS WHERE EMAIL = 'youremail@domain.com'`
- ✅ Verify `EMAIL_VERIFIED = TRUE`

---

## 📖 Need More Info?

- **Full Setup Guide**: `AUTHENTICATION_SETUP.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Application Logs**: Set `logging.level.com.studybuddy=DEBUG`

---

## ✨ You're All Set!

The authentication system is now ready to use with:
- ✅ Manual registration with email verification
- ✅ Google OAuth2 Single Sign-On
- ✅ 25+ Israeli universities pre-configured
- ✅ Admin domain management
- ✅ Secure JWT authentication

Happy coding! 🚀






