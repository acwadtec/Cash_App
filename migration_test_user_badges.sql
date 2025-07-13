-- Get badge ids
WITH badge_ids AS (
  SELECT id, name FROM badges WHERE name IN ('Deposit Novice', 'Referral Star')
)
INSERT INTO user_badges (user_uid, badge_id)
SELECT '2432be33-7fc8-4d0f-939c-33299326dc2a', id FROM badge_ids; 