import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import ReferralCode from '@/components/ReferralCode';
import { Camera, Edit } from 'lucide-react';

export default function Profile() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [hasUserInfo, setHasUserInfo] = useState(false);
  const [loadingUserInfo, setLoadingUserInfo] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userBadges, setUserBadges] = useState([]);
  const [level1Referrals, setLevel1Referrals] = useState<any[]>([]);
  const [level2Referrals, setLevel2Referrals] = useState<any[]>([]);
  const [level3Referrals, setLevel3Referrals] = useState<any[]>([]);

  useEffect(() => {
    const checkUserInfo = async () => {
      setLoadingUserInfo(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setLoadingUserInfo(false);
        navigate('/login');
        return;
      }
      const user = userData.user;
      setUserUid(user.id);
      const { data, error } = await supabase
        .from('user_info')
        .select('*')
        .eq('user_uid', user.id)
        .single();
      if (data) {
        setHasUserInfo(true);
        setUserInfo(data);
      } else {
        setHasUserInfo(false);
        // Don't redirect - let users stay on the page and see the message
      }
      setLoadingUserInfo(false);
    };
    checkUserInfo();
  }, [navigate]);

  // Fetch user badges
  useEffect(() => {
    const fetchBadges = async () => {
      if (!userUid) return;
      const { data, error } = await supabase
        .from('user_badges')
        .select('*, badge:badge_id(*)')
        .eq('user_id', userUid);
      if (!error && data) {
        setUserBadges(data.map(row => row.badge));
      }
    };
    fetchBadges();
  }, [userUid]);

  useEffect(() => {
    if (userInfo?.referral_code) {
      fetchReferralLevels(userInfo.referral_code);
    }
  }, [userInfo?.referral_code]);

  const fetchReferralLevels = async (myReferralCode: string) => {
    // Level 1: Direct referrals
    const { data: level1, error: l1err } = await supabase
      .from('user_info')
      .select('user_uid, first_name, last_name, email, referral_code')
      .eq('referred_by', myReferralCode);
    setLevel1Referrals(level1 || []);

    // Level 2: Indirect referrals
    const level1Codes = (level1 || []).map(u => u.referral_code);
    let level2: any[] = [];
    let level2Codes: string[] = [];
    if (level1Codes.length > 0) {
      const { data: l2, error: l2err } = await supabase
        .from('user_info')
        .select('user_uid, first_name, last_name, email, referral_code')
        .in('referred_by', level1Codes);
      level2 = l2 || [];
      setLevel2Referrals(level2);
      level2Codes = (level2 || []).map(u => u.referral_code);
    } else {
      setLevel2Referrals([]);
    }

    // Level 3: Third-level referrals
    let level3: any[] = [];
    if (level2Codes.length > 0) {
      const { data: l3, error: l3err } = await supabase
        .from('user_info')
        .select('user_uid, first_name, last_name, email, referral_code')
        .in('referred_by', level2Codes);
      level3 = l3 || [];
    }
    setLevel3Referrals(level3);
  };

  async function processReferral(newUserId: string, referralCode: string) {
    console.log('processReferral called', newUserId, referralCode);
    try {
      // Get direct referrer info (Level 1)
      const { data: referrerData, error: referrerError } = await supabase
        .from('user_info')
        .select('user_uid, referral_count, total_referral_points, email, referred_by')
        .eq('referral_code', referralCode)
        .single();
      console.log('referrerData', referrerData, referrerError);
      if (referrerError || !referrerData) {
        console.error('Error getting referrer data:', referrerError);
        toast({ title: t('referral.error'), description: t('referral.referrerNotFound'), variant: 'destructive' });
        return;
      }

      // Get referral settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('referral_settings')
        .select('level1_points, level2_points, level3_points')
        .eq('id', 1)
        .single();
      console.log('settingsData', settingsData, settingsError);
      if (settingsError || !settingsData) {
        console.error('Error getting referral settings:', settingsError);
        toast({ title: t('referral.error'), description: t('referral.settingsNotFound'), variant: 'destructive' });
        return;
      }

      // Award Level 1 points
      const pointsToAwardL1 = settingsData.level1_points || 100;
      const newReferralCountL1 = (referrerData.referral_count || 0) + 1;
      const newTotalPointsL1 = (referrerData.total_referral_points || 0) + pointsToAwardL1;
      const { error: updateErrorL1 } = await supabase
        .from('user_info')
        .update({
          referral_count: newReferralCountL1,
          total_referral_points: newTotalPointsL1
        })
        .eq('user_uid', referrerData.user_uid);
      console.log('updateErrorL1', updateErrorL1);
      if (updateErrorL1) {
        console.error('Error updating referrer stats:', updateErrorL1);
        toast({ title: t('referral.error'), description: t('referral.updateStatsFailed'), variant: 'destructive' });
        return;
      }

      // Record the Level 1 referral
      const { error: insertErrorL1 } = await supabase
        .from('referrals')
        .insert([{
          referrer_uid: referrerData.user_uid,
          referred_uid: newUserId,
          level: 1,
          points_earned: pointsToAwardL1,
          referral_code: referralCode
        }]);
      console.log('insertErrorL1', insertErrorL1);
      if (insertErrorL1) {
        console.error('Error inserting referral record:', insertErrorL1);
        toast({ title: t('referral.error'), description: t('referral.recordFailed'), variant: 'destructive' });
        return;
      }

      // Award Level 2 points if the direct referrer was also referred by someone
      if (referrerData.referred_by) {
        // Get Level 2 referrer info
        const { data: referrer2Data, error: referrer2Error } = await supabase
          .from('user_info')
          .select('user_uid, referral_count, total_referral_points, referred_by, email')
          .eq('referral_code', referrerData.referred_by)
          .single();
        console.log('referrer2Data', referrer2Data, referrer2Error);
        if (!referrer2Error && referrer2Data) {
          const pointsToAwardL2 = settingsData.level2_points || 50;
          const newReferralCountL2 = (referrer2Data.referral_count || 0) + 1;
          const newTotalPointsL2 = (referrer2Data.total_referral_points || 0) + pointsToAwardL2;
          const { error: updateErrorL2 } = await supabase
            .from('user_info')
            .update({
              referral_count: newReferralCountL2,
              total_referral_points: newTotalPointsL2
            })
            .eq('user_uid', referrer2Data.user_uid);
          console.log('updateErrorL2', updateErrorL2);
          if (!updateErrorL2) {
            // Record the Level 2 referral
            const { error: insertErrorL2 } = await supabase
              .from('referrals')
              .insert([{
                referrer_uid: referrer2Data.user_uid,
                referred_uid: newUserId,
                level: 2,
                points_earned: pointsToAwardL2,
                referral_code: referrerData.referred_by
              }]);
            console.log('insertErrorL2', insertErrorL2);
          }

          // Award Level 3 points if Level 2 referrer was also referred by someone
          if (referrer2Data.referred_by) {
            const { data: referrer3Data, error: referrer3Error } = await supabase
              .from('user_info')
              .select('user_uid, referral_count, total_referral_points, email')
              .eq('referral_code', referrer2Data.referred_by)
              .single();
            console.log('referrer3Data', referrer3Data, referrer3Error);
            if (!referrer3Error && referrer3Data) {
              const pointsToAwardL3 = settingsData.level3_points || 25;
              const newReferralCountL3 = (referrer3Data.referral_count || 0) + 1;
              const newTotalPointsL3 = (referrer3Data.total_referral_points || 0) + pointsToAwardL3;
              const { error: updateErrorL3 } = await supabase
                .from('user_info')
                .update({
                  referral_count: newReferralCountL3,
                  total_referral_points: newTotalPointsL3
                })
                .eq('user_uid', referrer3Data.user_uid);
              console.log('updateErrorL3', updateErrorL3);
              if (!updateErrorL3) {
                // Record the Level 3 referral
                const { error: insertErrorL3 } = await supabase
                  .from('referrals')
                  .insert([{
                    referrer_uid: referrer3Data.user_uid,
                    referred_uid: newUserId,
                    level: 3,
                    points_earned: pointsToAwardL3,
                    referral_code: referrer2Data.referred_by
                  }]);
                console.log('insertErrorL3', insertErrorL3);
              }
            }
          }
        }
      }

      // Update new user's referred_by field
      const { error: updateNewUserError } = await supabase
        .from('user_info')
        .update({ referred_by: referralCode })
        .eq('user_uid', newUserId);
      console.log('updateNewUserError', updateNewUserError);
      if (updateNewUserError) {
        console.error('Error updating new user referred_by:', updateNewUserError);
        toast({ title: t('referral.error'), description: t('referral.updateUserFailed'), variant: 'destructive' });
        return;
      }

      toast({ title: t('referral.success'), description: t('referral.processed').replace('{email}', referrerData.email) });
    } catch (error) {
      console.error('Error processing referral:', error);
      toast({ title: t('referral.error'), description: t('referral.unexpectedError'), variant: 'destructive' });
    }
  }

  // Helper to get image URL from storage path
  const getImageUrl = (type: 'front' | 'back' | 'profile') => {
    if (!userUid) return '';
    
    if (type === 'profile') {
      const dbUrl = userInfo?.profile_photo_url;
      if (!dbUrl) return '';
      return supabase.storage.from('user-photos').getPublicUrl(dbUrl).data.publicUrl;
    }
    
    const fileName = type === 'front' ? 'front' : 'back';
    // Find the file name from the DB url if available, fallback to latest
    let dbUrl = type === 'front' ? userInfo?.id_front_url : userInfo?.id_back_url;
    let file = '';
    if (dbUrl) {
      // Try to extract the file name from the URL
      const match = dbUrl.match(/\/([^\/]+)$/);
      if (match) file = match[1];
    }
    // If not found, fallback to wildcard (will not work unless you list files)
    if (!file) return dbUrl || '';
    // Compose the path
    const path = `${userUid}/${file}`;
    return supabase.storage.from('user-photos').getPublicUrl(path).data.publicUrl;
  };

  const handleUpdateAccount = () => {
    navigate('/update-account');
  };

  const getProfilePhotoUrl = () => {
    if (userInfo?.profile_photo_url) {
      return getImageUrl('profile');
    }
    return null;
  };

  const getAvatarFallback = () => {
    return userInfo?.first_name?.slice(0, 1).toUpperCase() || 
           userInfo?.last_name?.slice(0, 1).toUpperCase() || 
           userInfo?.email?.slice(0, 2).toUpperCase() ||
           'U';
  };

  if (loadingUserInfo) {
    return (
      <div className="min-h-screen py-20 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-32 w-32 border-4 border-primary/20 mx-auto"></div>
              <div className="absolute inset-0 animate-spin rounded-full h-32 w-32 border-4 border-transparent border-t-primary mx-auto"></div>
            </div>
            <p className="mt-6 text-lg text-muted-foreground font-medium">{t('common.loading')}</p>
            <p className="mt-2 text-sm text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasUserInfo) {
    return (
      <div className="min-h-screen py-20 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
              <CardContent className="pt-8 pb-8 relative">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 flex items-center justify-center">
                  <div className="text-3xl">👤</div>
                </div>
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  {t('profile.noData')}
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  {t('profile.noDataDesc')}
                </p>
                <Button 
                  onClick={handleUpdateAccount} 
                  className="w-full bg-gradient-to-r from-primary to-purple-600 border-0 text-white hover:scale-105 transition-all duration-300 shadow-lg py-3 text-lg font-medium"
                >
                  {t('profile.updateAccount')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 bg-gradient-to-br from-background via-background to-muted/20 text-foreground">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Enhanced Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('profile.title') || 'Profile'}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Manage your account and view your achievements
            </p>
          </div>

          {/* Enhanced User Info Card */}
          <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
            <CardContent className="p-8 relative">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="relative group">
                  <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-white/20 shadow-2xl">
                      {getProfilePhotoUrl() ? (
                        <img 
                          src={getProfilePhotoUrl()!} 
                          alt="Profile" 
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <AvatarFallback className="text-3xl bg-gradient-to-r from-primary to-purple-600">
                          {getAvatarFallback()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <Button
                    onClick={handleUpdateAccount}
                    variant="outline"
                    size="sm"
                    className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full p-0 bg-gradient-to-r from-primary to-purple-600 border-0 hover:scale-110 transition-all duration-300 shadow-lg"
                  >
                    <Edit className="w-5 h-5 text-white" />
                  </Button>
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-4xl font-bold mb-3 text-foreground bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    {userInfo?.first_name && userInfo?.last_name 
                      ? `${userInfo.first_name} ${userInfo.last_name}`
                      : userInfo?.email || t('profile.noData')}
                  </h2>
                  <div className="space-y-2">
                    <p className="text-lg text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {userInfo?.email}
                    </p>
                    {userInfo?.phone && (
                      <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        {userInfo.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Balance Cards */}
          {userInfo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 p-6 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {userInfo.balance ?? 0} <span className="text-lg">EGP</span>
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">{t('profile.balance')}</div>
                  <div className="mt-2 text-xs text-green-600/70">Available balance</div>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {userInfo.total_points ?? 0}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">{t('profile.totalPoints')}</div>
                  <div className="mt-2 text-xs text-blue-600/70">Total points earned</div>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 p-6 border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {userInfo.bonuses ?? 0} <span className="text-lg">EGP</span>
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">{t('profile.bonuses')}</div>
                  <div className="mt-2 text-xs text-yellow-600/70">Bonus rewards</div>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {userInfo.team_earnings ?? 0} <span className="text-lg">EGP</span>
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">{t('profile.teamEarnings')}</div>
                  <div className="mt-2 text-xs text-purple-600/70">Team commission</div>
                </div>
              </div>
            </div>
          )}

          

          {/* Enhanced Achievements Section */}
          <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
            <CardHeader className="relative">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                {t('profile.achievements')}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Enhanced Level */}
                <div className="text-center group">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary to-purple-600 p-1 group-hover:scale-110 transition-transform duration-300">
                      <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                        <div className="text-4xl font-bold text-primary">
                          {userInfo?.level || 1}
                        </div>
                      </div>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      ★
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{t('profile.level')}</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    {t('profile.levelDesc')}
                  </p>
                </div>

                {/* Enhanced Badges */}
                <div>
                  <h3 className="text-xl font-semibold mb-6 text-foreground text-center md:text-left">{t('profile.badges')}</h3>
                  {userBadges.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {userBadges.map((badge: any, index: number) => (
                        <div key={index} className="group relative">
                          <Badge 
                            variant="secondary" 
                            className="w-full text-center py-3 px-4 text-sm font-medium bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 hover:border-primary/40 transition-all duration-300 group-hover:scale-105"
                          >
                            <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                            {badge.name}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <div className="text-2xl text-muted-foreground">🏆</div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('profile.noBadges')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Complete tasks to earn badges
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Account Information */}
          <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  {t('profile.accountInfo')}
                </CardTitle>
                <Button 
                  onClick={handleUpdateAccount} 
                  variant="outline" 
                  size="sm"
                  className="bg-gradient-to-r from-primary to-purple-600 border-0 text-white hover:scale-105 transition-all duration-300 shadow-lg"
                >
                  {t('profile.edit')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      {t('profile.firstName')}
                    </label>
                    <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 group-hover:border-primary/30 transition-all duration-300">
                      <p className="text-foreground font-medium">{userInfo?.first_name || '-'}</p>
                    </div>
                  </div>
                  <div className="group">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      {t('profile.lastName')}
                    </label>
                    <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 group-hover:border-primary/30 transition-all duration-300">
                      <p className="text-foreground font-medium">{userInfo?.last_name || '-'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="group">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    {t('profile.phone')}
                  </label>
                  <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/5 to-transparent border border-blue-500/10 group-hover:border-blue-500/30 transition-all duration-300">
                    <p className="text-foreground font-medium flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      {userInfo?.phone || '-'}
                    </p>
                  </div>
                </div>
                
                <div className="group">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    {t('profile.wallet')}
                  </label>
                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/5 to-transparent border border-green-500/10 group-hover:border-green-500/30 transition-all duration-300">
                    <p className="text-foreground font-medium flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {userInfo?.wallet || '-'}
                    </p>
                  </div>
                </div>

                {/* Enhanced Profile Photo */}
                {userInfo?.profile_photo_url && (
                  <div className="group">
                    <label className="text-sm font-medium text-muted-foreground mb-3 block">
                      {t('profile.profilePhoto')}
                    </label>
                    <div className="flex items-center gap-6">
                      <div className="relative group">
                        <Avatar className="w-20 h-20 border-4 border-white/20 shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <img 
                            src={getProfilePhotoUrl()!} 
                            alt="Profile" 
                            className="w-full h-full object-cover rounded-full"
                          />
                        </Avatar>
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setModalImageUrl(getProfilePhotoUrl()!);
                          setShowImageModal(true);
                        }}
                        className="bg-gradient-to-r from-primary to-purple-600 border-0 text-white hover:scale-105 transition-all duration-300 shadow-lg"
                      >
                        {t('profile.view')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Enhanced ID Photos */}
                {(userInfo?.id_front_url || userInfo?.id_back_url) && (
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-muted-foreground mb-3 block">
                      {t('profile.idPhotos')}
                    </label>
                    <div className="grid md:grid-cols-2 gap-6">
                      {userInfo?.id_front_url && (
                        <div className="group">
                          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/5 to-transparent border border-blue-500/10 group-hover:border-blue-500/30 transition-all duration-300">
                            <p className="text-sm font-medium text-blue-600 mb-3 flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              {t('profile.idFront')}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setModalImageUrl(getImageUrl('front'));
                                setShowImageModal(true);
                              }}
                              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white hover:scale-105 transition-all duration-300 shadow-lg"
                            >
                              {t('profile.view')}
                            </Button>
                          </div>
                        </div>
                      )}
                      {userInfo?.id_back_url && (
                        <div className="group">
                          <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/5 to-transparent border border-green-500/10 group-hover:border-green-500/30 transition-all duration-300">
                            <p className="text-sm font-medium text-green-600 mb-3 flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              {t('profile.idBack')}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setModalImageUrl(getImageUrl('back'));
                                setShowImageModal(true);
                              }}
                              className="w-full bg-gradient-to-r from-green-500 to-green-600 border-0 text-white hover:scale-105 transition-all duration-300 shadow-lg"
                            >
                              {t('profile.view')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                </div>
              </CardContent>
            </Card>

          {/* Enhanced Image Modal */}
          <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
            <DialogContent className="max-w-4xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0">
              <div className="relative">
                <img 
                  src={modalImageUrl} 
                  alt="Photo" 
                  className="max-w-full max-h-[80vh] mx-auto rounded-lg shadow-2xl" 
                />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Enhanced Referral Code Section */}
          {userUid && (
            <div className="mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl"></div>
                <div className="relative">
                  <ReferralCode
                    userUid={userUid}
                    isVerified={userInfo?.verified || false}
                    level1Count={level1Referrals.length}
                    level2Count={level2Referrals.length}
                    level3Count={level3Referrals.length}
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
