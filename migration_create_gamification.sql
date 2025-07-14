-- Gamification System Tables

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    type TEXT NOT NULL DEFAULT 'achievement', -- 'achievement', 'referral', 'deposit', 'withdrawal', etc.
    requirement INTEGER DEFAULT 1, -- Number of actions required to earn this badge
    points_awarded INTEGER DEFAULT 0, -- Points awarded when badge is earned
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Levels table
CREATE TABLE IF NOT EXISTS levels (
    id SERIAL PRIMARY KEY,
    level INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    requirement INTEGER NOT NULL, -- Total points required for this level
    benefits TEXT, -- Description of benefits at this level
    created_at TIMESTAMP DEFAULT NOW()
);

-- User badges junction table
CREATE TABLE IF NOT EXISTS user_badges (
    id SERIAL PRIMARY KEY,
    user_uid UUID NOT NULL,
    badge_id INTEGER NOT NULL,
    earned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_uid, badge_id),
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);

-- Gamification settings table
CREATE TABLE IF NOT EXISTS gamification_settings (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default badges
INSERT INTO badges (name, description, type, requirement, points_awarded) VALUES
('First Deposit', 'Complete your first deposit', 'deposit', 1, 50),
('Deposit Novice', 'Complete 3 deposits', 'deposit', 3, 100),
('Deposit Master', 'Complete 10 deposits', 'deposit', 10, 200),
('First Referral', 'Refer your first friend', 'referral', 1, 100),
('Referral Champion', 'Refer 5 friends', 'referral', 5, 250),
('Referral Master', 'Refer 10 friends', 'referral', 10, 500),
('First Withdrawal', 'Complete your first withdrawal', 'withdrawal', 1, 75),
('Withdrawal Pro', 'Complete 5 withdrawals', 'withdrawal', 5, 150),
('Profile Complete', 'Complete your profile information', 'profile', 1, 25),
('Verified User', 'Get your account verified', 'verification', 1, 50),
('Early Adopter', 'Join within the first month', 'special', 1, 100),
('Loyal Customer', 'Use the platform for 30 days', 'loyalty', 30, 200);

-- Insert default levels
INSERT INTO levels (level, name, description, requirement, benefits) VALUES
(1, 'Bronze', 'New user level', 0, 'Basic access to all features'),
(2, 'Silver', 'Active user level', 100, 'Faster withdrawal processing'),
(3, 'Gold', 'Premium user level', 300, 'Priority customer support'),
(4, 'Platinum', 'Elite user level', 600, 'Exclusive offers and bonuses'),
(5, 'Diamond', 'VIP user level', 1000, 'Personal account manager');

-- Insert default gamification settings
INSERT INTO gamification_settings (key, value, description) VALUES
('points_multiplier', '{"deposit": 1, "referral": 2, "withdrawal": 1.5}', 'Points multiplier for different actions'),
('level_rewards', '{"2": {"bonus": 10}, "3": {"bonus": 20}, "4": {"bonus": 30}, "5": {"bonus": 50}}', 'Rewards for reaching new levels'),
('badge_auto_award', 'true', 'Automatically award badges when requirements are met'),
('level_auto_update', 'true', 'Automatically update user levels based on points');

-- Add gamification columns to user_info table if they don't exist
ALTER TABLE user_info ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE user_info ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE user_info ADD COLUMN IF NOT EXISTS badges_earned INTEGER DEFAULT 0;
ALTER TABLE user_info ADD COLUMN IF NOT EXISTS last_level_up TIMESTAMP;
ALTER TABLE user_info ADD COLUMN IF NOT EXISTS gamification_enabled BOOLEAN DEFAULT true; 