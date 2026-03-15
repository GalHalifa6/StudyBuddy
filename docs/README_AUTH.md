# StudyBuddy Authentication System

## 🔐 Overview

A complete authentication system for StudyBuddy supporting:
- **Manual Registration** with email verification (academic emails only)
- **Google OAuth2 / OpenID Connect** Single Sign-On
- **Domain-Based Access Control** (25 Israeli universities pre-configured)
- **Admin Domain Management** API

---

## ⚡ Quick Start

### 1. Prerequisites
- Java 17+
- Maven 3.6+
- Google OAuth2 credentials ([Get them here](https://console.cloud.google.com/))
- SendGrid API key ([Get it here](https://sendgrid.com/))

### 2. Configure
Set environment variables:
```bash
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
export SENDGRID_API_KEY="your-sendgrid-api-key"
export MAIL_FROM_ADDRESS="noreply@yourdomain.com"
export FRONTEND_URL="http://localhost:3000"
```

### 3. Run
```bash
mvn clean install
mvn spring-boot:run
```

### 4. Test
```bash
# Login as admin
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**That's it!** 🎉

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [**QUICKSTART_AUTH.md**](QUICKSTART_AUTH.md) | 5-minute setup guide |
| [**AUTHENTICATION_SETUP.md**](AUTHENTICATION_SETUP.md) | Complete setup & API reference |
| [**IMPLEMENTATION_SUMMARY.md**](IMPLEMENTATION_SUMMARY.md) | Technical implementation details |
| [**AUTH_DEPLOYMENT_CHECKLIST.md**](AUTH_DEPLOYMENT_CHECKLIST.md) | Production deployment checklist |
| [**WHATS_NEW_AUTH.md**](WHATS_NEW_AUTH.md) | Feature overview & what's new |

---

## 🎯 Features

### ✅ Manual Registration
- Email domain validation (academic institutions only)
- Verification email via SendGrid
- 24-hour token expiration
- Secure token hashing
- Resend verification option

### ✅ Google OAuth2
- One-click Google Sign-In
- Email verification enforced
- Domain validation applied
- Automatic user creation
- JWT token issuance

### ✅ Domain Control
- Database-driven (no hardcoded rules)
- 50+ domains for 25 Israeli universities
- ALLOW/DENY status per domain
- Admin API for management
- Institution name mapping

### ✅ Security
- BCrypt password hashing
- JWT token authentication
- Hashed verification tokens
- Role-based access control
- CORS configuration
- Secure session management

---

## 🏛️ Pre-configured Universities

### Major Universities (9)
- Tel Aviv University
- Technion - Israel Institute of Technology
- Hebrew University of Jerusalem
- Ben-Gurion University of the Negev
- Bar-Ilan University
- University of Haifa
- Weizmann Institute of Science
- Open University of Israel
- Ariel University

### Academic Colleges (16+)
- Jerusalem College of Technology
- Sami Shamoon College of Engineering
- Afeka Tel Aviv Academic College
- Braude College of Engineering
- Azrieli College of Engineering
- Hadassah Academic College
- Reichman University (IDC Herzliya)
- And many more...

**Total: ~50 email domains covering 25+ institutions**

---

## 🔌 API Endpoints

### Public Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "student",
  "email": "student@tau.ac.il",
  "password": "password123",
  "fullName": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "student",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "type": "Bearer",
  "user": {
    "id": 1,
    "username": "student",
    "email": "student@tau.ac.il",
    "emailVerified": true,
    "institutionName": "Tel Aviv University",
    "role": "USER"
  }
}
```

#### Verify Email
```http
GET /api/auth/verify-email?token={TOKEN}
```

#### Google OAuth
```http
GET /oauth2/authorization/google
```

### Admin Endpoints

#### List Domains
```http
GET /api/admin/domains
Authorization: Bearer {JWT_TOKEN}
```

#### Add Domain
```http
POST /api/admin/domains
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "domain": "newuniversity.ac.il",
  "status": "ALLOW",
  "institutionName": "New University"
}
```

---

## 🧪 Test Accounts

| Username | Password | Email | Role |
|----------|----------|-------|------|
| admin | admin123 | admin@studybuddy.com | ADMIN |
| sarah.student | student123 | sarah@studybuddy.com | USER |
| david.learner | student123 | david@studybuddy.com | USER |
| maya.coder | student123 | maya@studybuddy.com | USER |

---

## 🔧 Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | - | Google OAuth2 Client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | - | Google OAuth2 Client Secret |
| `SENDGRID_API_KEY` | Yes | - | SendGrid API key |
| `MAIL_FROM_ADDRESS` | Yes | - | Sender email address |
| `FRONTEND_URL` | Yes | `http://localhost:3000` | Frontend application URL |
| `JWT_SECRET` | No | (default) | JWT signing secret (change in prod!) |
| `JWT_EXPIRATION` | No | `86400000` | JWT expiration (24h in ms) |

### Application Properties

See `src/main/resources/application.properties` for:
- Database configuration
- OAuth2 settings
- Mail server (SendGrid SMTP)
- CORS configuration
- Logging levels

---

## 🏗️ Architecture

### Authentication Flows

```
Manual Registration:
User → Register → Validate Domain → Create User → Send Email
     → User Clicks Link → Verify Token → Mark Verified → Login

Google OAuth:
User → Click "Google" → Google Auth → Validate Domain
     → Create/Update User → Generate JWT → Redirect with Token
```

### Database Schema

**Users**
- email, password (nullable), googleSub (nullable)
- emailVerified (boolean)
- Standard user fields...

**AllowedEmailDomain**
- domain, status (ALLOW/DENY), institutionName
- Timestamps

**EmailVerificationToken**
- user, tokenHash, expiresAt, used
- Timestamps

---

## 🎨 Frontend Integration

### Login Example
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

const data = await response.json();

if (data.errorCode === 'EMAIL_NOT_VERIFIED') {
  showMessage('Please verify your email first!');
} else if (data.token) {
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  navigate('/dashboard');
}
```

### Google OAuth Example
```javascript
// Redirect to Google
<button onClick={() => 
  window.location.href = '/oauth2/authorization/google'
}>
  Sign in with Google
</button>

// Handle callback (on /auth/google/callback)
const token = new URLSearchParams(window.location.search).get('token');
if (token) {
  localStorage.setItem('token', token);
  // Fetch user info and redirect
}
```

---

## 🔍 Troubleshooting

### Email Not Sending
- ✅ Check SendGrid API key is valid
- ✅ Verify sender email in SendGrid dashboard
- ✅ Check logs for errors
- ✅ Ensure firewall allows SMTP (port 587)

### Google OAuth Not Working
- ✅ Verify redirect URI matches exactly
- ✅ Include protocol and port: `http://localhost:8080/...`
- ✅ Check Client ID and Secret are correct
- ✅ Ensure Google+ API is enabled

### Domain Validation Failing
- ✅ Check domain exists in `allowed_email_domains` table
- ✅ Verify status is "ALLOW"
- ✅ Domain comparison is case-insensitive

### Can't Login
- ✅ Verify email is verified (`emailVerified = true`)
- ✅ Check username/password are correct
- ✅ Look for errors in application logs

---

## 📊 Database Queries

### Check Allowed Domains
```sql
SELECT * FROM allowed_email_domains;
```

### Check User Verification Status
```sql
SELECT username, email, email_verified, google_sub 
FROM users 
WHERE email = 'student@tau.ac.il';
```

### Check Pending Verification Tokens
```sql
SELECT u.email, t.expires_at, t.used
FROM email_verification_tokens t
JOIN users u ON t.user_id = u.id
WHERE t.used = false 
  AND t.expires_at > CURRENT_TIMESTAMP;
```

---

## 🚀 Production Deployment

### Pre-Deployment Checklist
- [ ] Change JWT secret to strong random value
- [ ] Update Google OAuth redirect URI to production URL
- [ ] Configure production SendGrid domain
- [ ] Set up HTTPS/SSL certificates
- [ ] Update CORS allowed origins
- [ ] Configure production database
- [ ] Set up monitoring and logging
- [ ] Test all authentication flows

See [AUTH_DEPLOYMENT_CHECKLIST.md](AUTH_DEPLOYMENT_CHECKLIST.md) for complete checklist.

---

## 📝 License

This authentication system is part of the StudyBuddy application.

---

## 🤝 Contributing

To extend or modify the authentication system:

1. Read [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
2. Follow existing patterns and architecture
3. Add tests for new functionality
4. Update documentation
5. Ensure backward compatibility

---

## 📞 Support

- **Documentation**: See docs listed above
- **Logs**: Enable DEBUG level: `logging.level.com.studybuddy=DEBUG`
- **Database**: H2 Console at http://localhost:8080/h2-console

---

## ⭐ Features at a Glance

| Feature | Status |
|---------|--------|
| Manual Registration | ✅ |
| Email Verification | ✅ |
| Google OAuth2 | ✅ |
| Domain Whitelist | ✅ |
| Israeli Universities Pre-configured | ✅ (25+) |
| Admin Domain Management | ✅ |
| JWT Authentication | ✅ |
| Role-Based Access | ✅ |
| SendGrid Integration | ✅ |
| Password Hashing | ✅ |
| Token Hashing | ✅ |
| Comprehensive Docs | ✅ |
| Test Accounts | ✅ |
| Production Ready | ✅ |

---

**Happy authenticating! 🎉**






