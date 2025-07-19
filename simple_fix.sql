-- Simple fix: Add the missing profit_duration_months column
-- Run this in your Supabase SQL Editor

-- Add the profit_duration_months column to investment_certificates table
ALTER TABLE investment_certificates 
ADD COLUMN IF NOT EXISTS profit_duration_months INTEGER DEFAULT 6;

-- Update any existing records to have a default value
UPDATE investment_certificates 
SET profit_duration_months = 6 
WHERE profit_duration_months IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'investment_certificates' 
AND column_name = 'profit_duration_months'; 