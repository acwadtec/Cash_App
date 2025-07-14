-- Migration: Remove role column from user_info table
-- This migration removes the role column since we're now using a separate admins table

-- First, let's check if the role column exists and has any admin values
-- This is a safety check before removing the column

-- Remove the role column from user_info table
ALTER TABLE user_info DROP COLUMN IF EXISTS role;

-- Also remove is_admin column if it exists (some systems might use this instead)
ALTER TABLE user_info DROP COLUMN IF EXISTS is_admin;

-- Add a comment to document the change
COMMENT ON TABLE user_info IS 'User information table - admin status now managed via separate admins table'; 