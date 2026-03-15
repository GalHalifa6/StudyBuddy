# Quiz Feature Implementation Summary

## Overview
The quiz feature has been updated to support three completion states:
1. **NOT_STARTED** - User hasn't done the quiz (requires onboarding)
2. **IN_PROGRESS** - User partially completed the quiz (partial reliability)
3. **COMPLETED** - User fully completed the quiz (full reliability)
4. **SKIPPED** - User chose to skip the quiz (no profile matching)

## Backend Changes

### New Files Created
- `QuizStatus.java` - Enum for tracking quiz completion status

### Modified Files
- `CharacteristicProfile.java` - Added `quizStatus`, `reliabilityPercentage`, and helper methods
- `QuizService.java` - Updated logic to handle partial completion and skip functionality
- `QuizController.java` - Added new endpoints for skip and onboarding status
- `QuizDto.java` - Updated DTOs with new fields

## API Endpoints

### GET `/api/quiz/onboarding-status`
**Purpose**: Quick check if user requires onboarding (call after login)

**Response**:
```json
{
  "userId": 123,
  "requiresOnboarding": true,
  "quizStatus": "NOT_STARTED"
}
```

### GET `/api/quiz/profile`
**Purpose**: Get detailed profile information

**Response**:
```json
{
  "userId": 123,
  "message": "Please complete the onboarding quiz...",
  "quizStatus": "NOT_STARTED",
  "reliabilityPercentage": 0.0,
  "requiresOnboarding": true
}
```

### POST `/api/quiz/submit`
**Purpose**: Submit quiz answers (supports partial completion)

**Request**:
```json
{
  "answers": {
    "1": 5,
    "2": 8
  }
}
```

**Response** (Partial):
```json
{
  "userId": 123,
  "message": "Progress saved! You've answered 2/10 questions (20%). Complete the quiz for better matches.",
  "quizStatus": "IN_PROGRESS",
  "reliabilityPercentage": 0.2,
  "requiresOnboarding": false
}
```

**Response** (Complete):
```json
{
  "userId": 123,
  "message": "Your learning profile is complete! We'll use this to find the best group matches for you.",
  "quizStatus": "COMPLETED",
  "reliabilityPercentage": 1.0,
  "requiresOnboarding": false
}
```

### POST `/api/quiz/skip`
**Purpose**: Skip the quiz entirely

**Response**:
```json
{
  "userId": 123,
  "message": "Quiz skipped. You can take it later from settings to improve group matching.",
  "quizStatus": "SKIPPED",
  "reliabilityPercentage": 0.0,
  "requiresOnboarding": false
}
```

### GET `/api/quiz`
**Purpose**: Get quiz questions (unchanged)

## Frontend Integration Guide

### Post-Login Flow
After successful login, the frontend should:

```typescript
// After login success
const loginResponse = await authApi.login(credentials);

// Check onboarding status
const onboardingStatus = await quizApi.getOnboardingStatus();

if (onboardingStatus.requiresOnboarding) {
  // Redirect to /onboarding page
  navigate('/onboarding');
} else {
  // Redirect to dashboard or intended page
  navigate('/dashboard');
}
```

### Onboarding Page Flow
The Onboarding page should allow users to:

1. **Start Quiz** - Fetch questions and display quiz
2. **Skip Quiz** - Call `/api/quiz/skip` and proceed to app
3. **Partial Submit** - Allow submitting even with unanswered questions

```typescript
// User submits quiz (partial or complete)
const submitQuiz = async (answers: Record<number, number>) => {
  const response = await quizApi.submitQuiz({ answers });
  
  // Show message to user
  showNotification(response.message);
  
  // Check completion status
  if (response.quizStatus === 'COMPLETED') {
    // Full profile - proceed to app
    navigate('/dashboard');
  } else if (response.quizStatus === 'IN_PROGRESS') {
    // Partial profile - show option to continue or proceed
    showPartialCompletionDialog({
      percentage: response.reliabilityPercentage * 100,
      onContinue: () => navigate('/dashboard'),
      onFinish: () => {/* Stay on quiz */}
    });
  }
};

// User skips quiz
const skipQuiz = async () => {
  const response = await quizApi.skipQuiz();
  showNotification(response.message);
  navigate('/dashboard');
};
```

### API Client Example
```typescript
// frontend/src/api/quiz.ts

export const quizApi = {
  getOnboardingStatus: async () => {
    const response = await axios.get('/api/quiz/onboarding-status');
    return response.data;
  },
  
  getProfile: async () => {
    const response = await axios.get('/api/quiz/profile');
    return response.data;
  },
  
  getQuiz: async () => {
    const response = await axios.get('/api/quiz');
    return response.data;
  },
  
  submitQuiz: async (data: { answers: Record<number, number> }) => {
    const response = await axios.post('/api/quiz/submit', data);
    return response.data;
  },
  
  skipQuiz: async () => {
    const response = await axios.post('/api/quiz/skip');
    return response.data;
  }
};
```

## Quiz Status States

| Status | Reliability | Can Match? | Requires Onboarding? | Description |
|--------|-------------|------------|---------------------|-------------|
| NOT_STARTED | 0% | No | Yes | User just registered, hasn't seen quiz |
| IN_PROGRESS | 20-99% | Yes | No | Partial completion, some matching capability |
| COMPLETED | 100% | Yes | No | Full profile, best matching |
| SKIPPED | 0% | Limited | No | User opted out, basic matching only |

## Matching Algorithm Considerations

When implementing group matching:
- Users with `COMPLETED` status get priority matching
- Users with `IN_PROGRESS` status get matches based on reliability percentage
- Users with `SKIPPED` status should use fallback matching (location, interests, etc.)
- Users with `NOT_STARTED` shouldn't be matched until they complete onboarding

## Database Migration Notes

The CharacteristicProfile table now has:
- `quiz_status` (VARCHAR(20)) - Enum value (NOT_STARTED, IN_PROGRESS, COMPLETED, SKIPPED)
- `reliability_percentage` (DOUBLE) - 0.0 to 1.0
- Removed: `quiz_completed` (BOOLEAN) - Replaced by quizStatus enum

Existing profiles will need migration:
```sql
-- Migration example (adjust based on your DB)
UPDATE characteristic_profiles 
SET quiz_status = CASE 
  WHEN quiz_completed = true THEN 'COMPLETED'
  WHEN answered_questions > 0 THEN 'IN_PROGRESS'
  ELSE 'NOT_STARTED'
END,
reliability_percentage = CASE
  WHEN quiz_completed = true THEN 1.0
  WHEN total_questions > 0 THEN answered_questions / total_questions
  ELSE 0.0
END;
```

## Testing Checklist

- [ ] New user registration → redirects to onboarding
- [ ] User completes full quiz → redirects to dashboard
- [ ] User completes partial quiz → shows reliability percentage
- [ ] User skips quiz → can still access app with limited matching
- [ ] User can retake quiz from settings (if implemented)
- [ ] Existing users without profile → redirected to onboarding on next login
- [ ] API returns correct requiresOnboarding flag
