# Feature Parity Checklist: Web vs Mobile

This document tracks feature parity between the **Web Frontend** (`/frontend`) and **Mobile App** (`/studybuddy-mobile`).

## ✅ = Feature Complete | 🟡 = Partially Implemented | ❌ = Missing | 🔧 = Backend Only

---

## 🔐 Authentication & User Management

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Login/Register | ✅ | ✅ | Both fully implemented |
| Onboarding Flow | ✅ | ✅ | Questionnaire, preferences |
| Profile Management | ✅ | ✅ | View and edit profiles |
| Expert Profile Creation | ✅ | ✅ | Expert dashboard available |
| Role-based Access | ✅ | ✅ | USER, EXPERT, ADMIN |

---

## 📚 Courses

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Browse Courses | ✅ | ✅ | `/courses` and `CoursesScreen` |
| Course Details | ✅ | ✅ | Full course info, enrollment |
| Enroll/Unenroll | ✅ | ✅ | Both platforms |
| My Courses | ✅ | ✅ | Enrolled courses view |
| Course Search | ✅ | 🟡 | Web has search, mobile may need enhancement |

---

## 👥 Groups & Collaboration

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Browse Groups | ✅ | ✅ | `/groups` and `GroupsScreen` |
| Create Group | ✅ | ✅ | Both platforms |
| Group Details | ✅ | ✅ | Members, files, description |
| Join/Leave Group | ✅ | ✅ | Membership management |
| Group Chat | ✅ | ✅ | Real-time messaging via WebSocket |
| Group Files | ✅ | ✅ | File upload/download |
| Pin Messages | ✅ | ✅ | Message pinning feature |
| Read Receipts | ✅ | ✅ | Unread message tracking |

---

## 💬 Messaging

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Group Chat | ✅ | ✅ | Full implementation |
| Direct Messages (Student ↔ Expert) | 🔧 | 🔧 | **Backend complete, UI pending** |
| Message Notifications | ✅ | ✅ | Unread counts, summaries |
| File Attachments | ✅ | ✅ | File sharing in messages |

---

## 🎓 Expert Features

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Browse Experts | ✅ | ✅ | Expert search and filtering |
| Expert Profile View | ✅ | ✅ | Full profile with stats |
| Expert Dashboard | ✅ | ✅ | Stats, sessions, questions |
| Ask Question to Expert | ✅ | ✅ | Q&A feature |
| Public Q&A | ✅ | ✅ | Browse public questions |
| Expert Reviews | ✅ | ✅ | View and submit reviews |
| Create Session (Expert) | ✅ | ✅ | Expert can create sessions |
| Answer Questions | ✅ | ✅ | Expert Q&A management |
| Manage Availability | ✅ | ✅ | Accepting students toggle |

---

## 📅 Sessions

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Browse Sessions | ✅ | ✅ | Public session browsing |
| Join Session | ✅ | ✅ | Register for sessions |
| Session Room | ✅ | ✅ | Chat, whiteboard, participants |
| Session Requests (Booking) | 🔧 | 🔧 | **Backend complete, UI pending** |
| Session Request Approval | 🔧 | 🔧 | **Backend complete, UI pending** |
| Video Call (Jitsi) | ✅ | ✅ | **Newly added - STEP 4** |
| Session Notes | ✅ | ✅ | Collaborative notes |
| Whiteboard | ✅ | ✅ | Real-time drawing |
| Code Editor | ✅ | ✅ | Collaborative coding |
| Session Files | ✅ | ✅ | File sharing in sessions |
| Rate Session | ✅ | ✅ | Post-session feedback |

---

## 🔔 Notifications

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Notification Panel | ✅ | ✅ | Real-time notifications |
| Unread Count | ✅ | ✅ | Badge counts |
| Notification Types | ✅ | ✅ | Various event types |
| Mark as Read | ✅ | ✅ | Notification management |

---

## 🏠 Dashboard

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Student Dashboard | ✅ | ✅ | Metrics, upcoming sessions |
| Expert Dashboard | ✅ | ✅ | Expert-specific stats |
| Quick Actions | ✅ | ✅ | Shortcuts to key features |
| Recent Activity | ✅ | ✅ | Activity feed |

---

## 📝 Questions & Answers

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Ask Question | ✅ | ✅ | Student can ask experts |
| My Questions | ✅ | ✅ | View submitted questions |
| Public Q&A Browse | ✅ | ✅ | Public questions feed |
| Answer Questions (Expert) | ✅ | ✅ | Expert answers |
| Upvote/Downvote | ✅ | 🟡 | Web has voting, mobile may need |
| Accept Answer | ✅ | 🟡 | Web has accept, mobile may need |
| Follow-up Questions | ✅ | 🟡 | Web has follow-up, mobile may need |

---

## ⭐ Reviews

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| View Expert Reviews | ✅ | ✅ | Public reviews |
| Submit Review | ✅ | ✅ | Rate experts |
| Review Eligibility Check | ✅ | ✅ | Can review logic |
| Expert Response to Reviews | ✅ | ✅ | Expert can respond |

---

## 🎥 Video & Media

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Jitsi Video Integration | ✅ | ✅ | **Newly added - STEP 4** |
| Embedded Video (Web) | ✅ | N/A | Web uses iframe embed |
| External Video Link (Mobile) | N/A | ✅ | Mobile opens in browser/app |
| Mic/Camera Controls | ✅ | ✅ | Via Jitsi interface |
| Screen Sharing | ✅ | ✅ | Via Jitsi interface |

---

## 📊 Statistics & Analytics

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Expert Stats | ✅ | ✅ | Dashboard metrics |
| Session Stats | ✅ | ✅ | Session analytics |
| Question Stats | ✅ | ✅ | Q&A metrics |
| Profile Stats | ✅ | ✅ | User profile stats |

---

## 🔍 Search & Discovery

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Expert Search | ✅ | ✅ | Search by name, specialization |
| Course Search | ✅ | 🟡 | Web has full search |
| Group Search | ✅ | 🟡 | Web has search |
| Question Search | ✅ | 🟡 | Web has search |
| Session Search | ✅ | 🟡 | Web has filters |

---

## 🗂️ File Management

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Upload Files | ✅ | ✅ | Group and session files |
| Download Files | ✅ | ✅ | File downloads |
| View File Preview | ✅ | 🟡 | Web may have more previews |
| File Metadata | ✅ | ✅ | Upload info, size, type |

---

## ⚙️ Settings

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Profile Settings | ✅ | ✅ | Edit profile |
| Notification Settings | 🟡 | 🟡 | Basic settings available |
| Privacy Settings | 🟡 | 🟡 | Limited settings |
| Account Management | ✅ | ✅ | Profile updates |

---

## 📱 Platform-Specific Features

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Responsive Design | ✅ | N/A | Web is responsive |
| Native Navigation | N/A | ✅ | React Navigation |
| Push Notifications | 🟡 | 🟡 | Backend ready, may need setup |
| Offline Support | ❌ | ❌ | Not implemented |
| Biometric Auth | ❌ | ❌ | Could be added |

---

## 🆕 NEW FEATURES (Implemented in this session)

### ✅ Session Request Workflow
- **Status**: Backend + API clients complete
- **Web UI**: ❌ Pending
- **Mobile UI**: ❌ Pending
- **Features**:
  - Student can request 1:1 session with expert
  - Expert can approve/reject/counter-propose
  - Automatic session creation on approval
  - Notification integration

### ✅ Direct Messaging (Student ↔ Expert)
- **Status**: Backend + API clients complete
- **Web UI**: ❌ Pending
- **Mobile UI**: ❌ Pending
- **Features**:
  - Create/get conversation between two users
  - Send/receive direct messages
  - Read receipts
  - WebSocket real-time updates
  - Conversation list

### ✅ Video/Mic Support (Jitsi)
- **Status**: ✅ Complete
- **Web**: Embedded Jitsi iframe component
- **Mobile**: Opens Jitsi link in browser/app
- **Features**:
  - Automatic Jitsi link generation
  - Stable room URLs per session
  - Mic/camera controls via Jitsi
  - Screen sharing via Jitsi

---

## 🎯 Priority Missing Features

### High Priority
1. **Session Request UI** (Web + Mobile) - Critical for booking workflow
2. **Direct Messaging UI** (Web + Mobile) - Critical for student-expert communication

### Medium Priority
3. Enhanced search features on mobile
4. Push notification setup
5. File preview enhancements

### Low Priority
6. Offline mode support
7. Biometric authentication
8. Advanced analytics dashboards

---

## 📈 Overall Parity Score

- **Core Features**: ~95% parity ✅
- **Advanced Features**: ~85% parity 🟡
- **UI Polish**: ~90% parity ✅
- **New Features**: Backend ready, UI pending 🔧

---

## 🔄 Next Steps for Full Parity

1. Implement Session Request UI on both platforms
2. Implement Direct Messaging UI on both platforms
3. Enhance mobile search capabilities
4. Add comprehensive error handling and loading states
5. Improve accessibility on both platforms
6. Add comprehensive testing

---

**Last Updated**: After STEP 1-4, 6 implementation
**Next Review**: After UI components for Session Requests and Direct Messaging are added

