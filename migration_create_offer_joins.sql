-- Migration: Create offer_joins table
CREATE TABLE IF NOT EXISTS offer_joins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_info(user_uid) ON DELETE CASCADE,
  offer_id uuid REFERENCES offers(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now()
);
-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_offer_joins_offer_id ON offer_joins(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_joins_user_id ON offer_joins(user_id); 