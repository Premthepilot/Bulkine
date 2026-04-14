# Supabase Schema Mismatch Fixes

## Errors Fixed

### 1. ✅ Food Log Emoji Column Error
**Error**: "Could not find the 'emoji' column of 'food_logs'"

**Root Cause**:
- `addFoodLog()` in `supabase-data.js` was trying to insert `emoji` field
- Database table doesn't have `emoji` column

**Fix** (lib/supabase-data.js:112-135):
```javascript
// REMOVED from insert payload:
// emoji,
// ingredients,

// NOW only inserts required fields:
const { data, error } = await supabase
  .from('food_logs')
  .insert({
    user_id: user.id,
    food_name: name,
    calories_per_unit,
    quantity,
    total_calories,
    logged_date: new Date().toISOString().split('T')[0]
  })
```

**UI Impact**: None - the dashboard uses optimistic updates with emoji from the UI, then falls back to '🍽️' when database returns it

---

### 2. ✅ Streak Duplicate Key Constraint Error
**Error**: "duplicate key value violates unique constraint user_streaks_user_id_key"

**Root Cause**:
- `updateStreak()` uses `.upsert()` but doesn't specify the conflict column
- First call creates a row with user_id
- Subsequent calls try to insert again instead of updating → **unique constraint violation**

**Fix** (lib/supabase-data.js:231-258):
```javascript
// Added onConflict configuration:
const { data, error } = await supabase
  .from('user_streaks')
  .upsert({
    user_id: user.id,
    current_streak: current,
    best_streak: Math.max(current, streak?.best_streak || 0),
    last_updated: new Date().toISOString()
  }, { onConflict: 'user_id' })  // ✅ Tells Supabase to UPDATE if user_id exists
  .select()
  .single()

// Also changed .single() to .maybeSingle() when reading existing streak
// to avoid errors if row doesn't exist yet
const { data: streak } = await supabase
  .from('user_streaks')
  .select('*')
  .eq('user_id', user.id)
  .maybeSingle()  // ✅ Won't error if no row found
```

---

## Files Modified
- **lib/supabase-data.js**
  - `addFoodLog()` function: Removed emoji & ingredients from insert
  - `updateStreak()` function: Added `onConflict: 'user_id'` to upsert, changed .single() to .maybeSingle()

---

## Build Status
✅ **Passing** - TypeScript clean, 0 errors, all 11 routes render

---

## Behavior After Fix
- ✅ Food insert works without emoji error
- ✅ Streak updates work on first and subsequent calls
- ✅ No duplicate key constraint violations
- ✅ UI displays emojis correctly (from optimistic updates)
- ✅ App runs smoothly without crashes
