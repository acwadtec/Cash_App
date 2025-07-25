
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    referralCode: '',
    passwordConfirm: '',
  });
  const [referrerInfo, setReferrerInfo] = useState<any>(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

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
          title: t('register.invalidReferralCode'),
          description: t('register.invalidReferralCodeDesc'),
          variant: 'destructive',
        });
        setFormData(prev => ({ ...prev, referralCode: '' }));
      } else if (!data.verified) {
        toast({
          title: t('register.unverifiedReferralCode'),
          description: t('register.unverifiedReferralCodeDesc'),
          variant: 'destructive',
        });
        setFormData(prev => ({ ...prev, referralCode: '' }));
      } else {
        setReferrerInfo(data);
        toast({
          title: t('register.validReferralCode'),
          description: t('register.validReferralCodeDesc').replace('{name}', `${data.first_name} ${data.last_name}`),
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
    if (formData.password !== formData.passwordConfirm) {
      toast({
        title: t('common.error'),
        description: t('register.passwordsDontMatch'),
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
    
    // Set login status and redirect to update account page to complete profile
    localStorage.setItem('cash-logged-in', 'true');
    navigate('/update-account');
  };

  const processReferral = async (newUserId: string, referralCode: string) => {
    try {
      // Get referrer info (Level 1)
      const { data: referrerData, error: referrerError } = await supabase
        .from('user_info')
        .select('user_uid, referral_count, total_referral_points, referred_by')
        .eq('referral_code', referralCode)
        .single();

      if (referrerError || !referrerData) {
        console.error('Error getting referrer data:', referrerError);
        return;
      }

      // Get referral settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('referral_settings')
        .select('level1_points, level2_points, level3_points')
        .eq('id', 1)
        .single();

      if (settingsError || !settingsData) {
        console.error('Error getting referral settings:', settingsError);
        return;
      }

      // Award Level 1 points
      const pointsToAwardL1 = settingsData.level1_points || 100;
      const newReferralCountL1 = (referrerData.referral_count || 0) + 1;
      const newTotalPointsL1 = (referrerData.total_referral_points || 0) + pointsToAwardL1;
      await supabase
        .from('user_info')
        .update({
          referral_count: newReferralCountL1,
          total_referral_points: newTotalPointsL1
        })
        .eq('user_uid', referrerData.user_uid);
      // Record the Level 1 referral
      await supabase
        .from('referrals')
        .insert([{
          referrer_uid: referrerData.user_uid,
          referred_uid: newUserId,
          level: 1,
          points_earned: pointsToAwardL1,
          referral_code: referralCode
        }]);

      // Award Level 2 points if the direct referrer was also referred by someone
      if (referrerData.referred_by) {
        // Get Level 2 referrer info
        const { data: referrer2Data, error: referrer2Error } = await supabase
          .from('user_info')
          .select('user_uid, referral_count, total_referral_points, referred_by')
          .eq('referral_code', referrerData.referred_by)
          .single();
        if (!referrer2Error && referrer2Data) {
          const pointsToAwardL2 = settingsData.level2_points || 50;
          const newReferralCountL2 = (referrer2Data.referral_count || 0) + 1;
          const newTotalPointsL2 = (referrer2Data.total_referral_points || 0) + pointsToAwardL2;
          await supabase
            .from('user_info')
            .update({
              referral_count: newReferralCountL2,
              total_referral_points: newTotalPointsL2
            })
            .eq('user_uid', referrer2Data.user_uid);
          // Record the Level 2 referral
          await supabase
            .from('referrals')
            .insert([{
              referrer_uid: referrer2Data.user_uid,
              referred_uid: newUserId,
              level: 2,
              points_earned: pointsToAwardL2,
              referral_code: referrerData.referred_by
            }]);

          // Award Level 3 points if Level 2 referrer was also referred by someone
          if (referrer2Data.referred_by) {
            const { data: referrer3Data, error: referrer3Error } = await supabase
              .from('user_info')
              .select('user_uid, referral_count, total_referral_points')
              .eq('referral_code', referrer2Data.referred_by)
              .single();
            if (!referrer3Error && referrer3Data) {
              const pointsToAwardL3 = settingsData.level3_points || 25;
              const newReferralCountL3 = (referrer3Data.referral_count || 0) + 1;
              const newTotalPointsL3 = (referrer3Data.total_referral_points || 0) + pointsToAwardL3;
              await supabase
                .from('user_info')
                .update({
                  referral_count: newReferralCountL3,
                  total_referral_points: newTotalPointsL3
                })
                .eq('user_uid', referrer3Data.user_uid);
              // Record the Level 3 referral
              await supabase
                .from('referrals')
                .insert([{
                  referrer_uid: referrer3Data.user_uid,
                  referred_uid: newUserId,
                  level: 3,
                  points_earned: pointsToAwardL3,
                  referral_code: referrer2Data.referred_by
                }]);
            }
          }
        }
      }

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
    <div className="min-h-screen py-20 bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
      <div className="container mx-auto px-4 relative">
        <Card className="max-w-2xl mx-auto shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
          <CardHeader className="relative text-center pb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary to-purple-600 p-1">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <div className="text-3xl">👤</div>
              </div>
            </div>
            <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('register.title')}
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Join our community and start earning today
            </p>
          </CardHeader>
          <CardContent className="relative px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm font-medium text-muted-foreground">
                  {t('register.displayName')}
                </Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  required
                  className="h-12 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 focus:border-primary/50 transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                  {t('register.email')}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="h-12 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 focus:border-primary/50 transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                  {t('register.password')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="h-12 pr-10 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 focus:border-primary/50 transition-all duration-300"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-primary transition-colors duration-300"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm" className="text-sm font-medium text-muted-foreground">
                  {t('register.passwordConfirm')}
                </Label>
                <div className="relative">
                  <Input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    value={formData.passwordConfirm}
                    onChange={handleInputChange}
                    required
                    className="h-12 pr-10 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 focus:border-primary/50 transition-all duration-300"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-primary transition-colors duration-300"
                    tabIndex={-1}
                    onClick={() => setShowPasswordConfirm((v) => !v)}
                  >
                    {showPasswordConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              {/* Enhanced Referral Code Field */}
              <div className="space-y-2">
                <Label htmlFor="referralCode" className="text-sm font-medium text-muted-foreground">
                  {t('register.referralCode')} <span className="text-xs text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="referralCode"
                  name="referralCode"
                  type="text"
                  value={formData.referralCode}
                  onChange={handleReferralCodeChange}
                  placeholder={t('register.referralCode')}
                  className="h-12 uppercase bg-gradient-to-r from-primary/5 to-transparent border-primary/20 focus:border-primary/50 transition-all duration-300"
                  maxLength={8}
                />
                {loadingReferrer && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                    {t('register.checkingReferral')}
                  </div>
                )}
                {referrerInfo && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <div className="text-white text-xs">✓</div>
                      </div>
                      <p className="text-sm text-green-700 font-medium">
                        {t('register.referredBy')}: <strong>{referrerInfo.first_name} {referrerInfo.last_name}</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-lg bg-gradient-to-r from-primary to-purple-600 border-0 text-white hover:scale-105 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:shadow-2xl active:scale-95 font-bold"
              >
                {t('register.submit')}
              </Button>
            </form>
            <div className="mt-8 text-center">
              <p className="text-muted-foreground">
                {t('register.hasAccount')}{' '}
                <a 
                  href="/login" 
                  className="text-primary hover:text-primary/80 font-medium transition-colors duration-300 hover:scale-105 inline-block"
                >
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
