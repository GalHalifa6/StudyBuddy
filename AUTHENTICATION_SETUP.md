# StudyBuddy Authentication System - Setup Guide

## Overview

StudyBuddy now features a comprehensive authentication system that supports:

1. **Manual Registration** with email verification (academic emails only)
2. **Google OAuth2 / OpenID Connect** Single Sign-On
3. **Domain-based Access Control** (Israeli universities pre-configured)
4. **Admin Domain Management** API

---

## Prerequisites

### 1. Google OAuth2 Setup

To enable Google Sign-In:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable "Google+ API"
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure:
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:8080/login/oauth2/code/google` (development)
     - `https://yourdomain.com/login/oauth2/code/google` (production)
6. Copy the **Client ID** and **Client Secret**

### 2. SendGrid Email Setup

To enable email verification:

1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create an API Key:
   - Go to **Settings** → **API Keys**
   - Click **Create API Key**
   - Give it a name (e.g., "StudyBuddy Email")
   - Choose **Full Access** or **Restricted Access** (Mail Send only)
3. Copy the API key (you'll only see it once!)
4. Verify a sender email address in SendGrid:
   - Go to **Settings** → **Sender Authentication**
   - Follow the steps to verify your domain or single sender

---

## Environment Configuration

### Option 1: Environment Variables (Recommended for Production)

Set the following environment variables:

```bash
# Google OAuth2
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"

# SendGrid
export SENDGRID_API_KEY="your-sendgrid-api-key"
export MAIL_FROM_ADDRESS="noreply@yourdomain.com"

# Frontend URL
export FRONTEND_URL="http://localhost:3000"
```

### Option 2: application.properties (Development Only)

Edit `src/main/resources/application.properties`:

```properties
# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=your-google-client-id
spring.security.oauth2.client.registration.google.client-secret=your-google-client-secret

# SendGrid
spring.mail.password=your-sendgrid-api-key
spring.mail.from=noreply@yourdomain.com

# Frontend URL
app.frontend.url=http://localhost:3000
```

⚠️ **Security Warning**: Never commit real credentials to version control!

---

## Architecture

### Authentication Flows

#### Manual Registration Flow

```
User submits registration
    ↓
Backend validates email domain against AllowedEmailDomain table
    ↓
If valid domain → Create user (emailVerified=false)
    ↓
Generate verification token (24h expiry)
    ↓
Send verification email via SendGrid
    ↓
User clicks verification link in email
    ↓
Backend validates token → Mark user as verified
    ↓
User can now log in
```

#### Google SSO Flow

```
User clicks "Sign in with Google"
    ↓
Redirect to Google OAuth consent screen
    ↓
User authorizes application
    ↓
Google redirects back with authorization code
    ↓
Backend exchanges code for user info (email, email_verified, sub)
    ↓
Validate email_verified == true (from Google)
    ↓
Validate email domain against AllowedEmailDomain table
    ↓
Create/update user (emailVerified=true, googleSub=sub)
    ↓
Generate JWT token
    ↓
Redirect to frontend with JWT token
```

### Database Schema

#### User Table (Modified)
- `email` - User's email address (unique)
- `password` - Hashed password (nullable for Google users)
- `googleSub` - Google OAuth sub claim (nullable, unique)
- `emailVerified` - Boolean flag
- Other existing fields...

#### AllowedEmailDomain Table (New)
- `id` - Primary key
- `domain` - Email domain (e.g., "tau.ac.il")
- `status` - ALLOW or DENY
- `institutionName` - Display name (e.g., "Tel Aviv University")
- `createdAt`, `updatedAt` - Timestamps

#### EmailVerificationToken Table (New)
- `id` - Primary key
- `userId` - Foreign key to User
- `tokenHash` - Hashed verification token
- `expiresAt` - Expiration timestamp (24 hours)
- `used` - Boolean flag
- `createdAt` - Creation timestamp

---

## API Endpoints

### Public Authentication Endpoints

#### Register (Manual)
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "student",
  "email": "student@tau.ac.il",
  "password": "securePassword123",
  "fullName": "John Doe"
}
```

**Response (Success):**
```json
{
  "message": "User registered successfully! Please check your email to verify your account.",
  "success": true
}
```

**Response (Invalid Domain):**
```json
{
  "message": "Registration failed: Email domain 'gmail.com' is not authorized. Please use your academic institution email.",
  "success": false,
  "errors": ["Email domain 'gmail.com' is not authorized..."]
}
```

#### Verify Email
```http
GET /api/auth/verify-email?token={TOKEN}
```

**Response (Success):**
```json
{
  "message": "Email verified successfully! You can now log in.",
  "success": true
}
```

#### Login (Manual)
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "student",
  "password": "securePassword123"
}
```

**Response (Success):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "Bearer",
  "user": {
    "id": 1,
    "username": "student",
    "email": "student@tau.ac.il",
    "role": "USER",
    "fullName": "John Doe",
    "emailVerified": true,
    "institutionName": "Tel Aviv University"
  }
}
```

**Response (Email Not Verified):**
```json
{
  "message": "Email not verified",
  "success": false,
  "errors": ["Please verify your email address before logging in..."],
  "errorCode": "EMAIL_NOT_VERIFIED"
}
```

#### Resend Verification Email
```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "student@tau.ac.il"
}
```

#### Google OAuth Login
```
Frontend redirects to: /oauth2/authorization/google
```

After successful authentication, user is redirected to:
```
{FRONTEND_URL}/auth/google/callback?token={JWT_TOKEN}
```

### Admin Endpoints (Requires ADMIN role)

#### List All Domains
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

#### Update Domain
```http
PUT /api/admin/domains/{id}
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "status": "DENY"
}
```

#### Delete Domain
```http
DELETE /api/admin/domains/{id}
Authorization: Bearer {JWT_TOKEN}
```

---

## Pre-configured Israeli Universities

The system comes pre-configured with ~25 Israeli academic institutions:

### Major Universities
- Tel Aviv University (tau.ac.il, mail.tau.ac.il, post.tau.ac.il)
- Technion (technion.ac.il, campus.technion.ac.il)
- Hebrew University of Jerusalem (huji.ac.il, mail.huji.ac.il)
- Ben-Gurion University (bgu.ac.il, post.bgu.ac.il)
- Bar-Ilan University (biu.ac.il, mail.biu.ac.il)
- University of Haifa (haifa.ac.il)
- Weizmann Institute (weizmann.ac.il)
- Open University (openu.ac.il)
- Ariel University (ariel.ac.il)

### Academic Colleges
- Jerusalem College of Technology (jct.ac.il)
- Sami Shamoon College (sce.ac.il)
- Afeka Tel Aviv (afeka.ac.il)
- Braude College (braude.ac.il)
- Azrieli College (azrieli.ac.il)
- Hadassah Academic College (hadassah.ac.il)
- Reichman University / IDC (idc.ac.il, runi.ac.il)
- And many more...

See `DataInitializer.java` for the complete list.

---

## Frontend Integration

### Manual Login Flow

```javascript
// Login
const response = await fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

const data = await response.json();

if (data.success === false && data.errorCode === 'EMAIL_NOT_VERIFIED') {
  // Show "Please verify your email" message
  // Optionally show "Resend verification email" button
} else if (data.token) {
  // Store token
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  // Redirect to dashboard
}
```

### Google OAuth Flow

```javascript
// Redirect to Google OAuth
window.location.href = 'http://localhost:8080/oauth2/authorization/google';

// Handle callback (on /auth/google/callback route)
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const error = urlParams.get('error');

if (token) {
  localStorage.setItem('token', token);
  // Fetch user info
  const response = await fetch('http://localhost:8080/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const user = await response.json();
  localStorage.setItem('user', JSON.stringify(user));
  // Redirect to dashboard
} else if (error) {
  // Show error message
}
```

### Email Verification

```javascript
// On /verify-email route
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

const response = await fetch(`http://localhost:8080/api/auth/verify-email?token=${token}`);
const data = await response.json();

if (data.success) {
  // Show success message: "Email verified! You can now log in."
  // Redirect to login page
} else {
  // Show error message
}
```

---

## Testing

### Test Admin User
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@studybuddy.com`
- **Email Verified**: Yes

### Test Student Users
All demo users have password: `student123`
- sarah.student@studybuddy.com
- david.learner@studybuddy.com
- maya.coder@studybuddy.com

### Testing Manual Registration

1. Register with an allowed domain (e.g., test@tau.ac.il)
2. Check console logs for verification token (in dev mode)
3. Visit: `http://localhost:3000/verify-email?token={TOKEN}`
4. Login with credentials

### Testing Google OAuth

1. Configure Google OAuth credentials
2. Click "Sign in with Google" button
3. Authorize application
4. Should redirect back with JWT token
5. User should be logged in

---

## Security Considerations

1. **Token Storage**: Tokens are hashed before storing in database
2. **Token Expiry**: Verification tokens expire after 24 hours
3. **Password Requirements**: Minimum 6 characters (consider increasing for production)
4. **JWT Secret**: Change `jwt.secret` in production to a strong random value
5. **HTTPS**: Always use HTTPS in production
6. **CORS**: Configure `cors.allowed-origins` appropriately for production
7. **Rate Limiting**: Consider adding rate limiting for auth endpoints

---

## Troubleshooting

### Email Not Sending
- Check SendGrid API key is valid
- Verify sender email is authenticated in SendGrid
- Check application logs for errors
- Ensure firewall allows outbound SMTP connections (port 587)

### Google OAuth Not Working
- Verify Google Client ID and Secret are correct
- Check redirect URI matches exactly (including protocol and port)
- Ensure Google+ API is enabled in Google Cloud Console
- Check browser console for errors

### Domain Validation Failing
- Verify domain exists in `allowed_email_domains` table
- Check domain status is "ALLOW"
- Domain comparison is case-insensitive
- Check for typos in email address

### User Can't Login After Verification
- Verify `emailVerified` is true in database
- Check token was successfully validated
- Ensure user is using correct username/password
- Check application logs for authentication errors

---

## Production Deployment Checklist

- [ ] Change `jwt.secret` to a strong random value (256+ bits)
- [ ] Set up production SendGrid account with verified domain
- [ ] Configure Google OAuth with production redirect URI
- [ ] Use environment variables for all sensitive configuration
- [ ] Enable HTTPS and update CORS settings
- [ ] Set up database backups
- [ ] Configure monitoring and logging
- [ ] Add rate limiting to authentication endpoints
- [ ] Test email delivery in production environment
- [ ] Document admin procedures for domain management
- [ ] Set strong password for admin account

---

## Support

For issues or questions:
- Check application logs: `logging.level.com.studybuddy=DEBUG`
- Review this documentation
- Contact system administrator

---

## Changelog

### Version 1.0.0 (Current)
- ✅ Manual registration with email verification
- ✅ Google OAuth2 / OpenID Connect
- ✅ Domain-based access control
- ✅ Israeli universities pre-configured
- ✅ Admin domain management API
- ✅ SendGrid email integration
- ✅ JWT token authentication






