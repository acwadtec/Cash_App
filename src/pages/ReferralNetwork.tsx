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

      if (transactions && transactions.length > 0) {
        // Get unique user IDs from source_user_id
        const userIds = transactions
          .map(t => t.source_user_id)
          .filter(id => id) as string[];
        
        // Fetch source user details from user_info table
        let userMap: {[userId: string]: any} = {};
        if (userIds.length > 0) {
          const { data: userInfoData } = await supabase
            .from('user_info')
            .select('user_uid, first_name, last_name, email')
            .in('user_uid', userIds);
          
          if (userInfoData) {
            userInfoData.forEach(user => {
              userMap[user.user_uid] = {
                first_name: user.first_name || 'Unknown',
                last_name: user.last_name || 'User',
                email: user.email || 'No email'
              };
            });
          }
        }
        
        // Map transactions with user info
        const transactionsWithUsers = transactions.map(txn => ({
          ...txn,
          source_user: userMap[txn.source_user_id || '']
        }));
        
        setTeamTransactions(transactionsWithUsers);
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

  async function getDescendantsAtLevel(referralCodes: string[], currentLevel: number, targetLevel: number, collected: any[] = []) {
    if (currentLevel > targetLevel) return collected;
    if (currentLevel === targetLevel) {
      const { data: users } = await supabase
        .from('user_info')
        .select('user_uid, first_name, last_name, email, referral_code')
        .in('referral_code', referralCodes);
      return [...collected, ...(users || [])];
    }
    
    const { data: nextLevelUsers } = await supabase
      .from('user_info')
      .select('user_uid, first_name, last_name, email, referral_code')
      .in('referral_code', referralCodes);
    
    if (!nextLevelUsers || nextLevelUsers.length === 0) return collected;
    
    const nextLevelCodes = nextLevelUsers.map(u => u.referral_code).filter(Boolean);
    return getDescendantsAtLevel(nextLevelCodes, currentLevel + 1, targetLevel, [...collected, ...nextLevelUsers]);
  }

  async function getDescendantsAtOrAboveLevel(referralCodes: string[], currentLevel: number, minLevel: number, collected: any[] = []) {
    if (currentLevel >= minLevel) {
      const { data: users } = await supabase
        .from('user_info')
        .select('user_uid, first_name, last_name, email, referral_code')
        .in('referral_code', referralCodes);
      collected.push(...(users || []));
    }
    
    if (currentLevel < 3) {
      const { data: nextLevelUsers } = await supabase
        .from('user_info')
        .select('user_uid, first_name, last_name, email, referral_code')
        .in('referral_code', referralCodes);
      
      if (nextLevelUsers && nextLevelUsers.length > 0) {
        const nextLevelCodes = nextLevelUsers.map(u => u.referral_code).filter(Boolean);
        await getDescendantsAtOrAboveLevel(nextLevelCodes, currentLevel + 1, minLevel, collected);
      }
    }
    
    return collected;
  }

  const fetchReferralLevels = async (myReferralCode: string) => {
    try {
      const level1 = await getDescendantsAtLevel([myReferralCode], 1, 1);
      const level2 = await getDescendantsAtLevel([myReferralCode], 1, 2);
      const level3 = await getDescendantsAtLevel([myReferralCode], 1, 3);
      
      setLevel1Referrals(level1);
      setLevel2Referrals(level2);
      setLevel3Referrals(level3);
    } catch (error) {
      console.error('Error fetching referral levels:', error);
    }
  };

  useEffect(() => {
    if (userInfo?.referral_code) {
      fetchReferralLevels(userInfo.referral_code);
    }
  }, [userInfo?.referral_code]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getLevelFromDescription = (description: string) => {
    const match = description.match(/level (\d)/);
    return match ? match[1] : '1';
  };

  return (
    <div className={`min-h-screen py-20 ${isRTL ? 'rtl' : 'ltr'} bg-background text-foreground`}>
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-foreground">{t('referral.networkTitle')}</h1>
          {userInfo?.referral_code && (
            <>
              <Card className="shadow-glow bg-card mb-6">
                <CardHeader>
                  <CardTitle className="text-foreground">{t('referral.networkTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Team Earnings Breakdown */}
                  <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    <div className="text-center p-4 bg-success/10 rounded-lg">
                      <div className="text-lg font-bold text-success">{teamEarnings['1']?.toFixed(2) || '0.00'} EGP</div>
                      <div className="text-sm text-muted-foreground">{t('referral.level1Earnings')}</div>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <div className="text-lg font-bold text-primary">{teamEarnings['2']?.toFixed(2) || '0.00'} EGP</div>
                      <div className="text-sm text-muted-foreground">{t('referral.level2Earnings')}</div>
                    </div>
                    <div className="text-center p-4 bg-warning/10 rounded-lg">
                      <div className="text-lg font-bold text-warning">{teamEarnings['3']?.toFixed(2) || '0.00'} EGP</div>
                      <div className="text-sm text-muted-foreground">{t('referral.level3Earnings')}</div>
                    </div>
                  </div>
                  {/* Team Earnings By User Breakdown */}
                  {earningsByUser.length > 0 && (
                    <div className="mt-6">
                      <h2 className="font-semibold mb-2">{t('referral.teamEarningsBreakdown')}</h2>
                      <ul>
                        {earningsByUser.map(({ user, amount }) => (
                          <li key={user?.user_uid || 'unknown'}>
                            {user ? `${user.first_name} ${user.last_name} (${user.email})` : t('referral.unknownUser')}: {amount.toFixed(2)} EGP
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="text-center p-4 bg-success/10 rounded-lg">
                      <div className="text-2xl font-bold text-success">{level1Referrals.length}</div>
                      <div className="text-sm text-muted-foreground">{t('referral.level1Direct')}</div>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{level2Referrals.length}</div>
                      <div className="text-sm text-muted-foreground">{t('referral.level2Indirect')}</div>
                    </div>
                    <div className="text-center p-4 bg-warning/10 rounded-lg">
                      <div className="text-2xl font-bold text-warning">{level3Referrals.length}</div>
                      <div className="text-sm text-muted-foreground">{t('referral.level3')}</div>
                    </div>
                  </div>
                  {level1Referrals.length > 0 && (
                    <div className="mt-4">
                      <div className="font-semibold mb-2 text-foreground">{t('referral.level1List')}</div>
                      <ul className="list-disc ml-6">
                        {level1Referrals.map(u => (
                          <li key={u.user_uid} className="text-muted-foreground">{u.first_name} {u.last_name} ({u.email})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {level2Referrals.length > 0 && (
                    <div className="mt-4">
                      <div className="font-semibold mb-2 text-foreground">{t('referral.level2List')}</div>
                      <ul className="list-disc ml-6">
                        {level2Referrals.map(u => (
                          <li key={u.user_uid} className="text-muted-foreground">{u.first_name} {u.last_name} ({u.email})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {level3Referrals.length > 0 && (
                    <div className="mt-4">
                      <div className="font-semibold mb-2 text-foreground">{t('referral.level3List')}</div>
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
                  <CardTitle className="text-foreground">{t('referral.teamTransactions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingTransactions ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">{t('referral.loadingTransactions')}</p>
                    </div>
                  ) : teamTransactions.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground mb-4">
                        {t('referral.showingTransactions').replace('{count}', teamTransactions.length.toString())}
                      </div>
                      {teamTransactions.map((transaction) => (
                        <div key={transaction.id} className="border rounded-lg p-4 bg-card/50">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-foreground">
                                {transaction.source_user 
                                  ? `${transaction.source_user.first_name} ${transaction.source_user.last_name}`
                                  : `${t('referral.teamMember')} (ID: ${transaction.source_user_id || 'Unknown'})`
                                }
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {transaction.source_user?.email || t('referral.teamEarningsTransaction')}
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
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">{t('referral.noTeamTransactions')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 