-- Migration Script: Update users_data table structure
-- Run this in your Supabase Dashboard SQL Editor

-- STEP 1: Drop existing table and policies (if you have no important data)
-- WARNING: This will delete all existing data in users_data table
DROP TABLE IF EXISTS users_data CASCADE;

-- STEP 2: Create new table with correct structure
CREATE TABLE users_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  weight DECIMAL(5,2), -- kg
  calories INTEGER, -- daily calorie target
  streak INTEGER DEFAULT 1, -- current streak
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: Enable Row Level Security
ALTER TABLE users_data ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create RLS Policies
CREATE POLICY "Users can view own data" ON users_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON users_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON users_data
  FOR UPDATE USING (auth.uid() = user_id);

-- STEP 5: Verify the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users_data'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid, not null)
-- user_id (uuid, not null)
-- weight (numeric, nullable)
-- calories (integer, nullable)
-- streak (integer, nullable)
-- created_at (timestamp with time zone, nullable)

-- ALTERNATIVE: If you have existing data to preserve
/*
-- STEP 1: Rename existing table
ALTER TABLE users_data RENAME TO users_data_backup;

-- STEP 2: Create new table with correct structure (see above)
-- ... (same CREATE TABLE statement)

-- STEP 3: Migrate data if needed
INSERT INTO users_data (user_id, weight, calories, streak, created_at)
SELECT
  user_id,
  weight,
  calories,
  COALESCE(streak, 1) as streak,
  NOW() as created_at
FROM users_data_backup
WHERE user_id IS NOT NULL;

-- STEP 4: Drop backup table once you verify data migration
-- DROP TABLE users_data_backup;
*/