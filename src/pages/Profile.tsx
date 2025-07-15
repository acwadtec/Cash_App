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
<<<<<<< HEAD
=======
  const { balances, loading: loadingBalances } = useUserBalances();
  // Calculate capital as the sum of personal_earnings, team_earnings, and bonuses
  const capital = balances
    ? balances.personal_earnings + balances.team_earnings + balances.bonuses
    : 0;
  const [levels, setLevels] = useState<any[]>([]);
>>>>>>> 8b6445f5b9d161dd28ce8ba2bd8c30d2efd076ac

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
        toast({ title: 'Referral Error', description: 'Referrer not found or error', variant: 'destructive' });
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
        toast({ title: 'Referral Error', description: 'Settings not found or error', variant: 'destructive' });
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
        toast({ title: 'Referral Error', description: 'Failed to update referrer stats', variant: 'destructive' });
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
        toast({ title: 'Referral Error', description: 'Failed to record referral', variant: 'destructive' });
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
        toast({ title: 'Referral Error', description: 'Failed to update new user', variant: 'destructive' });
        return;
      }

      toast({ title: 'Referral Success', description: `Referral processed for ${referrerData.email}` });
    } catch (error) {
      console.error('Error processing referral:', error);
      toast({ title: 'Referral Error', description: 'Unexpected error', variant: 'destructive' });
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

  // Fetch levels
  useEffect(() => {
    const fetchLevels = async () => {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('requirement', { ascending: true });
      if (!error && data) setLevels(data);
    };
    fetchLevels();
  }, []);

  if (loadingUserInfo) {
    return (
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasUserInfo) {
    return (
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="shadow-glow">
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">{t('profile.noData') || 'No Profile Data'}</h2>
                <p className="text-muted-foreground mb-6">
                  {t('profile.noDataDesc') || 'Please complete your account information to view your profile.'}
                </p>
                <Button onClick={handleUpdateAccount} className="w-full">
                  {t('profile.updateAccount') || 'Update Account Information'}
                </Button>
      </CardContent>
    </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* User Info Card */}
          <Card className="shadow-glow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative">
                <Avatar className="w-24 h-24">
                    {getProfilePhotoUrl() ? (
                      <img 
                        src={getProfilePhotoUrl()!} 
                        alt="Profile" 
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <AvatarFallback className="text-2xl">
                        {getAvatarFallback()}
                  </AvatarFallback>
                    )}
                </Avatar>
                  <Button
                    onClick={handleUpdateAccount}
                    variant="outline"
                    size="sm"
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex-1 text-center md:text-right">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">
                        {userInfo?.first_name && userInfo?.last_name 
                          ? `${userInfo.first_name} ${userInfo.last_name}`
                          : userInfo?.email || 'User'}
                      </h1>
                      <p className="text-muted-foreground mb-2">{userInfo?.email}</p>
                      <p className="text-muted-foreground">{userInfo?.phone || ''}</p>
                    </div>
                    
                    <div className="flex flex-col items-center md:items-end gap-2">
                      <Badge className={userInfo?.verified ? 'bg-success' : 'bg-warning'}>
                        {userInfo?.verified ? t('profile.verified') : t('profile.pending')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {t('profile.memberSince')} {userInfo?.joinDate || ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dashboard Cards Row (now after user info, replaces balance card) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <Card className="bg-muted/40 border border-muted-foreground/10">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <span className="text-3xl font-bold text-green-500">$0</span>
                <span className="mt-2 text-sm text-muted-foreground">{t('profile.rewards') || 'Rewards'}</span>
              </CardContent>
            </Card>
            <Card className="bg-muted/40 border border-muted-foreground/10">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <span className="text-3xl font-bold text-green-500">$0</span>
                <span className="mt-2 text-sm text-muted-foreground">{t('profile.personalEarnings') || 'Personal Earnings'}</span>
              </CardContent>
            </Card>
            <Card className="bg-muted/40 border border-muted-foreground/10">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <span className="text-3xl font-bold text-green-500 break-words truncate text-balance max-w-full md:text-3xl sm:text-2xl text-xl">
                  {typeof userInfo?.balance === 'number' ? `$${userInfo.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0'}
                </span>
                <span className="mt-2 text-sm text-muted-foreground">{t('profile.capital') || 'Capital'}</span>
              </CardContent>
            </Card>
            <Card className="bg-muted/40 border border-muted-foreground/10">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <span className="text-3xl font-bold text-green-500">$0</span>
                <span className="mt-2 text-sm text-muted-foreground">{t('profile.teamEarnings') || 'Team Earnings'}</span>
              </CardContent>
            </Card>
            <Card className="bg-muted/40 border border-muted-foreground/10">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <span className="text-3xl font-bold text-green-500">$0</span>
                <span className="mt-2 text-sm text-muted-foreground">{t('profile.totalEarnings') || 'Total Earnings'}</span>
              </CardContent>
            </Card>
          </div>

          {/* Gamification: Level and Badges */}
          <Card className="shadow-glow">
              <CardHeader>
              <CardTitle>{t('profile.achievements') || 'Achievements'}</CardTitle>
              </CardHeader>
              <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Level */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">{t('profile.level') || 'Level'}</h3>
                  <div className="text-3xl font-bold text-primary mb-2">
                    {userInfo?.current_level || 1}
                  </div>
                  {(() => {
                    const levelObj = levels.find(lvl => lvl.level === userInfo?.current_level);
                    return levelObj ? (
                      <>
                        <div className="text-lg font-semibold mb-1">{levelObj.name}</div>
                        <div className="text-sm text-muted-foreground mb-1">{levelObj.description}</div>
                        {levelObj.benefits && (
                          <div className="text-sm text-green-500">{levelObj.benefits}</div>
                        )}
                      </>
                    ) : null;
                  })()}
                  <p className="text-sm text-muted-foreground">
                    {t('profile.levelDesc') || 'Your current level'}
                  </p>
                </div>

                {/* Badges */}
                    <div>
                  <h3 className="text-lg font-semibold mb-4">{t('profile.badges') || 'Badges'}</h3>
                  {userBadges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {userBadges.map((badge: any, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {badge.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('profile.noBadges') || 'No badges earned yet'}
                    </p>
                  )}
                    </div>
                  </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="shadow-glow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('profile.accountInfo') || 'Account Information'}</CardTitle>
                <Button onClick={handleUpdateAccount} variant="outline" size="sm">
                  {t('profile.edit') || 'Edit'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('profile.firstName')}
                    </label>
                    <p className="text-sm">{userInfo?.first_name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('profile.lastName')}
                    </label>
                    <p className="text-sm">{userInfo?.last_name || '-'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('profile.phone')}
                  </label>
                  <p className="text-sm">{userInfo?.phone || '-'}</p>
                </div>
                
                    <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('profile.wallet')}
                  </label>
                  <p className="text-sm">{userInfo?.wallet || '-'}</p>
                    </div>

                {/* Profile Photo */}
                {userInfo?.profile_photo_url && (
                    <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      {t('profile.profilePhoto') || 'Profile Photo'}
                    </label>
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <img 
                          src={getProfilePhotoUrl()!} 
                          alt="Profile" 
                          className="w-full h-full object-cover rounded-full"
                        />
                      </Avatar>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setModalImageUrl(getProfilePhotoUrl()!);
                          setShowImageModal(true);
                        }}
                      >
                        {t('profile.view') || 'View'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ID Photos */}
                {(userInfo?.id_front_url || userInfo?.id_back_url) && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      {t('profile.idPhotos') || 'ID Photos'}
                    </label>
                    <div className="flex gap-4">
                      {userInfo?.id_front_url && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {t('profile.idFront') || 'Front'}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setModalImageUrl(getImageUrl('front'));
                              setShowImageModal(true);
                            }}
                          >
                            {t('profile.view') || 'View'}
                          </Button>
                  </div>
                      )}
                      {userInfo?.id_back_url && (
                  <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {t('profile.idBack') || 'Back'}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setModalImageUrl(getImageUrl('back'));
                              setShowImageModal(true);
                            }}
                          >
                            {t('profile.view') || 'View'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                </div>
              </CardContent>
            </Card>

          {/* Image Modal */}
          <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
            <DialogContent>
              <img src={modalImageUrl} alt="Photo" className="max-w-full max-h-[80vh] mx-auto" />
            </DialogContent>
          </Dialog>

          {/* Referral Code Section */}
          {userUid && (
            <div className="mb-8">
              <ReferralCode
                userUid={userUid}
                isVerified={userInfo?.verified || false}
                level1Count={level1Referrals.length}
                level2Count={level2Referrals.length}
                level3Count={level3Referrals.length}
              />
                      </div>
          )}

        </div>
      </div>
    </div>
  );
}
