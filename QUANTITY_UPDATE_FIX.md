# Food Quantity Update Persistence Fix

## Problem
- Incrementing/decrementing food quantity updated the UI
- BUT database was NOT updated
- After page refresh, old data was restored

## Solution

### 1. Added `updateFoodLog()` Function (lib/supabase-data.js:135-154)
```javascript
export const updateFoodLog = async (id, { quantity, calories_per_unit }) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const total_calories = calories_per_unit * quantity

  const { data, error } = await supabase
    .from('food_logs')
    .update({
      quantity,
      total_calories
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}
```

**Key Features:**
- Verifies user is authenticated
- Calculates `total_calories = calories_per_unit × quantity`
- Updates only the changed fields in database
- Includes row-level security check (user_id)

---

### 2. Converted `updateQuantity()` to Async (app/dashboard/page.tsx:1086-1135)

**Before:** Sync function that only updated UI state

**After:** Async function with 3-step pattern:

#### Step 1: Optimistic Update
```javascript
// Immediately update UI for snappy response
setFoodLog((prev) =>
  prev.map((item) =>
    item.id === id ? { ...item, quantity: newQuantity } : item
  )
);
```

#### Step 2: Database Update
```javascript
// Persist to Supabase
await updateFoodLog(id, {
  quantity: newQuantity,
  calories_per_unit: entry.caloriesPerUnit
});
```

#### Step 3: Refresh Profile Data
```javascript
// Get updated calorie totals from database
const updatedProfile = await getUserProfile();
if (updatedProfile) {
  setUserProfile(updatedProfile);
}
```

---

### 3. Full Error Handling (app/dashboard/page.tsx:1122-1131)

**Try/Catch Pattern:**
```javascript
try {
  setSaving(true);
  // ... optimistic update and DB update
} catch (error) {
  console.error('Error updating food quantity:', error);
  const errorMessage = error instanceof Error ? error.message : 'Failed to update food quantity';
  setError(errorMessage);

  // Revert optimistic update if DB fails
  setFoodLog((prev) =>
    prev.map((item) =>
      item.id === id ? originalEntry : item
    )
  );
} finally {
  setSaving(false);
}
```

**Error Recovery:**
- Stores original entry before optimistic update
- Reverts to original if database update fails
- Shows error message to user
- Clears loading state

---

### 4. Quantity Zero Handling (app/dashboard/page.tsx:1093-1095)

When quantity reaches 0:
- Calls `removeFood()` instead of inline deletion
- Uses existing deletion logic with proper database cleanup

---

### 5. Import Added (app/dashboard/page.tsx:23)

```javascript
import {
  ...
  updateFoodLog,
  ...
} from '@/lib/supabase-data';
```

---

## Files Modified
1. **lib/supabase-data.js** - Added `updateFoodLog()` function
2. **app/dashboard/page.tsx** - Converted `updateQuantity()` to async with DB persistence

---

## Build Status
✅ **Passing** - TypeScript clean, 0 errors, all 11 routes render

---

## Behavior After Fix

| Action | Before | After |
|--------|--------|-------|
| Increment quantity | UI updated only | ✅ UI + DB updated |
| Decrement quantity | UI updated only | ✅ UI + DB updated |
| Page refresh | Old data restored | ✅ Persisted data shown |
| Network error | UI partially updated | ✅ Reverted to original |
| Quantity = 0 | Item removed from UI | ✅ Item deleted from DB |

---

## Data Flow

```
User clicks +/- button
    ↓
updateQuantity() called (async)
    ↓
Save original entry (for rollback)
    ↓
Optimistic: Update UI immediately
    ↓
Database: Call updateFoodLog() to Supabase
    ↓
Refresh: Get updated profile with new calorie totals
    ↓
Success: UI sync'd with database
    ↓
Error: Revert UI to original entry, show error message
```

---

## Testing Checklist

- [ ] Increment food quantity → UI updates + DB updates
- [ ] Decrement food quantity → UI updates + DB updates
- [ ] Page refresh → Shows updated quantity
- [ ] Quantity to 0 → Item removed from UI and DB
- [ ] Offline/network error → UI reverts to original
- [ ] Calorie totals recalculate after quantity change
