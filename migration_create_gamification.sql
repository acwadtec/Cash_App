-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon_url text
);

-- User Badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id serial PRIMARY KEY,
  user_uid uuid REFERENCES user_info(user_uid),
  badge_id integer REFERENCES badges(id),
  earned_at timestamp with time zone DEFAULT now()
);

-- Add level to user_info
ALTER TABLE user_info ADD COLUMN IF NOT EXISTS level integer DEFAULT 1; 