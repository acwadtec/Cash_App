import { useEffect, useState, useRef } from 'react';
import { Copy, Share2, Trophy, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';

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
  // Add state for active offers
  const [activeOffersByUser, setActiveOffersByUser] = useState<any>({});
  const [referralCode, setReferralCode] = useState('');
  const [referralBenefits, setReferralBenefits] = useState([
    'Earn points for every friend who joins using your code.',
    'Get bonus rewards when your referrals make their first deposit.',
    'Unlock special badges and achievements.',
    'Boost your team earnings as your network grows.'
  ]);
  const [copyTooltip, setCopyTooltip] = useState('Copy');
  const chartRef = useRef(null);

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

  // Fetch active offers for all team members
  useEffect(() => {
    async function fetchActiveOffers() {
      const allTeam = [...level1Referrals, ...level2Referrals, ...level3Referrals];
      if (allTeam.length === 0) return;
      const userIds = allTeam.map(u => u.user_uid);
      // Get all approved offer joins for these users
      const { data: joins } = await supabase
        .from('offer_joins')
        .select('user_id, offer_id, status')
        .in('user_id', userIds)
        .eq('status', 'approved');
      if (!joins) return;
      // Get offer details for all joined offers
      const offerIds = Array.from(new Set(joins.map(j => j.offer_id)));
      const { data: offers } = await supabase
        .from('offers')
        .select('id, title, daily_profit, active')
        .in('id', offerIds);
      const offerMap = {};
      (offers || []).forEach(o => { offerMap[o.id] = o; });
      // Map user to their active offers
      const byUser = {};
      userIds.forEach(uid => {
        byUser[uid] = joins
          .filter(j => j.user_id === uid && offerMap[j.offer_id]?.active)
          .map(j => offerMap[j.offer_id]);
      });
      setActiveOffersByUser(byUser);
    }
    fetchActiveOffers();
  }, [level1Referrals, level2Referrals, level3Referrals]);

  // Fetch referral code
  useEffect(() => {
    if (userInfo?.referral_code) setReferralCode(userInfo.referral_code);
  }, [userInfo?.referral_code]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getLevelFromDescription = (description: string) => {
    const match = description.match(/level (\d)/);
    return match ? match[1] : '1';
  };

  // Copy referral code
  const handleCopyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopyTooltip('Copied!');
      toast({ title: 'Copied!', description: 'Referral code copied to clipboard' });
      setTimeout(() => setCopyTooltip('Copy'), 1500);
    } catch {
      setCopyTooltip('Error');
    }
  };

  // Share referral code
  const handleShareReferralCode = async () => {
    const shareText = `Join me on Cash App! Use my referral code: ${referralCode}`;
    const shareUrl = `${window.location.origin}/register?ref=${referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join Cash App', text: shareText, url: shareUrl });
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast({ title: 'Shared!', description: 'Referral link copied to clipboard' });
    }
  };

  // Prepare data for bar chart (earnings by user)
  const barChartData = earningsByUser.map(({ user, amount }) => ({
    name: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
    value: amount
  }));
  const maxBar = Math.max(...barChartData.map(d => d.value), 1);

  // Prepare timeline data (last 7 days)
  const now = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    return d.toISOString().slice(0, 10);
  }).reverse();
  const timelineData = last7Days.map(date => ({
    date,
    txns: teamTransactions.filter(txn => txn.created_at.slice(0, 10) === date)
  }));

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

              <Separator className="my-8" />
              {/* 1. Active Offers Display */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Active Offers in Your Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...level1Referrals, ...level2Referrals, ...level3Referrals].map(member => {
                      const offers = activeOffersByUser[member.user_uid] || [];
                      const isActive = offers.length > 0;
                      return (
                        <div key={member.user_uid} className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/30">
                          <span className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="font-medium">{member.first_name} {member.last_name} <span className="text-xs text-muted-foreground">({member.email})</span></span>
                          {isActive ? (
                            <div className="flex flex-wrap gap-2 ml-auto">
                              {offers.map(offer => (
                                <Badge key={offer.id} variant="outline" className="flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  {offer.title} <span className="ml-1 text-xs text-green-700">+{offer.daily_profit} EGP/day</span>
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="w-4 h-4" /> No active offers</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* 2. Referral Program Section */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Your Referral Program</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Your Referral Code</label>
                      <div className="flex gap-2 items-center">
                        <Input value={referralCode} readOnly className="font-mono text-lg max-w-xs" />
                        <Button onClick={handleCopyReferralCode} variant="outline" size="icon" title={copyTooltip}><Copy className="w-4 h-4" /></Button>
                        <Button onClick={handleShareReferralCode} variant="outline" size="icon"><Share2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2">Referral Benefits</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {referralBenefits.map((b, i) => <li key={i}>• {b}</li>)}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Team Earnings Breakdown (Bar Chart + Timeline) */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Team Earnings Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <h4 className="font-semibold mb-2">Earnings by Team Member</h4>
                    <div className="w-full overflow-x-auto">
                      <svg ref={chartRef} width={Math.max(300, barChartData.length * 80)} height="180">
                        {barChartData.map((d, i) => (
                          <g key={i}>
                            <rect x={i * 80 + 30} y={160 - (d.value / maxBar) * 120} width="40" height={(d.value / maxBar) * 120} fill="#22c55e" rx="8" />
                            <text x={i * 80 + 50} y={175} textAnchor="middle" fontSize="12" fill="#888">{d.name.split(' ')[0]}</text>
                            <text x={i * 80 + 50} y={160 - (d.value / maxBar) * 120 - 8} textAnchor="middle" fontSize="12" fill="#22c55e">{d.value.toFixed(0)}</text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Earnings Timeline (Last 7 Days)</h4>
                    <div className="overflow-x-auto">
                      <div className="flex gap-4">
                        {timelineData.map(day => (
                          <div key={day.date} className="min-w-[120px] bg-muted/40 rounded-lg p-2 flex flex-col items-center">
                            <div className="font-semibold text-xs mb-1">{day.date}</div>
                            {day.txns.length > 0 ? day.txns.map(txn => (
                              <div key={txn.id} className="text-xs text-success font-bold">+{txn.amount.toFixed(2)} EGP</div>
                            )) : <div className="text-xs text-muted-foreground">No earnings</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 