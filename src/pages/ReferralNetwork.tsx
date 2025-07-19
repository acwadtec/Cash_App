import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';

interface TeamTransaction {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  source_user_id: string;
  source_user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function ReferralNetwork() {
  const { t, isRTL } = useLanguage();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [level1Referrals, setLevel1Referrals] = useState<any[]>([]);
  const [level2Referrals, setLevel2Referrals] = useState<any[]>([]);
  const [level3Referrals, setLevel3Referrals] = useState<any[]>([]);
  const [teamEarnings, setTeamEarnings] = useState<{[level: string]: number}>({});
  const [earningsByUser, setEarningsByUser] = useState<any[]>([]);
  const [teamTransactions, setTeamTransactions] = useState<TeamTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const testUserData = async () => {
    console.log('=== MANUAL USER DATA TEST ===');
    
    // Test 1: Get all users in user_info
    const { data: allUsers, error: allUsersError } = await supabase
      .from('user_info')
      .select('user_uid, first_name, last_name, email')
      .limit(5);
    
    console.log('All users in user_info:', allUsers);
    console.log('All users error:', allUsersError);
    
    // Test 2: Get current user's transactions
    if (userUid) {
      const { data: userTransactions, error: userTransactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userUid)
        .eq('type', 'team_earnings')
        .limit(3);
      
      console.log('User transactions:', userTransactions);
      console.log('User transactions error:', userTransactionsError);
      
      // Test 3: Try to fetch specific users
      if (userTransactions && userTransactions.length > 0) {
        for (const txn of userTransactions) {
          if (txn.source_user_id) {
            const { data: specificUser, error: specificUserError } = await supabase
              .from('user_info')
              .select('user_uid, first_name, last_name, email')
              .eq('user_uid', txn.source_user_id)
              .single();
            
            console.log(`User ${txn.source_user_id}:`, specificUser, specificUserError);
          }
        }
      }
    }
    
    console.log('=== END MANUAL TEST ===');
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) return;
      setUserUid(userData.user.id);
      const { data, error } = await supabase
        .from('user_info')
        .select('*')
        .eq('user_uid', userData.user.id)
        .single();
      if (data) setUserInfo(data);
      
      // Test user data
      await testUserData();
      
      // Fetch all team earnings transactions
      await fetchTeamTransactions(userData.user.id);
      
      // Fetch team earnings breakdown
      const { data: txns, error: txnError } = await supabase
        .from('transactions')
        .select('amount, description, source_user_id')
        .eq('user_id', userData.user.id)
        .eq('type', 'team_earnings');
      if (txns) {
        const earnings: {[level: string]: number} = { '1': 0, '2': 0, '3': 0 };
        const earningsByUserMap: {[userId: string]: number} = {};
        for (const txn of txns) {
          const match = txn.description && txn.description.match(/level (\d)/);
          const level = match ? match[1] : '1';
          earnings[level] = (earnings[level] || 0) + Number(txn.amount || 0);
          if (txn.source_user_id) {
            earningsByUserMap[txn.source_user_id] = (earningsByUserMap[txn.source_user_id] || 0) + Number(txn.amount || 0);
          }
        }
        setTeamEarnings(earnings);
        // Fetch user info for all source_user_ids
        const userIds = Object.keys(earningsByUserMap);
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('user_info')
            .select('user_uid, first_name, last_name, email')
            .in('user_uid', userIds);
          const userMap: {[userId: string]: any} = {};
          (users || []).forEach(u => { userMap[u.user_uid] = u; });
          setEarningsByUser(
            userIds.map(uid => ({
              user: userMap[uid],
              amount: earningsByUserMap[uid]
            }))
          );
        } else {
          setEarningsByUser([]);
        }
      }
    };
    fetchUser();
  }, []);

  const fetchTeamTransactions = async (userId: string) => {
    setLoadingTransactions(true);
    try {
      // First, let's test what users exist in user_info table
      console.log('=== TESTING USER_INFO TABLE ===');
      const { data: allUsersTest, error: allUsersTestError } = await supabase
        .from('user_info')
        .select('user_uid, first_name, last_name, email')
        .limit(10);
      
      console.log('All users in user_info (first 10):', allUsersTest);
      console.log('All users test error:', allUsersTestError);
      console.log('=== END TESTING ===');

      // Fetch all team earnings transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, amount, description, created_at, source_user_id, user_id')
        .eq('user_id', userId)
        .eq('type', 'team_earnings')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching team transactions:', error);
        setTeamTransactions([]);
        return;
      }

      console.log('Raw transactions:', transactions);

      if (transactions && transactions.length > 0) {
        // Get unique user IDs from both source_user_id and user_id
        const allUserIds = new Set<string>();
        transactions.forEach(t => {
          if (t.source_user_id) allUserIds.add(t.source_user_id);
          if (t.user_id) allUserIds.add(t.user_id);
        });
        const userIds = Array.from(allUserIds);
        console.log('All user IDs to fetch:', userIds);
        
        // Fetch source user details from user_info table
        let userMap: {[userId: string]: any} = {};
        if (userIds.length > 0) {
          // Query user_info table for all users
          const { data: userInfoData, error: userInfoError } = await supabase
            .from('user_info')
            .select('user_uid, first_name, last_name, email')
            .in('user_uid', userIds);
          
          console.log('User info data:', userInfoData);
          console.log('User info error:', userInfoError);
          
          if (userInfoData) {
            userInfoData.forEach(user => {
              userMap[user.user_uid] = {
                first_name: user.first_name || 'Unknown',
                last_name: user.last_name || 'User',
                email: user.email || 'No email'
              };
            });
          }
          
          // Check which user IDs are missing from user_info
          const missingUserIds = userIds.filter(id => !userMap[id]);
          console.log('Missing user IDs (not found in user_info):', missingUserIds);
          
          if (missingUserIds.length > 0) {
            console.log('These user IDs are not found in user_info table:');
            console.log('Missing IDs:', missingUserIds);
            
            // Try to fetch these missing users individually to see what's wrong
            for (const missingId of missingUserIds) {
              const { data: singleUser, error: singleError } = await supabase
                .from('user_info')
                .select('user_uid, first_name, last_name, email')
                .eq('user_uid', missingId)
                .single();
              
              console.log(`Single user query for ${missingId}:`, singleUser, singleError);
            }
          }
        }

        console.log('Final user map:', userMap);

        // Combine transaction data with user info
        const enrichedTransactions: TeamTransaction[] = transactions.map(txn => {
          // Try to get user info from source_user_id first, then user_id
          const sourceUserId = txn.source_user_id || txn.user_id;
          const sourceUser = userMap[sourceUserId];
          console.log(`Transaction ${txn.id}: source_user_id=${txn.source_user_id}, user_id=${txn.user_id}, final_id=${sourceUserId}, found user:`, sourceUser);
          
          return {
            id: txn.id,
            amount: txn.amount,
            description: txn.description,
            created_at: txn.created_at,
            source_user_id: sourceUserId,
            source_user: sourceUser
          };
        });

        console.log('Enriched transactions:', enrichedTransactions);
        setTeamTransactions(enrichedTransactions);
      } else {
        setTeamTransactions([]);
      }
    } catch (error) {
      console.error('Error in fetchTeamTransactions:', error);
      setTeamTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (userInfo?.referral_code) {
      fetchReferralLevels(userInfo.referral_code);
    }
  }, [userInfo?.referral_code]);

  // Recursive function to get all descendants at a given depth or more
  async function getDescendantsAtLevel(referralCodes: string[], currentLevel: number, targetLevel: number, collected: any[] = []) {
    if (referralCodes.length === 0) return collected;
    const { data: users } = await supabase
      .from('user_info')
      .select('user_uid, first_name, last_name, email, referral_code, referred_by')
      .in('referred_by', referralCodes);
    if (!users || users.length === 0) return collected;
    if (currentLevel === targetLevel) {
      collected.push(...users);
    } else if (currentLevel < targetLevel) {
      // Go deeper
      const nextCodes = users.map(u => u.referral_code);
      await getDescendantsAtLevel(nextCodes, currentLevel + 1, targetLevel, collected);
    }
    return collected;
  }

  // Recursive function to get all descendants at depth >= minLevel
  async function getDescendantsAtOrAboveLevel(referralCodes: string[], currentLevel: number, minLevel: number, collected: any[] = []) {
    if (referralCodes.length === 0) return collected;
    const { data: users } = await supabase
      .from('user_info')
      .select('user_uid, first_name, last_name, email, referral_code, referred_by')
      .in('referred_by', referralCodes);
    if (!users || users.length === 0) return collected;
    if (currentLevel >= minLevel) {
      collected.push(...users);
    }
    // Always go deeper
    const nextCodes = users.map(u => u.referral_code);
    await getDescendantsAtOrAboveLevel(nextCodes, currentLevel + 1, minLevel, collected);
    return collected;
  }

  const fetchReferralLevels = async (myReferralCode: string) => {
    // Level 1: Direct referrals
    const { data: level1 } = await supabase
      .from('user_info')
      .select('user_uid, first_name, last_name, email, referral_code')
      .eq('referred_by', myReferralCode);
    setLevel1Referrals(level1 || []);

    // Level 2: Indirect referrals
    const level1Codes = (level1 || []).map(u => u.referral_code);
    let level2: any[] = [];
    if (level1Codes.length > 0) {
      const { data: l2 } = await supabase
        .from('user_info')
        .select('user_uid, first_name, last_name, email, referral_code')
        .in('referred_by', level1Codes);
      level2 = l2 || [];
      setLevel2Referrals(level2);
    } else {
      setLevel2Referrals([]);
    }

    // Level 3: All users at depth >= 3
    let level3: any[] = [];
    if (level1Codes.length > 0) {
      // Get all descendants at depth >= 3
      level3 = await getDescendantsAtOrAboveLevel(level1Codes, 2, 3, []);
    }
    setLevel3Referrals(level3);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getLevelFromDescription = (description: string) => {
    const match = description.match(/level (\d)/);
    return match ? match[1] : '1';
  };

  return (
    <div className={`min-h-screen py-20 ${isRTL ? 'rtl' : 'ltr'} bg-background text-foreground`}>
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-foreground">{t('referral.networkTitle') || 'Referral Network'}</h1>
          {userInfo?.referral_code && (
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
            <Card className="shadow-glow bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">{t('referral.networkTitle') || 'Referral Network'}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Team Earnings Breakdown */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                  <div className="text-center p-4 bg-success/10 rounded-lg">
                    <div className="text-lg font-bold text-success">{teamEarnings['1']?.toFixed(2) || '0.00'} EGP</div>
                    <div className="text-sm text-muted-foreground">{t('referral.level1') || 'Level 1 Earnings'}</div>
=======
>>>>>>> Stashed changes
            <>
              <Card className="shadow-glow bg-card mb-6">
                <CardHeader>
                  <CardTitle className="text-foreground">{t('referral.networkTitle') || 'Referral Network'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Team Earnings Breakdown */}
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-success/10 rounded-lg">
                      <div className="text-lg font-bold text-success">{teamEarnings['1']?.toFixed(2) || '0.00'} EGP</div>
                      <div className="text-sm text-muted-foreground">{t('referral.level1') || 'Level 1 Earnings'}</div>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <div className="text-lg font-bold text-primary">{teamEarnings['2']?.toFixed(2) || '0.00'} EGP</div>
                      <div className="text-sm text-muted-foreground">{t('referral.level2') || 'Level 2 Earnings'}</div>
                    </div>
                    <div className="text-center p-4 bg-warning/10 rounded-lg">
                      <div className="text-lg font-bold text-warning">{teamEarnings['3']?.toFixed(2) || '0.00'} EGP</div>
                      <div className="text-sm text-muted-foreground">{t('referral.level3') || 'Level 3 Earnings'}</div>
                    </div>
<<<<<<< Updated upstream
=======
>>>>>>> d73a7b8628c022c86ff9089e6b5dc2058005a2dd
>>>>>>> Stashed changes
                  </div>
                  {/* Team Earnings By User Breakdown */}
                  {earningsByUser.length > 0 && (
                    <div className="mt-6">
                      <h2 className="font-semibold mb-2">Team Earnings Breakdown by User</h2>
                      <ul>
                        {earningsByUser.map(({ user, amount }) => (
                          <li key={user?.user_uid || 'unknown'}>
                            {user ? `${user.first_name} ${user.last_name} (${user.email})` : 'Unknown User'}: {amount.toFixed(2)} EGP
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="text-center p-4 bg-success/10 rounded-lg">
                      <div className="text-2xl font-bold text-success">{level1Referrals.length}</div>
                      <div className="text-sm text-muted-foreground">{t('referral.level1') || 'Level 1 (Direct)'}</div>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{level2Referrals.length}</div>
                      <div className="text-sm text-muted-foreground">{t('referral.level2') || 'Level 2 (Indirect)'}</div>
                    </div>
                    <div className="text-center p-4 bg-warning/10 rounded-lg">
                      <div className="text-2xl font-bold text-warning">{level3Referrals.length}</div>
                      <div className="text-sm text-muted-foreground">{t('referral.level3') || 'Level 3'}</div>
                    </div>
                  </div>
                  {level1Referrals.length > 0 && (
                    <div className="mt-4">
                      <div className="font-semibold mb-2 text-foreground">{t('referral.level1List') || 'Level 1 Referrals:'}</div>
                      <ul className="list-disc ml-6">
                        {level1Referrals.map(u => (
                          <li key={u.user_uid} className="text-muted-foreground">{u.first_name} {u.last_name} ({u.email})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {level2Referrals.length > 0 && (
                    <div className="mt-4">
                      <div className="font-semibold mb-2 text-foreground">{t('referral.level2List') || 'Level 2 Referrals:'}</div>
                      <ul className="list-disc ml-6">
                        {level2Referrals.map(u => (
                          <li key={u.user_uid} className="text-muted-foreground">{u.first_name} {u.last_name} ({u.email})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {level3Referrals.length > 0 && (
                    <div className="mt-4">
                      <div className="font-semibold mb-2 text-foreground">{t('referral.level3List') || 'Level 3 Referrals:'}</div>
                      <ul className="list-disc ml-6">
                        {level3Referrals.map(u => (
                          <li key={u.user_uid} className="text-muted-foreground">{u.first_name} {u.last_name} ({u.email})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Team Transactions Section */}
              <Card className="shadow-glow bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">Team Transactions to Your Wallet</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingTransactions ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Loading transactions...</p>
                    </div>
                  ) : teamTransactions.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground mb-4">
                        Showing {teamTransactions.length} team transactions that contributed to your wallet
                      </div>
                      {teamTransactions.map((transaction) => (
                        <div key={transaction.id} className="border rounded-lg p-4 bg-card/50">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-foreground">
                                {transaction.source_user 
                                  ? `${transaction.source_user.first_name} ${transaction.source_user.last_name}`
                                  : `Team Member (ID: ${transaction.source_user_id || 'Unknown'})`
                                }
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {transaction.source_user?.email || `Team earnings transaction`}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {transaction.description}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-success">
                                +{transaction.amount.toFixed(2)} EGP
                              </div>
                              <Badge variant="outline" className="mt-1">
                                Level {getLevelFromDescription(transaction.description)}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(transaction.created_at)}
                          </div>
                        </div>
                      ))}
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
                    </ul>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                  <div className="text-center p-4 bg-success/10 rounded-lg">
                    <div className="text-2xl font-bold text-success">{level1Referrals.length}</div>
                    <div className="text-sm text-muted-foreground">{t('referral.level1') || 'Level 1 (Direct)'}</div>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{level2Referrals.length}</div>
                    <div className="text-sm text-muted-foreground">{t('referral.level2') || 'Level 2 (Indirect)'}</div>
                  </div>
                  <div className="text-center p-4 bg-warning/10 rounded-lg">
                    <div className="text-2xl font-bold text-warning">{level3Referrals.length}</div>
                    <div className="text-sm text-muted-foreground">{t('referral.level3') || 'Level 3'}</div>
                  </div>
                </div>
                {level1Referrals.length > 0 && (
                  <div className="mt-4">
                    <div className="font-semibold mb-2 text-foreground">{t('referral.level1List') || 'Level 1 Referrals:'}</div>
                    <ul className="list-disc ml-6">
                      {level1Referrals.map(u => (
                        <li key={u.user_uid} className="text-muted-foreground">{u.first_name} {u.last_name} ({u.email})</li>
                      ))}
                    </ul>
                  </div>
                )}
                {level2Referrals.length > 0 && (
                  <div className="mt-4">
                    <div className="font-semibold mb-2 text-foreground">{t('referral.level2List') || 'Level 2 Referrals:'}</div>
                    <ul className="list-disc ml-6">
                      {level2Referrals.map(u => (
                        <li key={u.user_uid} className="text-muted-foreground">{u.first_name} {u.last_name} ({u.email})</li>
                      ))}
                    </ul>
                  </div>
                )}
                {level3Referrals.length > 0 && (
                  <div className="mt-4">
                    <div className="font-semibold mb-2 text-foreground">{t('referral.level3List') || 'Level 3 Referrals:'}</div>
                    <ul className="list-disc ml-6">
                      {level3Referrals.map(u => (
                        <li key={u.user_uid} className="text-muted-foreground">{u.first_name} {u.last_name} ({u.email})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
=======
>>>>>>> Stashed changes
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground mb-2">No team transactions yet</div>
                      <div className="text-sm text-muted-foreground">
                        When your team members earn profits, their contributions will appear here
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
<<<<<<< Updated upstream
=======
>>>>>>> d73a7b8628c022c86ff9089e6b5dc2058005a2dd
>>>>>>> Stashed changes
          )}
        </div>
      </div>
    </div>
  );
} 