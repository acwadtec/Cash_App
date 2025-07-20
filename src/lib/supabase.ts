
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Enhanced Supabase client with better connection handling
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
 * Updates expired offer joins to 'inactive' status (30 days from approved_at)
 * This should be called before processing daily profits
 */
export const updateExpiredOfferJoins = async () => {
  const now = new Date();
  
  // Helper to check if offer is expired (30 days from approved_at)
  function isOfferExpired(approvedAt: string): boolean {
    if (!approvedAt) return false;
    const approvedDate = new Date(approvedAt);
    const endDate = new Date(approvedDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    return now.getTime() >= endDate.getTime();
  }
  
  // Get all approved offer joins
  const { data: allApprovedJoins, error: allJoinsError } = await supabase
    .from('offer_joins')
    .select('id, user_id, offer_id, approved_at, status')
    .eq('status', 'approved');
  
  if (allJoinsError) {
    console.error('Error fetching approved joins for expiration check:', allJoinsError);
    return;
  }
  
  const updatedJoins = [];
  
  if (allApprovedJoins) {
    for (const join of allApprovedJoins) {
      if (isOfferExpired(join.approved_at)) {
        console.log(`Marking expired offer join ${join.id} as inactive - 30-day period completed`);
        
        const { error: updateError } = await supabase
          .from('offer_joins')
          .update({ status: 'inactive' })
          .eq('id', join.id);
        
        if (updateError) {
          console.error(`Error updating offer join ${join.id} to inactive:`, updateError);
        } else {
          updatedJoins.push(join.id);
        }
      }
    }
  }
  
  console.log(`Updated ${updatedJoins.length} expired offer joins to inactive status`);
  return updatedJoins;
};

/**
 * Standalone function to check and update expired offers
 * Can be called independently or from a cron job
 */
export const checkAndUpdateExpiredOffers = async () => {
  console.log('=== CHECKING FOR EXPIRED OFFERS ===');
  const result = await updateExpiredOfferJoins();
  console.log('=== EXPIRED OFFERS CHECK COMPLETE ===');
  return result;
};

/**
 * Test function to manually trigger expiration check
 * Useful for testing the expiration logic
 */
export const testExpirationCheck = async () => {
  console.log('=== TESTING EXPIRATION CHECK ===');
  const now = new Date();
  
  // Get all approved offers with their approved_at dates
  const { data: approvedOffers, error } = await supabase
    .from('offer_joins')
    .select('id, user_id, offer_id, approved_at, status')
    .eq('status', 'approved');
  
  if (error) {
    console.error('Error fetching approved offers:', error);
    return;
  }
  
  console.log(`Found ${approvedOffers?.length || 0} approved offers`);
  
  if (approvedOffers) {
    for (const offer of approvedOffers) {
      const approvedDate = new Date(offer.approved_at);
      const endDate = new Date(approvedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const isExpired = now.getTime() >= endDate.getTime();
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`Offer ${offer.id}:`, {
        approvedAt: offer.approved_at,
        endDate: endDate.toISOString(),
        isExpired,
        daysLeft: isExpired ? 'EXPIRED' : daysLeft,
        status: offer.status
      });
    }
  }
  
  // Now run the actual update
  const updated = await updateExpiredOfferJoins();
  console.log('=== EXPIRATION TEST COMPLETE ===');
  return { testResults: approvedOffers, updatedOffers: updated };
};

/**
 * Accrues daily profit for all approved offer joins that are due (24h since last profit or approval).
 * First checks for expired offers and updates their status to 'inactive'.
 * Then adds the offer's daily_profit to the user's balance and updates last_profit_at.
 * Returns a summary of processed joins for testing.
 */
export const accrueDailyOfferProfits = async () => {
  const now = new Date();
  // Helper to convert a date to Egypt time
  function toEgyptTime(date: Date) {
    // Returns a Date object in Egypt time (Africa/Cairo)
    const egypt = new Date(date.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
    return egypt;
  }
  
  // Step 1: Update expired offers to 'inactive' status
  await updateExpiredOfferJoins();
  
  // Step 2: Get all approved offer joins (after updating expired ones)
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
    // Convert both to Egypt time
    const nowEgypt = toEgyptTime(now);
    const lastEgypt = toEgyptTime(new Date(last));
    if ((nowEgypt.getTime() - lastEgypt.getTime()) < 24 * 60 * 60 * 1000) continue; // Not due yet (24 hours in Egypt time)
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
    // 3.5. Log the daily profit transaction
    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: join.user_id,
        type: 'daily_profit',
        amount: offer.daily_profit,
        status: 'completed',
        description: `Daily profit from offer ${join.offer_id}`,
        created_at: now.toISOString(),
      })
      .select('id')
      .single();
    if (!txnError && txn && txn.id) {
      const { error: dailyProfitError } = await supabase
        .from('daily_profits')
        .insert({
          user_id: join.user_id,
          offer_id: join.offer_id,
          offer_join_id: join.id,
          amount: offer.daily_profit,
          profit_date: now.toISOString(),
          transaction_id: txn.id,
          created_at: now.toISOString(),
        });
      if (dailyProfitError) {
        console.error('Failed to insert into daily_profits:', dailyProfitError);
      }
    }
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
 * Also checks and updates expired offers to inactive status.
 * Intended to be called from a backend job or scheduled function.
 * Returns a summary of both daily and monthly processed joins.
 */
export const accrueAllOfferProfits = async () => {
  // First, check and update expired offers
  console.log('=== STARTING COMPLETE OFFER PROFIT ACCRUAL ===');
  console.log('Step 1: Checking for expired offers...');
  const expiredUpdates = await updateExpiredOfferJoins();
  console.log(`Updated ${expiredUpdates?.length || 0} expired offers to inactive`);
  
  // Then process daily profits
  console.log('Step 2: Processing daily profits...');
  const daily = await accrueDailyOfferProfits();
  
  // Then process monthly profits
  console.log('Step 3: Processing monthly profits...');
  const monthly = await accrueMonthlyOfferProfits();
  
  console.log('=== COMPLETE OFFER PROFIT ACCRUAL FINISHED ===');
  return { 
    expiredUpdates, 
    daily, 
    monthly 
  };
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

// Connection health check and auto-reconnection
let connectionRetries = 0;
const maxRetries = 3;

export const checkConnectionHealth = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_info')
      .select('user_uid')
      .limit(1);
    
    if (error) {
      console.warn('Connection health check failed:', error.message);
      return false;
    }
    
    connectionRetries = 0; // Reset retry counter on success
    return true;
  } catch (error) {
    console.error('Connection health check error:', error);
    return false;
  }
};

// Enhanced query function with connection retry logic
export const robustQuery = async <T = any>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn();
      
      if (!result.error) {
        return result;
      }
      
      // If it's a connection error, try to reconnect
      if (result.error?.message?.includes('connection') || 
          result.error?.message?.includes('timeout') ||
          result.error?.code === 'PGRST301') {
        
        console.warn(`Connection attempt ${attempt} failed, retrying...`);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Query attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        return { data: null, error };
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return { data: null, error: new Error('Max retries exceeded') };
}; 

/**
 * Updated SQL function for accrue_daily_profits with expiration check
 * This function should be used in your Supabase SQL editor
 */
export const getUpdatedAccrueDailyProfitsSQL = () => {
  return `
CREATE OR REPLACE FUNCTION public.accrue_daily_profits()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  join_rec RECORD;
  offer_rec RECORD;
  user_balance numeric;
  transaction_id uuid;
BEGIN
  -- First, update expired offers to 'inactive' status
  UPDATE offer_joins
  SET status = 'inactive'
  WHERE status = 'approved'
    AND approved_at IS NOT NULL
    AND approved_at <= NOW() - INTERVAL '30 days';
  
  -- Then process daily profits for approved offers (excluding newly expired ones)
  FOR join_rec IN
    SELECT oj.id AS offer_join_id, oj.user_id, oj.offer_id, oj.last_profit_at, oj.approved_at, o.daily_profit
    FROM offer_joins oj
    JOIN offers o ON oj.offer_id = o.id
    WHERE oj.status = 'approved'
      AND o.daily_profit > 0
      AND (
        (oj.last_profit_at IS NOT NULL AND oj.last_profit_at <= NOW() - INTERVAL '24 hours')
        OR (oj.last_profit_at IS NULL AND oj.approved_at <= NOW() - INTERVAL '24 hours')
      )
      -- Additional check: ensure offer is not expired (less than 30 days from approved_at)
      AND oj.approved_at > NOW() - INTERVAL '30 days'
  LOOP
    -- 1. Credit user balance
    UPDATE user_info
    SET balance = COALESCE(balance, 0) + join_rec.daily_profit
    WHERE user_uid = join_rec.user_id;

    -- 2. Insert transaction and get its id
    INSERT INTO transactions (user_id, type, amount, status, description, created_at)
    VALUES (
      join_rec.user_id,
      'daily_profit',
      join_rec.daily_profit,
      'completed',
      'Daily profit from offer ' || join_rec.offer_id,
      NOW()
    )
    RETURNING id INTO transaction_id;

    -- 3. Insert into daily_profits
    INSERT INTO daily_profits (
      user_id,
      offer_id,
      offer_join_id,
      amount,
      profit_date,
      transaction_id,
      created_at
    ) VALUES (
      join_rec.user_id,
      join_rec.offer_id,
      join_rec.offer_join_id,
      join_rec.daily_profit,
      NOW(),
      transaction_id,
      NOW()
    );

    -- 4. Update last_profit_at
    UPDATE offer_joins
    SET last_profit_at = NOW()
    WHERE id = join_rec.offer_join_id;
  END LOOP;
END;
$$;
  `;
}; 