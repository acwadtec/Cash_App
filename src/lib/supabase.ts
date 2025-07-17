
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection to user_info table
export const testUserInfoTable = async (): Promise<boolean> => {
  try {
    console.log('Testing connection to user_info table...');
    const { data, error } = await supabase
      .from('user_info')
      .select('user_uid, email, first_name, last_name')
      .limit(1);

    if (error) {
      console.error('Error testing user_info table:', error.message);
      return false;
    }

    console.log('✓ Successfully connected to user_info table');
    console.log('Sample data:', data);
    return true;
  } catch (error) {
    console.error('Error testing user_info table:', error);
    return false;
  }
};

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

// Test connection to Supabase by querying a simple table
export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_info')
      .select('user_uid')
      .limit(1);
    if (error) {
      console.error('Supabase connection test error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase connection test exception:', e);
    return false;
  }
};

// Helper function to check if a user is an admin
export const checkIfUserIsAdmin = async (userUid: string): Promise<boolean> => {
  if (!userUid) return false;
  
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('user_uid')
      .eq('user_uid', userUid)
      .maybeSingle();
    
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
      .maybeSingle();
    
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
        .maybeSingle();
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
        .maybeSingle();
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

/**
 * Accrues daily profit for all approved offer joins that are due (24h since last profit or approval).
 * Adds the offer's daily_profit to the user's balance and updates last_profit_at.
 * Returns a summary of processed joins for testing.
 */
export const accrueDailyOfferProfits = async () => {
  const now = new Date();
  // 1. Get all approved offer joins
  const { data: joins, error: joinsError } = await supabase
    .from('offer_joins')
    .select('id, user_id, offer_id, approved_at, last_profit_at, status')
    .eq('status', 'approved');
  if (joinsError) throw joinsError;
  const processed = [];
  for (const join of joins) {
    const last = join.last_profit_at || join.approved_at;
    if (!last) continue;
    const lastDate = new Date(last);
    if ((now.getTime() - lastDate.getTime()) < 2 * 60 * 1000) continue; // 2 minutes for testing
    // 2. Get offer's daily profit
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('daily_profit')
      .eq('id', join.offer_id)
      .single();
    if (offerError || !offer) continue;
    // 3. Add to user balance
    const { data: user, error: userError } = await supabase
      .from('user_info')
      .select('balance')
      .eq('user_uid', join.user_id)
      .single();
    if (userError || !user) continue;
    const newBalance = (user.balance || 0) + (offer.daily_profit || 0);
    await supabase
      .from('user_info')
      .update({ balance: newBalance })
      .eq('user_uid', join.user_id);
    // 4. Update last_profit_at
    await supabase
      .from('offer_joins')
      .update({ last_profit_at: now.toISOString() })
      .eq('id', join.id);
    processed.push({ join_id: join.id, user_id: join.user_id, profit: offer.daily_profit });
  }
  return processed;
}; 

/**
 * Test function to simulate and verify daily profit accrual for offer joins.
 * Logs the processed joins and their profit.
 */
export const testAccrueDailyOfferProfits = async () => {
  try {
    const processed = await accrueDailyOfferProfits();
    if (processed.length === 0) {
      console.log('No offer joins were due for profit accrual.');
    } else {
      console.log('Processed offer joins for daily profit:', processed);
    }
    return processed;
  } catch (error) {
    console.error('Error during daily profit accrual test:', error);
    throw error;
  }
}; 