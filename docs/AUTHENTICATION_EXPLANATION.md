# הסבר על מערכת האימות (Authentication) במערכת StudyBuddy

## איך האימות עובד?

### 1. **JWT Token (JSON Web Token)**
המערכת משתמשת ב-**JWT Token** לאימות משתמשים. זהו טוקן דיגיטלי שמכיל מידע על המשתמש.

### 2. **התהליך המלא:**

#### שלב 1: התחברות (Login)
```
משתמש → שולח username + password → /api/auth/login
```

השרת:
- בודק את הסיסמה (מצפין עם BCrypt)
- יוצר JWT Token עם:
  - **Secret Key** (מפתח סודי) - נמצא ב-`application.properties`:
    ```
    jwt.secret=mySecretKeyForStudyBuddyPlatformChangeInProduction
    jwt.expiration=86400000  # 24 שעות
    ```
  - מידע על המשתמש (username, role, וכו')
  - תאריך תפוגה

#### שלב 2: שמירת הטוקן
הטוקן נשמר ב:
- **Web**: `localStorage.getItem('token')`
- **Mobile**: `AsyncStorage` או `SecureStore`

#### שלב 3: שליחת הטוקן בכל בקשה
כל בקשה ל-API כוללת את הטוקן ב-**Header**:

```javascript
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
````
**בקוד:**
- **Web** (`frontend/src/api/axios.ts`):
  ```javascript
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  ```

- **Mobile** (`studybuddy-mobile/src/api/client.ts`):
  ```javascript
  api.interceptors.request.use(async config => {
    const token = getStoredToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });
  ```

#### שלב 4: אימות הטוקן בשרת
השרת בודק את הטוקן בכל בקשה:

**`JwtAuthenticationFilter.java`**:
```java
// 1. קורא את ה-Header
String headerAuth = request.getHeader("Authorization");
// 2. מחלץ את הטוקן (מסיר "Bearer ")
String jwt = headerAuth.substring(7);
// 3. בודק את הטוקן עם ה-Secret Key
if (jwtUtils.validateToken(jwt, userDetails)) {
    // 4. מגדיר את המשתמש כ-authenticated
    SecurityContextHolder.getContext().setAuthentication(authentication);
}
```

**`JwtUtils.java`**:
```java
// בודק שהטוקן:
// 1. חתום נכון עם ה-Secret Key
// 2. לא פג תוקף
// 3. מכיל את ה-username הנכון
public Boolean validateToken(String token, UserDetails userDetails) {
    final String username = extractUsername(token);
    return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
}
```

### 3. **SecurityConfig - הגדרות אבטחה**

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**").permitAll()  // התחברות - ללא אימות
    .requestMatchers("/ws/**", "/ws-native/**").permitAll()  // WebSocket - ללא אימות
    .requestMatchers("/api/**").authenticated()  // כל ה-API - דורש אימות
)
```

### 4. **איך זה עובד עם הוידאו (Jitsi)?**

**החשוב להבין**: Jitsi Meet **לא משתמש** בטוקן שלנו ישירות!

במקום זה:
1. **אנחנו** לוקחים את שם המשתמש מהטוקן שלנו
2. **שולחים** את השם ל-Jitsi כפרמטר `displayName`
3. Jitsi משתמש בשם הזה להצגה, אבל **לא** לאימות

**בקוד:**
```typescript
// frontend/src/pages/SessionRoom.tsx
<JitsiMeetEmbed
  roomName={meetingLink}
  displayName={user?.fullName || user?.username || 'Participant'}  // ← מהטוקן שלנו!
  config={{
    startWithAudioMuted: false,
    startWithVideoMuted: false,
    enableWelcomePage: false,  // ← מדלג על דף ההתחברות
    enableClosePage: false,
  }}
/>
```

**ב-Jitsi URL:**
```
https://meet.jit.si/studybuddy-123?room=studybuddy-123&userInfo={"displayName":"John Doe"}
```

### 5. **למה אין צורך באימות ב-Jitsi?**

כי:
- **החדר** כבר מוגן - רק מי שיש לו את ה-link יכול להיכנס
- **השם** מגיע מהטוקן שלנו (שכבר אומת)
- **ההגדרות** מדלגות על כל הדפים (prejoin, welcome, וכו')

### 6. **סיכום - איך זה עובד:**

```
┌─────────────┐
│   משתמש     │
│  (Web/Mobile)│
└──────┬──────┘
       │ 1. Login (username + password)
       ▼
┌─────────────┐
│   Backend   │
│  (Spring)   │
└──────┬──────┘
       │ 2. יוצר JWT Token עם Secret Key
       ▼
┌─────────────┐
│   JWT Token │
│  (נשמר ב-   │
│  localStorage)│
└──────┬──────┘
       │ 3. כל בקשה: Authorization: Bearer <token>
       ▼
┌─────────────┐
│JwtAuthFilter│
└──────┬──────┘
       │ 4. בודק טוקן עם Secret Key
       ▼
┌─────────────┐
│   API/WS    │
│  (מאומת!)   │
└──────┬──────┘
       │ 5. לוקח שם משתמש מהטוקן
       ▼
┌─────────────┐
│   Jitsi     │
│  (displayName)│
└─────────────┘
```

### 7. **נקודות חשובות:**

✅ **JWT Token** = טוקן דיגיטלי עם חתימה (signature)
✅ **Secret Key** = מפתח סודי לחתימת הטוקן (נמצא ב-`application.properties`)
✅ **Bearer Token** = פורמט: `Authorization: Bearer <token>`
✅ **Header** = מקום שבו שולחים את הטוקן (לא ב-body!)
✅ **Jitsi** = לא משתמש בטוקן, רק בשם המשתמש

### 8. **למה זה בטוח?**

1. **הטוקן חתום** - לא ניתן לזייף בלי ה-Secret Key
2. **יש תאריך תפוגה** - הטוקן פג אחרי 24 שעות
3. **HTTPS** - כל התקשורת מוצפנת
4. **הטוקן נשלח ב-Header** - לא ב-URL (לא נראה ב-logs)

### 9. **איפה נמצא ה-Secret Key?**

**`src/main/resources/application.properties`**:
```properties
jwt.secret=mySecretKeyForStudyBuddyPlatformChangeInProduction
jwt.expiration=86400000
```

⚠️ **חשוב**: ב-production צריך לשנות את ה-Secret Key למשהו חזק יותר!

---

## סיכום

המערכת משתמשת ב-**JWT Token** עם **Secret Key** לחתימה. הטוקן נשלח ב-**Authorization Header** בכל בקשה, והשרת בודק אותו עם ה-Secret Key. עבור Jitsi, אנחנו לוקחים את שם המשתמש מהטוקן ושולחים אותו ל-Jitsi, אבל Jitsi עצמו לא משתמש בטוקן שלנו לאימות.


