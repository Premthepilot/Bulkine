-- FIX RLS POLICIES - Run this in Supabase Dashboard SQL Editor
-- This script will drop and recreate all RLS policies to fix authorization errors

-- ========================================
-- STEP 1: Drop existing policies (if any)
-- ========================================

-- Drop users_data policies
DROP POLICY IF EXISTS "Users can view own data" ON users_data;
DROP POLICY IF EXISTS "Users can insert own data" ON users_data;
DROP POLICY IF EXISTS "Users can update own data" ON users_data;
DROP POLICY IF EXISTS "Users can delete own data" ON users_data;

-- Drop food_logs policies
DROP POLICY IF EXISTS "Users can view own food logs" ON food_logs;
DROP POLICY IF EXISTS "Users can insert own food logs" ON food_logs;
DROP POLICY IF EXISTS "Users can update own food logs" ON food_logs;
DROP POLICY IF EXISTS "Users can delete own food logs" ON food_logs;

-- Drop weight_history policies
DROP POLICY IF EXISTS "Users can view own weight history" ON weight_history;
DROP POLICY IF EXISTS "Users can insert own weight history" ON weight_history;
DROP POLICY IF EXISTS "Users can update own weight history" ON weight_history;
DROP POLICY IF EXISTS "Users can delete own weight history" ON weight_history;

-- ========================================
-- STEP 2: Enable RLS on all tables
-- ========================================

ALTER TABLE users_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_history ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 3: Create RLS policies for users_data
-- ========================================

CREATE POLICY "Users can view own data" ON users_data
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON users_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON users_data
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON users_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- STEP 4: Create RLS policies for food_logs
-- ========================================

CREATE POLICY "Users can view own food logs" ON food_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food logs" ON food_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food logs" ON food_logs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own food logs" ON food_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- STEP 5: Create RLS policies for weight_history
-- ========================================

CREATE POLICY "Users can view own weight history" ON weight_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight history" ON weight_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight history" ON weight_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight history" ON weight_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- STEP 6: Verify policies are created
-- ========================================

SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected output: 12 policies (4 per table x 3 tables)
-- users_data: SELECT, INSERT, UPDATE, DELETE
-- food_logs: SELECT, INSERT, UPDATE, DELETE
-- weight_history: SELECT, INSERT, UPDATE, DELETE

-- ========================================
-- DEBUG: Test if current user can insert
-- ========================================

-- You can test by running this (replace with actual values):
-- INSERT INTO food_logs (user_id, food_name, kcal, logged_date)
-- VALUES (auth.uid(), 'Test Food', 100, CURRENT_DATE);

-- If this fails with RLS error, check that:
-- 1. You are logged in (auth.uid() returns a value)
-- 2. The user_id column exists in the table
-- 3. RLS is enabled on the table