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
    <div className={`min-h-screen py-20 ${isRTL ? 'rtl' : 'ltr'} bg-gradient-to-br from-background via-background to-muted/20 text-foreground`}>
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('referral.networkTitle')}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Build your network and earn rewards with every referral
            </p>
          </div>

          {userInfo?.referral_code && (
            <>
              {/* Enhanced Referral Network Overview Card */}
              <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 mb-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-primary to-purple-600 rounded-lg">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">{t('referral.networkTitle')}</CardTitle>
                  </div>
              </CardHeader>
                <CardContent className="relative">
                  {/* Enhanced Team Earnings Breakdown */}
                  <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 p-6 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:scale-105">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {teamEarnings['1']?.toFixed(2) || '0.00'} <span className="text-lg">EGP</span>
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">{t('referral.level1Earnings')}</div>
                        <div className="mt-2 text-xs text-green-600/70">Direct referrals</div>
                      </div>
                    </div>
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-105">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {teamEarnings['2']?.toFixed(2) || '0.00'} <span className="text-lg">EGP</span>
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">{t('referral.level2Earnings')}</div>
                        <div className="mt-2 text-xs text-blue-600/70">Indirect referrals</div>
                      </div>
                    </div>
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 p-6 border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:scale-105">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">
                        <div className="text-3xl font-bold text-orange-600 mb-2">
                          {teamEarnings['3']?.toFixed(2) || '0.00'} <span className="text-lg">EGP</span>
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">{t('referral.level3Earnings')}</div>
                        <div className="mt-2 text-xs text-orange-600/70">Extended network</div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Team Earnings By User Breakdown */}
                  {earningsByUser.length > 0 && (
                    <div className="mb-8 p-6 bg-gradient-to-r from-muted/30 to-muted/50 rounded-xl border border-border/50">
                      <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        {t('referral.teamEarningsBreakdown')}
                      </h2>
                      <div className="grid gap-3">
                        {earningsByUser.map(({ user, amount }) => (
                          <div key={user?.user_uid || 'unknown'} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {user ? `${user.first_name[0]}${user.last_name[0]}` : 'U'}
                              </div>
                              <div>
                                <div className="font-medium text-foreground">
                                  {user ? `${user.first_name} ${user.last_name}` : t('referral.unknownUser')}
                                </div>
                                <div className="text-xs text-muted-foreground">{user?.email}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">{amount.toFixed(2)} EGP</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Referral Counts */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-600/10 p-6 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:scale-105">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative text-center">
                        <div className="text-4xl font-bold text-green-600 mb-2">{level1Referrals.length}</div>
                        <div className="text-sm text-muted-foreground font-medium">{t('referral.level1Direct')}</div>
                        <div className="mt-2 text-xs text-green-600/70">Direct team members</div>
                      </div>
                    </div>
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-600/10 p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-105">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative text-center">
                        <div className="text-4xl font-bold text-blue-600 mb-2">{level2Referrals.length}</div>
                        <div className="text-sm text-muted-foreground font-medium">{t('referral.level2Indirect')}</div>
                        <div className="mt-2 text-xs text-blue-600/70">Indirect team members</div>
                      </div>
                    </div>
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-600/10 p-6 border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:scale-105">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative text-center">
                        <div className="text-4xl font-bold text-orange-600 mb-2">{level3Referrals.length}</div>
                        <div className="text-sm text-muted-foreground font-medium">{t('referral.level3')}</div>
                        <div className="mt-2 text-xs text-orange-600/70">Extended network</div>
                      </div>
                    </div>
                  </div>
                  {/* Enhanced Referral Lists */}
                  {level1Referrals.length > 0 && (
                    <div className="mt-8 p-6 bg-gradient-to-r from-green-500/5 to-green-600/5 rounded-xl border border-green-500/20">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-green-700">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        {t('referral.level1List')}
                      </h3>
                      <div className="grid gap-3">
                        {level1Referrals.map(u => (
                          <div key={u.user_uid} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-green-500/20 hover:border-green-500/40 transition-all duration-200">
                            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                              {u.first_name[0]}{u.last_name[0]}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-foreground">{u.first_name} {u.last_name}</div>
                              <div className="text-sm text-muted-foreground">{u.email}</div>
                            </div>
                            <Badge variant="outline" className="border-green-500/30 text-green-600">Level 1</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {level2Referrals.length > 0 && (
                    <div className="mt-6 p-6 bg-gradient-to-r from-blue-500/5 to-blue-600/5 rounded-xl border border-blue-500/20">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-700">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        {t('referral.level2List')}
                      </h3>
                      <div className="grid gap-3">
                        {level2Referrals.map(u => (
                          <div key={u.user_uid} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-all duration-200">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                              {u.first_name[0]}{u.last_name[0]}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-foreground">{u.first_name} {u.last_name}</div>
                              <div className="text-sm text-muted-foreground">{u.email}</div>
                            </div>
                            <Badge variant="outline" className="border-blue-500/30 text-blue-600">Level 2</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {level3Referrals.length > 0 && (
                    <div className="mt-6 p-6 bg-gradient-to-r from-orange-500/5 to-orange-600/5 rounded-xl border border-orange-500/20">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-orange-700">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        {t('referral.level3List')}
                      </h3>
                      <div className="grid gap-3">
                        {level3Referrals.map(u => (
                          <div key={u.user_uid} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-orange-500/20 hover:border-orange-500/40 transition-all duration-200">
                            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                              {u.first_name[0]}{u.last_name[0]}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-foreground">{u.first_name} {u.last_name}</div>
                              <div className="text-sm text-muted-foreground">{u.email}</div>
                            </div>
                            <Badge variant="outline" className="border-orange-500/30 text-orange-600">Level 3</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enhanced Team Transactions Section */}
              <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 mb-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                      <div className="w-6 h-6 text-white flex items-center justify-center font-bold">₿</div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">{t('referral.teamTransactions')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  {loadingTransactions ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                      <p className="text-muted-foreground font-medium">{t('referral.loadingTransactions')}</p>
                    </div>
                  ) : teamTransactions.length > 0 ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-blue-700">
                            {t('referral.showingTransactions').replace('{count}', teamTransactions.length.toString())}
                          </span>
                        </div>
                        <Badge variant="outline" className="border-blue-500/30 text-blue-600">
                          {teamTransactions.length} transactions
                        </Badge>
                      </div>
                      <div className="grid gap-4">
                        {teamTransactions.map((transaction) => (
                          <div key={transaction.id} className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-background/50 to-background/30 p-6 border border-border/50 hover:border-blue-500/40 transition-all duration-300 hover:scale-[1.02]">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                    {transaction.source_user 
                                      ? `${transaction.source_user.first_name[0]}${transaction.source_user.last_name[0]}`
                                      : 'TM'
                                    }
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-bold text-lg text-foreground">
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
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-green-600 mb-2">
                                    +{transaction.amount.toFixed(2)} <span className="text-lg">EGP</span>
                                  </div>
                                  <Badge variant="outline" className="border-green-500/30 text-green-600 font-medium">
                                    Level {getLevelFromDescription(transaction.description)}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{formatDate(transaction.created_at)}</span>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span>Team Earnings</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="w-8 h-8 text-blue-500">₿</div>
                      </div>
                      <p className="text-muted-foreground font-medium text-lg">{t('referral.noTeamTransactions')}</p>
                      <p className="text-sm text-muted-foreground mt-2">Start building your team to see transactions here</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Separator className="my-8" />
              {/* Enhanced Active Offers Display */}
              <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 mb-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5"></div>
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-white" />
                </div>
                    <CardTitle className="text-2xl font-bold text-foreground">Active Offers in Your Team</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-4">
                    {[...level1Referrals, ...level2Referrals, ...level3Referrals].map(member => {
                      const offers = activeOffersByUser[member.user_uid] || [];
                      const isActive = offers.length > 0;
                      return (
                        <div key={member.user_uid} className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-background/50 to-background/30 p-4 border border-border/50 hover:border-green-500/40 transition-all duration-300">
                          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="relative flex items-center gap-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                              <div className="w-10 h-10 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                {member.first_name[0]}{member.last_name[0]}
                              </div>
                              <div>
                                <div className="font-bold text-foreground">{member.first_name} {member.last_name}</div>
                                <div className="text-sm text-muted-foreground">{member.email}</div>
                              </div>
                            </div>
                            {isActive ? (
                              <div className="flex flex-wrap gap-2 ml-auto">
                                {offers.map(offer => (
                                  <Badge key={offer.id} variant="outline" className="flex items-center gap-1 border-green-500/30 text-green-600 bg-green-500/10">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    {offer.title} <span className="ml-1 text-xs text-green-700 font-bold">+{offer.daily_profit} EGP/day</span>
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <div className="ml-auto flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span className="text-sm text-muted-foreground font-medium">No active offers</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Referral Program Section */}
              <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 mb-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5"></div>
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                      <Share2 className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">Your Referral Program</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-bold mb-3 block text-foreground">Your Referral Code</label>
                        <div className="flex gap-3 items-center">
                          <div className="flex-1 relative">
                            <Input 
                              value={referralCode} 
                              readOnly 
                              className="font-mono text-xl font-bold bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 focus:border-purple-500/50 transition-all duration-300" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-md pointer-events-none"></div>
                          </div>
                          <Button 
                            onClick={handleCopyReferralCode} 
                            variant="outline" 
                            size="icon" 
                            title={copyTooltip}
                            className="border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all duration-300"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={handleShareReferralCode} 
                            variant="outline" 
                            size="icon"
                            className="border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all duration-300"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-bold text-lg text-foreground">Referral Benefits</h4>
                      <div className="space-y-3">
                        {referralBenefits.map((benefit, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-lg border border-purple-500/20">
                            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">
                              {i + 1}
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{benefit}</p>
                </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Team Earnings Breakdown (Bar Chart + Timeline) */}
              <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 mb-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-cyan-500/5"></div>
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-indigo-500 to-cyan-600 rounded-lg">
                      <div className="w-6 h-6 text-white flex items-center justify-center font-bold">📊</div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">Team Earnings Breakdown</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="mb-8">
                    <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-foreground">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      Earnings by Team Member
                    </h4>
                    <div className="w-full overflow-x-auto p-4 bg-gradient-to-r from-indigo-500/5 to-cyan-500/5 rounded-xl border border-indigo-500/20">
                      <svg ref={chartRef} width={Math.max(400, barChartData.length * 100)} height="200">
                        {barChartData.map((d, i) => (
                          <g key={i}>
                            <defs>
                              <linearGradient id={`gradient-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#06b6d4" />
                              </linearGradient>
                            </defs>
                            <rect 
                              x={i * 100 + 40} 
                              y={180 - (d.value / maxBar) * 140} 
                              width="50" 
                              height={(d.value / maxBar) * 140} 
                              fill={`url(#gradient-${i})`} 
                              rx="8"
                              className="hover:opacity-80 transition-opacity duration-200"
                            />
                            <text x={i * 100 + 65} y={195} textAnchor="middle" fontSize="14" fill="#6b7280" fontWeight="600">
                              {d.name.split(' ')[0]}
                            </text>
                            <text x={i * 100 + 65} y={180 - (d.value / maxBar) * 140 - 12} textAnchor="middle" fontSize="12" fill="#6366f1" fontWeight="bold">
                              {d.value.toFixed(0)} EGP
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-foreground">
                      <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                      Earnings Timeline (Last 7 Days)
                    </h4>
                    <div className="overflow-x-auto">
                      <div className="flex gap-4 p-4 bg-gradient-to-r from-cyan-500/5 to-indigo-500/5 rounded-xl border border-cyan-500/20">
                        {timelineData.map(day => (
                          <div key={day.date} className="min-w-[140px] bg-background/50 rounded-lg p-4 flex flex-col items-center border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 hover:scale-105">
                            <div className="font-bold text-sm mb-2 text-foreground">{day.date}</div>
                            {day.txns.length > 0 ? (
                              <div className="space-y-1">
                                {day.txns.map(txn => (
                                  <div key={txn.id} className="text-sm text-cyan-600 font-bold bg-cyan-500/10 px-2 py-1 rounded">
                                    +{txn.amount.toFixed(2)} EGP
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded">No earnings</div>
                            )}
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