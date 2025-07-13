-- Migration: Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id serial PRIMARY KEY,
  user_uid uuid NOT NULL REFERENCES user_info(user_uid) ON DELETE CASCADE,
  user_name text NOT NULL,
  phone_number text NOT NULL,
  wallet_type text NOT NULL, -- Vodafone, Orange, WE, etc.
  amount numeric NOT NULL,
  package_id uuid REFERENCES offers(id),
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, paid
  admin_note text,
  proof_image_url text,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone DEFAULT timezone('utc', now())
);
-- Index for fast lookup by user and date
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_uid ON withdrawal_requests(user_uid);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at); 