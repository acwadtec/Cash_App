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
  if (userError || !user) {
    console.log('Error fetching user_info:', userError);
    return;
  }

  // 2. Get all active badges
  const { data: badges, error: badgeError } = await supabase
    .from('badges')
    .select('*')
    .eq('is_active', true);
  if (badgeError || !badges) {
    console.log('Error fetching badges:', badgeError);
    return;
  }

  for (const badge of badges) {
    let meetsRequirement = false;
    console.log(`Checking badge: ${badge.name} (${badge.type}, requirement: ${badge.requirement})`);

    if (badge.type === 'referral') {
      console.log(`User referral_count: ${user.referral_count}`);
      if (user.referral_count >= badge.requirement) {
        meetsRequirement = true;
        console.log('User meets referral badge requirement');
      }
    }

    if (badge.type === 'deposit') {
      const { count, error } = await supabase
        .from('deposit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_uid', userUid)
        .eq('status', 'approved');
      console.log(`User approved deposits: ${count}`);
      if (!error && typeof count === 'number' && count >= badge.requirement) {
        meetsRequirement = true;
        console.log('User meets deposit badge requirement');
      }
    }

    if (badge.type === 'withdrawal') {
      const { count, error } = await supabase
        .from('withdrawal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_uid', userUid)
        .eq('status', 'approved');
      console.log(`User approved withdrawals: ${count}`);
      if (!error && typeof count === 'number' && count >= badge.requirement) {
        meetsRequirement = true;
        console.log('User meets withdrawal badge requirement');
      }
    }

    if (badge.type === 'loyalty') {
      console.log(`User total_points: ${user.total_points}`);
      if (user.total_points >= badge.requirement) {
        meetsRequirement = true;
        console.log('User meets loyalty badge requirement');
      }
    }

    if (badge.type === 'profile') {
      console.log(`User verified: ${user.verified}`);
      if (user.verified) {
        meetsRequirement = true;
        console.log('User meets profile badge requirement');
      }
    }

    if (badge.type === 'verification') {
      console.log(`User verified: ${user.verified}`);
      if (user.verified) {
        meetsRequirement = true;
        console.log('User meets verification badge requirement');
      }
    }

    if (badge.type === 'special') {
      // Add custom logic for special badges if needed
      console.log('Special badge - skipping (add custom logic if needed)');
      continue;
    }

    if (meetsRequirement) {
      // Check if the user already has this badge
      const { data: existingBadge, error: existingBadgeError } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', userUid)
        .eq('badge_id', badge.id)
        .single();
      const isNew = !existingBadge && !existingBadgeError;
      const { error: upsertError } = await supabase
        .from('user_badges')
        .upsert({
          user_id: userUid,
          badge_id: badge.id,
          points_earned: badge.points_awarded || 0,
          earned_at: new Date().toISOString(),
        }, { onConflict: 'user_id,badge_id' });
      if (upsertError) {
        console.error('Error upserting user_badges:', upsertError);
      } else {
        if (isNew) {
          // Increment user's total_points
          const { error: updatePointsError } = await supabase
            .from('user_info')
            .update({ total_points: (user.total_points || 0) + (badge.points_awarded || 0) })
            .eq('user_uid', userUid);
          if (updatePointsError) {
            console.error('Error updating user total_points:', updatePointsError);
          } else {
            console.log(`User total_points updated by ${badge.points_awarded || 0}`);
          }
        }
        console.log(`Badge awarded: ${badge.name}`);
      }
    } else {
      console.log(`User does not meet requirement for badge: ${badge.name}`);
    }
  }
}; 

// Test function to check user_badges table structure and permissions
export const testUserBadgesTable = async () => {
  console.log('Testing user_badges table...');
  
  try {
    // Test 1: Check if table exists and we can query it
    const { data: existingBadges, error: queryError } = await supabase
      .from('user_badges')
      .select('*')
      .limit(1);
    
    if (queryError) {
      console.error('Error querying user_badges table:', queryError);
      return false;
    }
    
    console.log('user_badges table is accessible');
    
    // Test 2: Try to insert a test badge (we'll delete it immediately)
    const testBadge = {
      user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      badge_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      earned_at: new Date().toISOString()
    };
    
    const { error: insertError } = await supabase
      .from('user_badges')
      .insert(testBadge);
    
    if (insertError) {
      console.error('Error inserting into user_badges table:', insertError);
      return false;
    }
    
    console.log('user_badges table allows inserts');
    
    // Clean up test data
    await supabase
      .from('user_badges')
      .delete()
      .eq('user_id', '00000000-0000-0000-0000-000000000000')
      .eq('badge_id', '00000000-0000-0000-0000-000000000000');
    
    console.log('user_badges table test passed');
    return true;
    
  } catch (error) {
    console.error('Error testing user_badges table:', error);
    return false;
  }
}; 