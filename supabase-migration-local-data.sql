-- Migration: Add local_data JSONB column to profiles table
-- This enables cross-device sync for data currently stored only in localStorage
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS local_data JSONB DEFAULT '{}'::jsonb;

-- Add an index for faster reads
CREATE INDEX IF NOT EXISTS idx_profiles_local_data ON profiles USING gin (local_data);

-- Update RLS policy to allow users to read/write their own local_data
-- (profiles RLS should already handle this if you have row-level security on profiles)
