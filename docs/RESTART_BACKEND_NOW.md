# ⚠️ URGENT: RESTART BACKEND NOW ⚠️

The backend **MUST be restarted** for the new endpoints to work!

## Why?
The new chat endpoints (`POST /api/sessions/{id}/chat` and `GET /api/sessions/{id}/messages`) were just added to the code, but they won't be available until you restart the backend server.

## How to Restart:

### Option 1: Using the restart script
```powershell
.\restart-backend.ps1
```

### Option 2: Manual restart
1. **Stop the current backend** (press `Ctrl+C` in the terminal running it)
2. **Wait 2-3 seconds**
3. **Start it again** using:
   ```powershell
   .\start-backend.ps1
   ```

### Option 3: Quick restart (if backend is in a separate terminal)
1. Find the Java process running Spring Boot
2. Kill it: `taskkill /F /PID <process_id>`
3. Run: `.\start-backend.ps1`

## What Will Happen After Restart:
✅ `/api/sessions/{id}/chat` endpoint will work  
✅ `/api/sessions/{id}/messages` endpoint will work  
✅ Messages sent from web will be stored in database  
✅ Mobile app can poll and see messages from web  
✅ Messages sent from mobile will sync to web via WebSocket  

## Verify It Worked:
After restart, check the mobile app logs - you should see:
- ✅ `200 /sessions/9/messages` instead of `404`
- ✅ `200 /sessions/9/chat` instead of `404`

**DO THIS NOW!** The code is ready, just needs a restart! 🚀



