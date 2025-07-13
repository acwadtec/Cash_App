
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Register() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    referralCode: '',
  });
  const [referrerInfo, setReferrerInfo] = useState<any>(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('cash-logged-in')) {
      navigate('/profile');
    }
  }, [navigate]);

  // Load referral code from URL if present
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referralCode: refCode }));
      checkReferralCode(refCode);
    }
  }, [searchParams]);

  const checkReferralCode = async (code: string) => {
    setLoadingReferrer(true);
    try {
      const { data, error } = await supabase
        .from('user_info')
        .select('first_name, last_name, email, verified')
        .eq('referral_code', code)
        .single();

      if (error || !data) {
        toast({
          title: 'Invalid Referral Code',
          description: 'The referral code you entered is not valid.',
          variant: 'destructive',
        });
        setFormData(prev => ({ ...prev, referralCode: '' }));
      } else if (!data.verified) {
        toast({
          title: 'Invalid Referral Code',
          description: 'The referral code belongs to an unverified account.',
          variant: 'destructive',
        });
        setFormData(prev => ({ ...prev, referralCode: '' }));
      } else {
        setReferrerInfo(data);
        toast({
          title: 'Valid Referral Code',
          description: `You'll be referred by ${data.first_name} ${data.last_name}`,
        });
      }
    } catch (error) {
      console.error('Error checking referral code:', error);
    } finally {
      setLoadingReferrer(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReferralCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, referralCode: code }));
    
    if (code.length >= 3) {
      checkReferralCode(code);
    } else {
      setReferrerInfo(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName || !formData.email || !formData.password) {
      toast({
        title: t('common.error'),
        description: t('register.required'),
        variant: 'destructive',
      });
      return;
    }

    // Validate referral code if provided
    if (formData.referralCode && !referrerInfo) {
      toast({
        title: t('common.error'),
        description: t('register.error.invalidReferral'),
        variant: 'destructive',
      });
      return;
    }

    // Supabase sign up
    const { data: authData, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          displayName: formData.displayName,
        },
      },
    });

    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // If registration successful and referral code provided, store it in localStorage for later processing
    if (authData.user && formData.referralCode && referrerInfo) {
      localStorage.setItem('pendingReferralCode', formData.referralCode);
    }

    toast({
      title: t('common.success'),
      description: t('register.success'),
    });
    navigate('/login');
  };

  const processReferral = async (newUserId: string, referralCode: string) => {
    try {
      // Get referrer info
      const { data: referrerData, error: referrerError } = await supabase
        .from('user_info')
        .select('user_uid, referral_count, total_referral_points')
        .eq('referral_code', referralCode)
        .single();

      if (referrerError || !referrerData) {
        console.error('Error getting referrer data:', referrerError);
        return;
      }

      // Get referral settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('referral_settings')
        .select('level1_points')
        .eq('id', 1)
        .single();

      if (settingsError || !settingsData) {
        console.error('Error getting referral settings:', settingsError);
        return;
      }

      const pointsToAward = settingsData.level1_points || 100;

      // Update referrer's stats
      const newReferralCount = (referrerData.referral_count || 0) + 1;
      const newTotalPoints = (referrerData.total_referral_points || 0) + pointsToAward;

      await supabase
        .from('user_info')
        .update({
          referral_count: newReferralCount,
          total_referral_points: newTotalPoints
        })
        .eq('user_uid', referrerData.user_uid);

      // Record the referral
      await supabase
        .from('referrals')
        .insert([{
          referrer_uid: referrerData.user_uid,
          referred_uid: newUserId,
          level: 1,
          points_earned: pointsToAward,
          referral_code: referralCode
        }]);

      // Update new user's referred_by field
      await supabase
        .from('user_info')
        .update({ referred_by: referralCode })
        .eq('user_uid', newUserId);

    } catch (error) {
      console.error('Error processing referral:', error);
    }
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto shadow-glow">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
              {t('register.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t('register.displayName') || 'Display Name'}</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('register.email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('register.password') || t('login.password') || 'Password'}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="h-12"
                />
              </div>
              
              {/* Referral Code Field */}
              <div className="space-y-2">
                <Label htmlFor="referralCode">{t('register.referralCode')}</Label>
                <Input
                  id="referralCode"
                  name="referralCode"
                  type="text"
                  value={formData.referralCode}
                  onChange={handleReferralCodeChange}
                  placeholder={t('register.referralCode')}
                  className="h-12 uppercase"
                  maxLength={8}
                />
                {loadingReferrer && (
                  <p className="text-sm text-muted-foreground">{t('register.checkingReferral')}</p>
                )}
                {referrerInfo && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ {t('register.referredBy')}: <strong>{referrerInfo.first_name} {referrerInfo.last_name}</strong>
                    </p>
                  </div>
                )}
              </div>
              
              <Button type="submit" className="w-full h-12 text-lg shadow-glow">
                {t('register.submit')}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {t('register.hasAccount')}{' '}
                <a href="/login" className="text-primary hover:underline font-medium">
                  {t('register.login')}
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
