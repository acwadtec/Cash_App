
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Enhanced Supabase client with performance optimizations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'cash-app-web',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Simple in-memory cache for frequently accessed data
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

const getCacheKey = (table: string, query: any): string => {
  return `${table}:${JSON.stringify(query)}`;
};

const isExpired = (timestamp: number, ttl: number): boolean => {
  return Date.now() - timestamp > ttl;
};

// Optimized query function with caching
export const optimizedQuery = async <T = any>(
  table: string,
  query: any = {},
  options: { ttl?: number; select?: string } = {}
): Promise<{ data: T | null; error: any }> => {
  const { ttl = 5 * 60 * 1000, select = '*' } = options; // 5 minutes default TTL
  const cacheKey = getCacheKey(table, query);

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && !isExpired(cached.timestamp, cached.ttl)) {
    return { data: cached.data as T, error: null };
  }

  try {
    let supabaseQuery = supabase.from(table).select(select);

    // Apply query filters
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          supabaseQuery = supabaseQuery.in(key, value);
        } else {
          supabaseQuery = supabaseQuery.eq(key, value);
        }
      }
    });

    const { data, error } = await supabaseQuery;

    if (!error && data) {
      // Cache the result
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl,
      });
    }

    return { data: data as T, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Clear cache for specific table or all
export const clearCache = (table?: string) => {
  if (table) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${table}:`)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

// Optimized batch queries
export const batchQuery = async <T = any>(
  queries: Array<{ table: string; query: any; select?: string }>
): Promise<Array<{ data: T | null; error: any }>> => {
  const results = await Promise.all(
    queries.map(({ table, query, select }) =>
      optimizedQuery<T>(table, query, { select })
    )
  );
  return results;
};

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
  // Preload all user_info for referral lookups
  const { data: allUsers, error: allUsersError } = await supabase
    .from('user_info')
    .select('user_uid, referral_code, referred_by, team_earnings');
  if (allUsersError) throw allUsersError;
  const userMap = new Map(allUsers.map(u => [u.user_uid, u]));
  const codeMap = new Map(allUsers.map(u => [u.referral_code, u]));
  for (const join of joins) {
    const last = join.last_profit_at || join.approved_at;
    if (!last) continue;
    const lastDate = new Date(last);
    if ((now.getTime() - lastDate.getTime()) < 3 * 60 * 1000) continue; // Not due yet (3 minutes for testing)
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
    // 4. Referral team earnings logic
    let referralEarnings = [];
    let profit = Number(offer.daily_profit || 0);
    let currentUser = userMap.get(join.user_id);
    let level = 1;
    let percentages = [0.03, 0.02, 0.01];
    while (currentUser && currentUser.referred_by && level <= 3) {
      const referrer = codeMap.get(currentUser.referred_by);
      if (!referrer) break;
      const percent = percentages[level - 1];
      const earning = profit * percent;
      const newTeamEarnings = Number(referrer.team_earnings || 0) + earning;
      await supabase
        .from('user_info')
        .update({ team_earnings: newTeamEarnings })
        .eq('user_uid', referrer.user_uid);
      // Log transaction for team earnings
      await supabase
        .from('transactions')
        .insert({
          user_id: referrer.user_uid,
          source_user_id: join.user_id, // Add the source user
          type: 'team_earnings',
          amount: earning,
          status: 'completed',
          description: `Team earnings from referral level ${level}`,
          created_at: now.toISOString(),
        });
      referralEarnings.push({ level, referrer_id: referrer.user_uid, earning });
      currentUser = referrer;
      level++;
    }
    // 5. Update last_profit_at
    await supabase
      .from('offer_joins')
      .update({ last_profit_at: now.toISOString() })
      .eq('id', join.id);
    processed.push({ join_id: join.id, user_id: join.user_id, profit: offer.daily_profit, referralEarnings });
  }
  return processed;
};

/**
 * Accrues both daily and monthly profits for all approved offer joins that are due.
 * Intended to be called from a backend job or scheduled function.
 * Returns a summary of both daily and monthly processed joins.
 */
export const accrueAllOfferProfits = async () => {
  const daily = await accrueDailyOfferProfits();
  const monthly = await accrueMonthlyOfferProfits();
  return { daily, monthly };
};

/**
 * Accrues monthly profit for all approved offer joins that are due (30 days since last monthly profit or approval).
 * Adds the offer's monthly_profit to the user's balance and updates last_monthly_profit_at.
 * Returns a summary of processed joins for testing.
 */
export const accrueMonthlyOfferProfits = async () => {
  const now = new Date();
  // 1. Get all approved offer joins
  const { data: joins, error: joinsError } = await supabase
    .from('offer_joins')
    .select('id, user_id, offer_id, approved_at, last_monthly_profit_at, status')
    .eq('status', 'approved');
  if (joinsError) throw joinsError;
  const processed = [];
  // Preload all user_info for referral lookups
  const { data: allUsers, error: allUsersError } = await supabase
    .from('user_info')
    .select('user_uid, referral_code, referred_by, team_earnings');
  if (allUsersError) throw allUsersError;
  const userMap = new Map(allUsers.map(u => [u.user_uid, u]));
  const codeMap = new Map(allUsers.map(u => [u.referral_code, u]));
  for (const join of joins) {
    const last = join.last_monthly_profit_at || join.approved_at;
    if (!last) continue;
    const lastDate = new Date(last);
    // Check if 30 days (2592000000 ms) have passed
    if ((now.getTime() - lastDate.getTime()) < 30 * 24 * 60 * 60 * 1000) continue;
    // 2. Get offer's monthly profit
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('monthly_profit')
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
    const newBalance = (user.balance || 0) + (offer.monthly_profit || 0);
    await supabase
      .from('user_info')
      .update({ balance: newBalance })
      .eq('user_uid', join.user_id);
    // 4. Referral team earnings logic (same as daily, but for monthly profit)
    let referralEarnings = [];
    let profit = Number(offer.monthly_profit || 0);
    let currentUser = userMap.get(join.user_id);
    let level = 1;
    let percentages = [0.03, 0.02, 0.01];
    while (currentUser && currentUser.referred_by && level <= 3) {
      const referrer = codeMap.get(currentUser.referred_by);
      if (!referrer) break;
      const percent = percentages[level - 1];
      const earning = profit * percent;
      const newTeamEarnings = Number(referrer.team_earnings || 0) + earning;
      await supabase
        .from('user_info')
        .update({ team_earnings: newTeamEarnings })
        .eq('user_uid', referrer.user_uid);
      // Log transaction for team earnings
      await supabase
        .from('transactions')
        .insert({
          user_id: referrer.user_uid,
          source_user_id: join.user_id, // Add the source user
          type: 'team_earnings',
          amount: earning,
          status: 'completed',
          description: `Team earnings from referral level ${level} (monthly)` ,
          created_at: now.toISOString(),
        });
      referralEarnings.push({ level, referrer_id: referrer.user_uid, earning });
      currentUser = referrer;
      level++;
    }
    // 5. Update last_monthly_profit_at
    await supabase
      .from('offer_joins')
      .update({ last_monthly_profit_at: now.toISOString() })
      .eq('id', join.id);
    processed.push({ join_id: join.id, user_id: join.user_id, profit: offer.monthly_profit, referralEarnings });
  }
  return processed;
}; 