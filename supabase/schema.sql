-- Bulkine Database Schema for Supabase
-- This schema handles user profile data, food logs, weight history, and streak tracking

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create custom types
DO $$ BEGIN
  CREATE TYPE body_type AS ENUM ('skinny', 'no-results', 'low-appetite');
  CREATE TYPE main_goal AS ENUM ('gain-weight', 'build-muscle', 'maintain-weight', 'lose-weight', 'improve-appetite', 'stay-consistent');
  CREATE TYPE workout_frequency AS ENUM ('none', '1-2', '3-5', 'daily');
  CREATE TYPE commitment_level AS ENUM ('very-serious', 'serious', 'exploring');
  CREATE TYPE appetite_level AS ENUM ('struggle', 'normal', 'lot');
  CREATE TYPE meals_per_day AS ENUM ('2', '3', '4+');
  CREATE TYPE diet_preference AS ENUM ('vegetarian', 'non-veg', 'eggetarian');
  CREATE TYPE workout_time AS ENUM ('none', '10-20', '30-45', '60');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. User Profile Table
CREATE TABLE IF NOT EXISTS users_data (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,

  -- Onboarding data
  body_type body_type,
  main_goal main_goal,
  workout_frequency workout_frequency,
  height INTEGER, -- cm
  weight DECIMAL(5,2), -- kg
  goal_weight DECIMAL(5,2), -- kg
  commitment commitment_level,

  -- Setup data
  appetite appetite_level,
  meals_per_day meals_per_day,
  diet_preference diet_preference,
  workout_time workout_time, -- Added: Time available for workouts

  -- User plan (generated diet plan)
  user_plan JSONB,

  -- Streak tracking
  daily_streak INTEGER DEFAULT 0,
  last_log_date DATE,
  last_active_date DATE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Food Log Table
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  -- Food entry data
  food_name TEXT NOT NULL,
  kcal INTEGER NOT NULL,
  emoji TEXT,
  ingredients JSONB DEFAULT '[]',

  -- Tracking
  logged_date DATE NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Index for fast queries
  CONSTRAINT unique_user_food_log UNIQUE(user_id, id)
);

-- 3. Weight History Table
CREATE TABLE IF NOT EXISTS weight_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  weight DECIMAL(5,2) NOT NULL, -- kg
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one weight entry per day per user
  CONSTRAINT unique_user_weight_date UNIQUE(user_id, recorded_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_history_user_date ON weight_history(user_id, recorded_date DESC);

-- Enable Row Level Security
ALTER TABLE users_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON users_data
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users_data
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users_data
  FOR UPDATE USING (auth.uid() = id);

-- Food Logs: Users can only access their own food logs
CREATE POLICY "Users can view own food logs" ON food_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food logs" ON food_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food logs" ON food_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food logs" ON food_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Weight History: Users can only access their own weight history
CREATE POLICY "Users can view own weight history" ON weight_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight history" ON weight_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight history" ON weight_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight history" ON weight_history
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on users_data
CREATE TRIGGER update_users_data_updated_at
  BEFORE UPDATE ON users_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_data (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();