-- Migration: Add profile_photo_url column to user_info table
-- This migration adds support for user profile photos

-- Add profile_photo_url column to user_info table
ALTER TABLE user_info 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Add a comment to document the change
COMMENT ON COLUMN user_info.profile_photo_url IS 'URL path to user profile photo in storage'; 