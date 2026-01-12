# Environment Variables Setup Guide

## 📝 How to Create the .env File

### Windows (PowerShell)
```powershell
Copy-Item env.example .env
```

### Windows (Command Prompt)
```cmd
copy env.example .env
```

### Linux/Mac
```bash
cp env.example .env
```

### Or manually:
1. Copy the file `env.example`
2. Rename it to `.env` (with the dot at the beginning)
3. Open it in a text editor

---

## ✅ Required Values (Must Change)

### 1. JWT_SECRET ⚠️ **REQUIRED - CHANGE THIS!**
```env
JWT_SECRET=your-super-secret-random-string-here
```
**Why**: This is used to sign JWT tokens. Using the default is a security risk.

**How to generate a secure secret:**
- **Windows PowerShell**: 
  ```powershell
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
  ```
- **Linux/Mac**: 
  ```bash
  openssl rand -base64 64
  ```
- **Online**: Use a password generator (64+ characters recommended)

**Example:**
```env
JWT_SECRET=K8mN2pQ9rT5vW8xY1zA4bC7dE0fG3hI6jK9lM2nO5pQ8rS1tU4vW7xY0zA3bC6dE9f
```

---

## 🔧 Optional Values (Only if you need these features)

### 2. Google OAuth2 (Optional - for Google login)
```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```
**When to set**: If you want users to log in with Google accounts.

**How to get**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Copy Client ID and Client Secret

**If not set**: Google login will not work, but regular registration/login will still work.

---

### 3. SendGrid Email (Optional - for email notifications)
```env
SENDGRID_API_KEY=your-sendgrid-api-key-here
MAIL_FROM_ADDRESS=noreply@studybuddy.com
```
**When to set**: If you want to send email notifications (verification emails, password resets, etc.)

**How to get**:
1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create an API key
3. Copy the API key

**If not set**: 
- Email sending will fail gracefully
- Verification links will be printed in the backend logs instead
- You can still use the app, just won't receive emails

---

### 4. Jitsi Video (Optional - for video sessions)
```env
JITSI_KID=your-jitsi-kid-here
JITSI_PRIVATE_KEY=your-jitsi-private-key-here
```
**When to set**: If you want to use Jitsi for video conferencing sessions.

**How to get**: 
1. Sign up for Jitsi JaaS (Jitsi as a Service)
2. Get your credentials from the dashboard

**If not set**: Video session features won't work, but other features will.

---

## 🎯 Default Values (You can leave these as-is)

These values work fine for local development. Only change if needed:

### Database (Already configured in docker-compose.yml)
```env
POSTGRES_DB=studybuddy
POSTGRES_USER=studybuddy
POSTGRES_PASSWORD=studybuddy_password
```
**Leave as-is** unless you want different database credentials.

### Frontend Configuration
```env
FRONTEND_URL=http://localhost:3000
FRONTEND_PORT=3000
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_BASE_URL=ws://localhost:8080
```
**Leave as-is** for local development. Only change if:
- You're running on different ports
- You're deploying to production

### JWT Expiration
```env
JWT_EXPIRATION=86400000
```
**Leave as-is** (24 hours). Only change if you want different token expiration.

---

## 📋 Quick Setup Checklist

### Minimum Setup (Just to get started):
- [ ] Copy `env.example` to `.env`
- [ ] Change `JWT_SECRET` to a secure random string
- [ ] Leave everything else as default
- [ ] Run `docker-compose up --build`

### Full Setup (All features enabled):
- [ ] Copy `env.example` to `.env`
- [ ] Change `JWT_SECRET` to a secure random string
- [ ] Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (if using Google login)
- [ ] Add `SENDGRID_API_KEY` and `MAIL_FROM_ADDRESS` (if using email)
- [ ] Add `JITSI_KID` and `JITSI_PRIVATE_KEY` (if using video sessions)
- [ ] Run `docker-compose up --build`

---

## 🔍 Example .env File (Minimum Setup)

```env
# REQUIRED - Change this!
JWT_SECRET=MySecureRandomString1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ

# Optional - Leave empty if not using
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SENDGRID_API_KEY=
MAIL_FROM_ADDRESS=noreply@studybuddy.com
JITSI_KID=
JITSI_PRIVATE_KEY=

# Defaults - Leave as-is for local development
JWT_EXPIRATION=86400000
POSTGRES_DB=studybuddy
POSTGRES_USER=studybuddy
POSTGRES_PASSWORD=studybuddy_password
FRONTEND_URL=http://localhost:3000
FRONTEND_PORT=3000
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_BASE_URL=ws://localhost:8080
```

---

## ⚠️ Important Notes

1. **Never commit `.env` to Git** - It contains secrets!
2. **The `.env` file is already in `.gitignore`** - So you're safe
3. **For production**: Use a different, stronger `JWT_SECRET`
4. **Empty values are OK** - Docker Compose will use defaults from `docker-compose.yml`

---

## 🚀 After Creating .env

1. Save the `.env` file
2. Run: `docker-compose up --build`
3. Docker Compose will automatically load variables from `.env`

That's it! You're ready to go! 🎉

