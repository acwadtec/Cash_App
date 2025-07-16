import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to check if a user is an admin
export const checkIfUserIsAdmin = async (userUid: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('user_uid')
      .eq('user_uid', userUid)
      .single();
    
    return !error && data !== null;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Helper function to get admin info
export const getAdminInfo = async (userUid: string) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('user_uid', userUid)
      .single();
    
    return { data, error };
  } catch (error) {
    console.error('Error getting admin info:', error);
    return { data: null, error };
  }
}; 

// Helper to check and award referral badges
export const checkAndAwardReferralBadges = async (userUid: string) => {
  // 1. Get user's referral_count
  const { data: userInfo, error: userError } = await supabase
    .from('user_info')
    .select('referral_count')
    .eq('user_uid', userUid)
    .single();
  if (userError || !userInfo) return;
  const referralCount = userInfo.referral_count || 0;

  // 2. Get all active referral badges
  const { data: badges, error: badgeError } = await supabase
    .from('badges')
    .select('id, requirement')
    .eq('type', 'referral')
    .eq('active', true);
  if (badgeError || !badges) return;

  for (const badge of badges) {
    if (referralCount >= badge.requirement) {
      // 3. Check if user already has this badge
      const { data: existing, error: existingError } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', userUid)
        .eq('badge_id', badge.id)
        .single();
      if (!existing || existingError) {
        // 4. Award badge
        await supabase.from('user_badges').insert({
          user_id: userUid,
          badge_id: badge.id,
          awarded_at: new Date().toISOString(),
        });
      }
    }
  }
}; 

// Helper to check and award all badge types
export const checkAndAwardAllBadges = async (userUid) => {
  // 1. Get user info
  const { data: user, error: userError } = await supabase
    .from('user_info')
    .select('*')
    .eq('user_uid', userUid)
    .single();
  if (userError || !user) return;

  // 2. Get all active badges
  const { data: badges } = await supabase.from('badges').select('*').eq('is_active', true);
  if (!badges) return;

  for (const badge of badges) {
    let meetsRequirement = false;

    if (badge.type === 'referral' && user.referral_count >= badge.requirement) meetsRequirement = true;

    if (badge.type === 'deposit') {
      const { count } = await supabase
        .from('deposit_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_uid', userUid)
        .eq('status', 'approved');
      if (count >= badge.requirement) meetsRequirement = true;
    }

    if (badge.type === 'withdrawal') {
      const { count } = await supabase
        .from('withdrawal_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_uid', userUid)
        .eq('status', 'approved');
      if (count >= badge.requirement) meetsRequirement = true;
    }

    if (badge.type === 'profile' && user.verified) meetsRequirement = true;

    // Add more types as needed

    if (meetsRequirement) {
      // Check if user already has badge
      const { data: existing } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_uid', userUid)
        .eq('badge_id', badge.id)
        .single();
      if (!existing) {
        await supabase.from('user_badges').insert({
          user_uid: userUid,
          badge_id: badge.id,
          earned_at: new Date().toISOString(),
        });
      }
    }
  }
}; 