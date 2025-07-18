import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';

export default function ReferralNetwork() {
  const { t, isRTL } = useLanguage();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [level1Referrals, setLevel1Referrals] = useState<any[]>([]);
  const [level2Referrals, setLevel2Referrals] = useState<any[]>([]);
  const [level3Referrals, setLevel3Referrals] = useState<any[]>([]);
  const [teamEarnings, setTeamEarnings] = useState<{[level: string]: number}>({});
  const [earningsByUser, setEarningsByUser] = useState<any[]>([]);

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

  return (
    <div className={`min-h-screen py-20 ${isRTL ? 'rtl' : 'ltr'} bg-background text-foreground`}>
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-foreground">{t('referral.networkTitle') || 'Referral Network'}</h1>
          {userInfo?.referral_code && (
            <Card className="shadow-glow bg-card">
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
          )}
        </div>
      </div>
    </div>
  );
} 