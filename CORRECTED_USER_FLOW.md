# Corrected User Flow - Direct to Onboarding

## Fixed Issue
User should go directly from signup to onboarding, NOT through login to dashboard first.

## Changes Made

### 1. **app/signup/page.tsx** (Line 82 + Line 120)

**Before:**
```javascript
// Line 82
setTimeout(() => {
  router.push('/login');
}, 2000);

// Line 120 (success message)
Redirecting to login...
```

**After:**
```javascript
// Line 82
setTimeout(() => {
  router.push('/onboarding');
}, 2000);

// Line 120 (success message)
Let's get you set up...
```

**Result:** New user signs up → directly to onboarding (skips login)

---

### 2. **app/login/page.tsx** (Import + handleLogin function)

**Added import:**
```typescript
import { signIn, getCurrentUser, getUserProfile } from '@/lib/supabase-data';
```

**Updated handleLogin logic:**
```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setLoading(true);

  if (!email.trim() || !password.trim()) {
    setError('Please fill in all fields');
    setLoading(false);
    return;
  }

  try {
    await signIn(email, password);

    // Check if user has completed onboarding
    const userPlan = localStorage.getItem('userPlan');
    const profile = await getUserProfile();

    const hasCompletedOnboarding = userPlan || (profile && (profile.main_goal || profile.body_type));

    if (hasCompletedOnboarding) {
      // User completed onboarding → go to dashboard
      router.push('/dashboard');
    } else {
      // User hasn't done onboarding → go to onboarding
      router.push('/onboarding');
    }
  } catch (err: any) {
    // ... error handling
  } finally {
    setLoading(false);
  }
};
```

**Result:**
- Returning user who completed onboarding → dashboard
- Returning user who didn't complete onboarding → onboarding

---

## Complete New User Flow (CORRECTED)

```
┌──────────────────────────────────────┐
│    NEW USER FLOW (CORRECTED)         │
└──────────────────────────────────────┘

1. User opens app (/)
   ↓
   Not logged in? Show landing page

2. User clicks "Start Journey"
   ↓
   /signup (register)

3. Fills email, password, confirm password
   ↓
   Account created ✨

4. Shows: "Account Created! Let's get you set up..."
   ↓
   Auto-redirect after 2 seconds

5. /onboarding (7 questions)
   ↓
   Body type, main goal, frequency,
   height, weight, goal weight, commitment

6. /plan-result (preview)
   ↓
   Show weight progression animation

7. /setup (4 questions)
   ↓
   Appetite, meals/day, diet, workout time
   ↓
   Generate meal plan

8. /creating-plan (loading)
   ↓
   Progress bar animation (3s)

9. /dashboard ✅
   ↓
   Fully set up and ready to track
```

---

## Returning User Flow

```
┌──────────────────────────────────────┐
│    RETURNING USER FLOW               │
└──────────────────────────────────────┘

1. User opens app (/)
   ↓
   Check getCurrentUser()
   ↓
   If logged in → /dashboard
   If not logged in → Show landing page

2. User clicks "I already have account"
   ↓
   /login

3. Fills email, password
   ↓
   signIn successful ✓

4. Check onboarding status:
   ✅ Has completed (userPlan exists OR profile.main_goal exists)
   └─→ /dashboard

   ❌ NOT completed (no userPlan AND no profile.main_goal)
   └─→ /onboarding
```

---

## Route Flow Summary

| Route | From | To | Condition |
|-------|------|-----|-----------|
| `/signup` | home | `/onboarding` | On success |
| `/login` | home | `/dashboard` | If onboarding done ✅ |
| `/login` | home | `/onboarding` | If onboarding NOT done |
| `/onboarding` | `handleSubmit` | `/plan-result` | Always |
| `/plan-result` | button click | `/setup` | Always |
| `/setup` | `handleSubmit` | `/creating-plan` | Always |
| `/creating-plan` | auto | `/dashboard` | Progress 100% |
| `/dashboard` | safety check | `/onboarding` | If onboarding NOT done (fallback) |

---

## Safety Features

✅ **Dashboard still has fallback check**
- If user tries to access `/dashboard` manually without onboarding
- Still redirected to `/onboarding`

✅ **No circular redirects**
- Signup → onboarding (direct)
- Login → checks first
- Creating-plan → dashboard
- Dashboard → onboarding (only if needed)

✅ **Returning users handled**
- Already completed onboarding → dashboard
- Incomplete onboarding → onboarding

---

## Files Modified

| File | Changes |
|------|---------|
| `app/signup/page.tsx` | Line 82: redirect to `/onboarding` |
| `app/signup/page.tsx` | Line 120: success message updated |
| `app/login/page.tsx` | Line 6: added `getUserProfile` import |
| `app/login/page.tsx` | Lines 34-62: updated `handleLogin` with onboarding check |

---

## Build Status
✅ **Passing** - TypeScript clean, 0 errors, all 11 routes render

---

## Testing

### **New User Flow Test** ✅
1. Go to `/signup`
2. Fill form with valid email/password
3. Click Sign Up
4. See success message "Account Created! Let's get you set up..."
5. Auto-redirects to `/onboarding` (NOT `/login`)
6. Complete onboarding → setup → creating-plan → dashboard

### **Returning User Flow Test** ✅
1. Go to `/login`
2. Enter credentials (completed onboarding before)
3. Success → `/dashboard` (has plan)

### **Edge Case Test** ✅
1. Go to `/login`
2. Enter credentials (signed up but skipped onboarding)
3. Success → `/onboarding` (no plan yet)
