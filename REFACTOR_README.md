# Bulkine App - Refactored Architecture

## Overview
The Bulkine app has been completely refactored to provide a stable, production-ready authentication and data flow. This document describes the clean architecture and user flows.

## User Flows

### 1. New User Flow
```
Opening Page → Sign Up → Onboarding → Setup → Dashboard
```

### 2. Existing User Flow
```
Opening Page → Login → Dashboard (direct)
```

### 3. Active Logged-in User Flow
```
App Open → Dashboard (direct, no redirects)
```

## Database Structure

### users_data table
```sql
CREATE TABLE users_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  weight DECIMAL(5,2), -- kg
  calories INTEGER, -- daily calorie target
  streak INTEGER DEFAULT 1, -- current streak
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**IMPORTANT**: Only these 6 columns exist. Do not attempt to insert other fields like `appetite`, `main_goal`, `workout_frequency`, etc.

## Authentication Flow

### Root Page Logic (`app/page.tsx`)
1. Check session with `supabase.auth.getSession()`
2. If no session → show landing page
3. If session exists:
   - Fetch user profile from `users_data` table
   - If profile exists → dashboard
   - If no profile → onboarding

### Session Check Priority
- Uses database as source of truth
- No localStorage flags for authentication
- Single point of routing control

## Data Storage Strategy

### Supabase Database
- **User profile**: weight, calories, streak
- **Food logs**: all daily food entries
- **Weight history**: historical weight entries

### localStorage
- **User plan**: generated diet plan (complex JSON)
- **Onboarding data**: temporary during onboarding flow

## Key API Functions

### upsertUserProfile
```javascript
const profileData = {
  user_id: user.id,
  weight: 70.5,
  calories: 2500,
  streak: 1
};
await supabase.from("users_data").upsert(profileData, { onConflict: 'user_id' });
```

### getUserProfile
```javascript
const { data } = await supabase
  .from('users_data')
  .select('*')
  .eq('user_id', user.id)
  .single();
```

## Onboarding Flow Details

### 1. Onboarding Page (`/onboarding`)
- Collects: bodyType, mainGoal, workoutFrequency, height, weight, goalWeight, commitment
- Saves to localStorage as `onboardingData`
- Navigates to `/setup` (direct, no intermediate pages)

### 2. Setup Page (`/setup`)
- Loads onboarding data from localStorage
- Collects: appetite, mealsPerDay, dietPreference, workoutTime
- Generates diet plan using `generatePlanFromOnboarding()`
- Saves profile to Supabase (weight, calories, streak only)
- Saves plan to localStorage as `userPlan`
- Clears onboarding data
- Navigates to `/dashboard`

### 3. Dashboard Page (`/dashboard`)
- Loads profile from Supabase
- Loads plan from localStorage
- Loads food logs and weight history from Supabase
- Provides full app functionality

## Error Handling

### Principles
- Show actual `error.message` instead of generic messages
- Log all errors to console for debugging
- Use optimistic updates for food logging
- Graceful fallbacks for missing data

### Food Logging
- Optimistic updates (UI updates immediately)
- Background sync to Supabase
- Rollback on error
- Real error messages displayed

## Logout Implementation

```javascript
const handleLogout = async () => {
  await supabase.auth.signOut();
  router.replace('/'); // Back to root page
};
```

- Clean logout to Supabase
- Redirect to root page (not opening page)
- Root page handles fresh authentication check

## Migration

To upgrade existing database, run `migration.sql`:

```bash
# In Supabase Dashboard SQL Editor
# Run the contents of migration.sql
```

This will:
1. Drop existing incompatible table
2. Create new table with correct structure
3. Enable RLS policies
4. Verify column structure

## File Structure

```
app/
├── page.tsx              # Root authentication routing
├── onboarding/page.tsx   # Basic info collection
├── setup/page.tsx        # Plan generation & save
├── dashboard/page.tsx    # Main app interface
├── login/page.tsx        # Authentication
└── signup/page.tsx       # User registration

lib/
├── supabase.js           # Supabase client
├── supabase-data.js      # Database operations
└── diet-engine/          # Plan generation logic
```

## Production Checklist

- [x] Single source of truth for authentication (root page)
- [x] Clean database schema (no extra columns)
- [x] Proper error handling with real error messages
- [x] Optimistic UI updates for food logging
- [x] No localStorage authentication flags
- [x] Direct onboarding flow (no unnecessary intermediate pages)
- [x] Stable logout implementation
- [x] RLS policies for data security

## Testing the Flow

1. **New User**: Clear all localStorage, visit app → should see landing page
2. **Sign Up**: Create account → should go through onboarding → setup → dashboard
3. **Logout**: Click logout → should return to landing page
4. **Login**: Login with same account → should go directly to dashboard
5. **Food Logging**: Add food → should update immediately and sync to database
6. **Refresh**: Refresh dashboard → should load data correctly from database

The app now provides a clean, predictable user experience with stable data persistence.