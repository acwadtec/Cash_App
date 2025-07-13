-- Migration: Add new fields to offers table
-- Date: 2024-01-XX

-- Add new columns to offers table
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_profit DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_profit DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comments to document the new fields
COMMENT ON COLUMN offers.cost IS 'Cost of the offer';
COMMENT ON COLUMN offers.daily_profit IS 'Daily profit from the offer';
COMMENT ON COLUMN offers.monthly_profit IS 'Monthly profit from the offer';
COMMENT ON COLUMN offers.image_url IS 'URL of the offer image';

-- Create index on cost for better query performance
CREATE INDEX IF NOT EXISTS idx_offers_cost ON offers(cost);

-- Create index on profits for better query performance
CREATE INDEX IF NOT EXISTS idx_offers_daily_profit ON offers(daily_profit);
CREATE INDEX IF NOT EXISTS idx_offers_monthly_profit ON offers(monthly_profit); 