# Onboarding Bypass (Testing Only)

## Purpose
This is a **temporary, development-only** bypass to allow testing of the Google account linking flow without completing onboarding.

## How to Enable

1. Create a `.env.local` file in the `frontend/` directory (if it doesn't exist)
2. Add the following line:
   ```
   VITE_DISABLE_ONBOARDING_CHECK=true
   ```
3. Restart your development server

## How to Disable

1. Remove the line from `.env.local`, OR
2. Set it to `false`:
   ```
   VITE_DISABLE_ONBOARDING_CHECK=false
   ```
3. Restart your development server

## Important Notes

⚠️ **NEVER commit `.env.local` to version control** - it's already in `.gitignore`

⚠️ **NEVER set this flag in production** - it's only for local development/testing

⚠️ **This bypass is temporary** - it will be removed once the backend onboarding endpoint is implemented

## Reverting the Change

To remove this bypass entirely, simply:
1. Remove the `disableOnboardingCheck` logic from `ProtectedRoute.tsx`
2. Restore the original `needsOnboarding` check

## Location

The bypass logic is in: `frontend/src/components/ProtectedRoute.tsx` (lines 30-35)

