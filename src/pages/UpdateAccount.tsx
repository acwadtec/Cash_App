import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Camera, X } from 'lucide-react';

export default function UpdateAccount() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const form = useForm();
  const [uploading, setUploading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [userUid, setUserUid] = useState<string | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    const checkUserInfo = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        navigate('/login');
        return;
      }
      const user = userData.user;
      setUserUid(user.id);
      
      // Check if user already has info in user_info table
      const { data, error } = await supabase
        .from('user_info')
        .select('*')
        .eq('user_uid', user.id)
        .single();
      
      if (data) {
        // User already has info, redirect to profile
        navigate('/profile');
        return;
      }
    };
    checkUserInfo();
  }, [navigate]);

  // Helper to get image URL from storage path
  const getImageUrl = (type: 'front' | 'back') => {
    if (!userUid) return '';
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
    return supabase.storage.from('id-photos').getPublicUrl(path).data.publicUrl;
  };

  // Handle profile photo preview
  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove profile photo preview
  const removeProfilePhoto = () => {
    setProfilePhotoPreview(null);
    form.setValue('profilePhoto', null);
  };

  const onSubmit = async (data: any) => {
    if (!userUid) return;
    
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) throw new Error('User not found');

      // Upload profile photo if provided
      let profilePhotoUrl = '';
      if (data.profilePhoto && data.profilePhoto[0]) {
        const file = data.profilePhoto[0];
        const fileName = `profile_${Date.now()}.${file.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-photos')
          .upload(`${user.id}/${fileName}`, file);
        if (uploadError) throw uploadError;
        profilePhotoUrl = uploadData.path;
      }

      // Upload ID photos if provided
      let idFrontUrl = '';
      let idBackUrl = '';

      if (data.idFront && data.idFront[0]) {
        const file = data.idFront[0];
        const fileName = `front_${Date.now()}.${file.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-photos')
          .upload(`${user.id}/${fileName}`, file);
        if (uploadError) throw uploadError;
        idFrontUrl = uploadData.path;
      }

      if (data.idBack && data.idBack[0]) {
        const file = data.idBack[0];
        const fileName = `back_${Date.now()}.${file.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-photos')
          .upload(`${user.id}/${fileName}`, file);
        if (uploadError) throw uploadError;
        idBackUrl = uploadData.path;
      }

      const { error } = await supabase.from('user_info').insert([
        {
          user_uid: user.id,
          email: user.email,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          wallet: data.wallet,
          profile_photo_url: profilePhotoUrl,
          id_front_url: idFrontUrl,
          id_back_url: idBackUrl,
          role: 'user',
        },
      ]);
      if (error) throw error;

      // Process referral if pending
      const pendingReferralCode = localStorage.getItem('pendingReferralCode');
      if (pendingReferralCode) {
        await processReferral(user.id, pendingReferralCode);
        localStorage.removeItem('pendingReferralCode');
      }
      
      toast({ title: t('common.success'), description: 'تم حفظ البيانات بنجاح' });
      form.reset();
      
      // Redirect to home page after successful update
      navigate('/');
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message || 'حدث خطأ أثناء الحفظ' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-glow">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
                {t('updateAccount.title') || 'Update Account Information'}
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                {t('updateAccount.subtitle') || 'Please complete your account information to continue'}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Profile Photo Section */}
                <div className="text-center">
                  <label className="block text-sm font-medium mb-4">
                    {t('profile.profilePhoto') || 'Profile Photo'}
                  </label>
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <Avatar className="w-24 h-24">
                        {profilePhotoPreview ? (
                          <img 
                            src={profilePhotoPreview} 
                            alt="Profile Preview" 
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <AvatarFallback className="text-2xl">
                            <Camera className="w-8 h-8" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {profilePhotoPreview && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                          onClick={removeProfilePhoto}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="w-full max-w-xs">
                      <Input
                        type="file"
                        accept="image/*"
                        {...form.register('profilePhoto')}
                        onChange={handleProfilePhotoChange}
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('profile.firstName')}
                    </label>
                    <Input
                      {...form.register('firstName', { required: true })}
                      placeholder={t('profile.firstName')}
                      className="h-12"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('profile.lastName')}
                    </label>
                    <Input
                      {...form.register('lastName', { required: true })}
                      placeholder={t('profile.lastName')}
                      className="h-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('profile.phone')}
                  </label>
                  <Input
                    {...form.register('phone', { required: true })}
                    placeholder={t('profile.phone')}
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('profile.wallet')}
                  </label>
                  <Select onValueChange={(value) => form.setValue('wallet', value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder={t('profile.selectWallet')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vodafone cash">Vodafone Cash</SelectItem>
                      <SelectItem value="etisalat cash">Etisalat Cash</SelectItem>
                      <SelectItem value="orange cash">Orange Cash</SelectItem>
                      <SelectItem value="we pay">We Pay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('profile.idFront')}
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      {...form.register('idFront')}
                      className="h-12"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('profile.idBack')}
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      {...form.register('idBack')}
                      className="h-12"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-lg shadow-glow"
                  disabled={uploading}
                >
                  {uploading ? t('common.loading') : t('updateAccount.submit') || 'Complete Registration'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper function to process referral (same as in Profile.tsx)
async function processReferral(newUserId: string, referralCode: string) {
  console.log('processReferral called', newUserId, referralCode);
  try {
    // Get referrer info
    const { data: referrerData, error: referrerError } = await supabase
      .from('user_info')
      .select('user_uid, referral_count, total_referral_points, email')
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
      .select('level1_points')
      .eq('id', 1)
      .single();
    console.log('settingsData', settingsData, settingsError);
    if (settingsError || !settingsData) {
      console.error('Error getting referral settings:', settingsError);
      toast({ title: 'Referral Error', description: 'Settings not found or error', variant: 'destructive' });
      return;
    }

    const pointsToAward = settingsData.level1_points || 100;

    // Update referrer's stats
    const newReferralCount = (referrerData.referral_count || 0) + 1;
    const newTotalPoints = (referrerData.total_referral_points || 0) + pointsToAward;
    const { error: updateError } = await supabase
      .from('user_info')
      .update({
        referral_count: newReferralCount,
        total_referral_points: newTotalPoints
      })
      .eq('user_uid', referrerData.user_uid);
    console.log('updateError', updateError);
    if (updateError) {
      console.error('Error updating referrer stats:', updateError);
      toast({ title: 'Referral Error', description: 'Failed to update referrer stats', variant: 'destructive' });
      return;
    }

    // Check for badge awards
    const { data: badges } = await supabase
      .from('badges')
      .select('*')
      .eq('type', 'referral');

    if (badges) {
      for (const badge of badges) {
        if (newReferralCount >= badge.requirement) {
          // Check if user already has this badge
          const { data: existingBadge } = await supabase
            .from('user_badges')
            .select('*')
            .eq('user_uid', referrerData.user_uid)
            .eq('badge_id', badge.id)
            .single();

          if (!existingBadge) {
            // Award the badge
            await supabase.from('user_badges').insert([
              { user_uid: referrerData.user_uid, badge_id: badge.id }
            ]);
          }
        }
      }
    }

    // Update user level based on total referral points
    const { data: levelData } = await supabase
      .from('levels')
      .select('*')
      .lte('requirement', newTotalPoints)
      .order('requirement', { ascending: false })
      .limit(1)
      .single();

    if (levelData) {
      const newLevel = levelData.level;
      await supabase.from('user_info').update({ level: newLevel }).eq('user_uid', referrerData.user_uid);
    }

    // Record the referral
    const { error: insertError } = await supabase
      .from('referrals')
      .insert([{
        referrer_uid: referrerData.user_uid,
        referred_uid: newUserId,
        level: 1,
        points_earned: pointsToAward,
        referral_code: referralCode
      }]);
    console.log('insertError', insertError);
    if (insertError) {
      console.error('Error inserting referral record:', insertError);
      toast({ title: 'Referral Error', description: 'Failed to record referral', variant: 'destructive' });
      return;
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