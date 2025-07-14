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
        .eq('user_uid', userUid);
      if (!error && data) {
        setUserBadges(data.map(row => row.badge));
      }
    };
    fetchBadges();
  }, [userUid]);

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
                    {userInfo?.level || 1}
                  </div>
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
              <ReferralCode userUid={userUid} isVerified={userInfo?.verified || false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
