import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test all required tables
export const testTables = async () => {
  const tables = [
    { name: 'user_info', fields: ['user_uid', 'email', 'first_name', 'last_name'] },
    { name: 'transactions', fields: ['id', 'user_id', 'type', 'amount'] },
    { name: 'chat_sessions', fields: ['id', 'user_id', 'status'] },
    { name: 'chat_messages', fields: ['id', 'conversation_id', 'text'] },
    { name: 'notifications', fields: ['id', 'title', 'message'] },
    { name: 'deposit_requests', fields: ['id', 'user_id', 'amount'] },
    { name: 'withdrawal_requests', fields: ['id', 'user_id', 'amount'] },
    { name: 'deposit_numbers', fields: ['id', 'number', 'active'] },
    { name: 'offers', fields: ['id', 'title', 'amount'] },
    { name: 'badges', fields: ['id', 'name', 'type'] },
    { name: 'levels', fields: ['id', 'level', 'requirement'] },
    { name: 'settings', fields: ['key', 'value'] }
  ];

  const results: Record<string, { exists: boolean; error?: string }> = {};

  for (const table of tables) {
    try {
      console.log(`Testing table: ${table.name}`);
      const { data, error } = await supabase
        .from(table.name)
        .select(table.fields.join(','))
        .limit(1);

      if (error) {
        results[table.name] = { exists: false, error: error.message };
        console.error(`Error accessing ${table.name}:`, error.message);
      } else {
        results[table.name] = { exists: true };
        console.log(`✓ Table ${table.name} exists and is accessible`);
      }
    } catch (error) {
      results[table.name] = { exists: false, error: error instanceof Error ? error.message : 'Unknown error' };
      console.error(`Error testing ${table.name}:`, error);
    }
  }

  return results;
};

// Helper function to check if a user is an admin
export const checkIfUserIsAdmin = async (userUid: string): Promise<boolean> => {
  if (!userUid) return false;
  
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('user_uid')
      .eq('user_uid', userUid)
      .single();
    
    if (error) throw error;
    return data !== null;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Helper function to get admin info
export const getAdminInfo = async (userUid: string) => {
  if (!userUid) return { data: null, error: new Error('No user ID provided') };
  
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('user_uid', userUid)
      .single();
    
    if (error) throw error;
    return { data, error: null };
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