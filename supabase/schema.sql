-- Bulkine Database Schema for Supabase
-- This schema handles user data, food logs, and weight history

-- 1. User Data Table (simplified - EXACT structure required)
CREATE TABLE IF NOT EXISTS users_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  weight DECIMAL(5,2), -- kg (float8)
  calories INTEGER, -- daily calorie target (int4)
  streak INTEGER DEFAULT 1, -- current streak (int4)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Food Log Table
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  food_name TEXT NOT NULL,
  kcal INTEGER NOT NULL,
  emoji TEXT,
  ingredients JSONB DEFAULT '[]',
  logged_date DATE NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_food_log UNIQUE(user_id, id)
);

-- 3. Weight History Table
CREATE TABLE IF NOT EXISTS weight_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_weight_date UNIQUE(user_id, recorded_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_history_user_date ON weight_history(user_id, recorded_date DESC);

-- Enable Row Level Security
ALTER TABLE users_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users_data
CREATE POLICY "Users can view own data" ON users_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON users_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON users_data
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for food_logs
CREATE POLICY "Users can view own food logs" ON food_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food logs" ON food_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food logs" ON food_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food logs" ON food_logs
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for weight_history
CREATE POLICY "Users can view own weight history" ON weight_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight history" ON weight_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight history" ON weight_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight history" ON weight_history
  FOR DELETE USING (auth.uid() = user_id);
