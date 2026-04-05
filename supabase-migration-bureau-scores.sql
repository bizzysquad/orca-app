-- Migration: Add credit bureau score columns to profiles table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_score_transunion INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_score_equifax INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_score_experian INTEGER DEFAULT 0;
