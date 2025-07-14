-- Migration: Create badges table for gamification system
-- This table stores all available badges that users can earn

CREATE TABLE IF NOT EXISTS badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'achievement',
    requirement INTEGER NOT NULL DEFAULT 1,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_badges_type ON badges(type);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);

-- Insert some default badges
INSERT INTO badges (name, description, type, requirement, points_awarded, is_active) VALUES
('First Deposit', 'Complete your first deposit', 'deposit', 1, 50, true),
('Referral Master', 'Refer 5 users successfully', 'referral', 5, 100, true),
('Profile Complete', 'Complete your profile information', 'profile', 1, 25, true),
('Verification Complete', 'Complete identity verification', 'verification', 1, 75, true),
('Withdrawal Pro', 'Make your first withdrawal', 'withdrawal', 1, 60, true),
('Loyalty Bronze', 'Earn 500 total points', 'loyalty', 500, 25, true),
('Loyalty Silver', 'Earn 1000 total points', 'loyalty', 1000, 50, true),
('Loyalty Gold', 'Earn 2500 total points', 'loyalty', 2500, 100, true),
('Special Event', 'Participate in special events', 'special', 1, 150, true),
('Team Builder', 'Build a team of 10 members', 'referral', 10, 200, true);

-- Enable Row Level Security
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Badges are viewable by everyone" ON badges
    FOR SELECT USING (true);

CREATE POLICY "Badges are insertable by admins" ON badges
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admins.user_id = auth.uid()
        )
    );

CREATE POLICY "Badges are updatable by admins" ON badges
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admins.user_id = auth.uid()
        )
    );

CREATE POLICY "Badges are deletable by admins" ON badges
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admins.user_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_badges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_badges_updated_at
    BEFORE UPDATE ON badges
    FOR EACH ROW
    EXECUTE FUNCTION update_badges_updated_at(); 