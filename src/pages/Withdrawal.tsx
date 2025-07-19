
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVerificationGuard } from '@/components/VerificationGuard';
import { toast } from '@/hooks/use-toast';
import { Shield, AlertTriangle, Clock, Package, History, XCircle, CheckCircle, Hourglass, DollarSign, Star, Gift, Users } from 'lucide-react';
import { supabase, checkIfUserIsAdmin } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useUserBalances } from '@/hooks/useUserBalance';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface WithdrawalSettings {
  timeSlots: string[];
  packageLimits: Record<string, { min: number; max: number; daily: number; limit_activated_at?: string }>;
}

interface WithdrawalRequest {
  id: string;
  type: string;
  amount: number;
  method: string;
  accountDetails: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: string;
  rejectionReason?: string;
  adminNote?: string;
  proofImageUrl?: string;
}

// Animated count-up utility
function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    function animate() {
      const now = Date.now();
      const elapsed = now - startTime;
      if (elapsed < duration) {
        setValue(Math.floor(start + (target - start) * (elapsed / duration)));
        requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    }
    animate();
    // eslint-disable-next-line
  }, [target, duration]);
  return value;
}

export default function Withdrawal() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { requireVerification } = useVerificationGuard();
  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    method: '',
    accountDetails: '',
  });
  const [settings, setSettings] = useState<WithdrawalSettings>({
    timeSlots: [],
    packageLimits: {}
  });
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userPackage, setUserPackage] = useState('basic'); // This should come from user profile
  const [showAlert, setShowAlert] = useState(false);
  const { balances, loading: loadingBalances } = useUserBalances();
  // Calculate balance as the sum of personal_earnings, team_earnings, and bonuses
  const balance = balances
    ? balances.personal_earnings + balances.team_earnings + balances.bonuses
    : 0;

  const withdrawalTypes = [
    {
      value: 'balance',
      label: t('profile.balance'),
      icon: DollarSign,
      color: 'text-green-400',
      amount: balances?.balance ?? 0,
      unit: 'EGP',
    },
    {
      value: 'bonuses',
      label: t('profile.bonuses'),
      icon: Gift,
      color: 'text-yellow-400',
      amount: balances?.bonuses ?? 0,
      unit: 'EGP',
    },
    {
      value: 'team_earnings',
      label: t('profile.teamEarnings'),
      icon: Users,
      color: 'text-purple-400',
      amount: balances?.team_earnings ?? 0,
      unit: 'EGP',
    },
  ];

  const withdrawalMethods = [
    { value: 'bank', label: t('withdrawal.bank') },
    { value: 'wallet', label: t('withdrawal.wallet') },
    { value: 'crypto', label: t('withdrawal.crypto') },
  ];

  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');

  // Check if current time is within allowed time slots
  const isWithinTimeSlot = () => {
    if (settings.timeSlots.length === 0) return true; // If no time slots set, allow all times
    
    const currentHour = currentTime.getHours();
    const currentDay = currentTime.getDay();
    
    return settings.timeSlots.some(slot => {
      const [day, startHour, endHour] = slot.split(':').map(Number);
      return day === currentDay && currentHour >= startHour && currentHour < endHour;
    });
  };

  // Check package limits
  const checkPackageLimits = (amount: number) => {
    const packageLimit = settings.packageLimits[userPackage];
    if (!packageLimit) return { valid: true, message: '' };

    if (amount < packageLimit.min) {
      return { 
        valid: false, 
        message: t('withdrawal.error.minAmount') 
          .replace('${min}', `${packageLimit.min}`)
      };
    }

    if (amount > packageLimit.max) {
      return { 
        valid: false, 
        message: t('withdrawal.error.maxAmount') 
          .replace('${max}', `${packageLimit.max}`)
      };
    }

    // Check daily limit (calendar day reset, but only after limit_activated_at if present)
    let todayWithdrawals = withdrawalHistory.filter(w => 
      (w.status === 'pending' || w.status === 'approved' || w.status === 'paid') &&
      new Date(w.createdAt).toDateString() === new Date().toDateString()
    );
    if (packageLimit && packageLimit.limit_activated_at) {
      const activatedAt = new Date(packageLimit.limit_activated_at).getTime();
      todayWithdrawals = todayWithdrawals.filter(w => {
        const withdrawalTime = new Date(w.createdAt).getTime();
        return withdrawalTime >= activatedAt;
      });
    }
    const todayTotal = todayWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    const remaining = packageLimit.daily - todayTotal;
    // Block if the user has already reached the daily limit
    if (todayTotal >= packageLimit.daily) {
      return {
        valid: false,
        message: t('withdrawal.error.dailyLimit')
          .replace('${daily}', `${packageLimit.daily}`)
          .replace('${used}', `${todayTotal}`)
          .replace('${remaining}', `0`)
      };
    }
    // Block if this withdrawal would cause the total to exceed the daily limit
    if (amount > remaining) {
      return {
        valid: false,
        message: t('withdrawal.error.dailyLimit')
          .replace('${daily}', `${packageLimit.daily}`)
          .replace('${used}', `${todayTotal}`)
          .replace('${remaining}', `${remaining}`)
      };
    }

    return { valid: true, message: '' };
  };

  // Helper to map withdrawal fields
  function mapWithdrawalFields(w) {
    return {
      ...w,
      adminNote: w.admin_note,
      rejectionReason: w.rejection_reason,
      proofImageUrl: w.proof_image_url,
      createdAt: w.created_at,
    };
  }

  // Helper to check if all offers are past their deadline
  const [offers, setOffers] = useState<any[]>([]);
  useEffect(() => {
    const fetchOffers = async () => {
      const { data } = await supabase.from('offers').select('deadline').eq('active', true);
      setOffers(data || []);
    };
    fetchOffers();
  }, []);
  const isAfterAllDeadlines = () => {
    if (!offers.length) return true; // Allow withdrawal if no offers
    const now = new Date();
    return offers.every(o => o.deadline && new Date(o.deadline) < now);
  };

  // Function to format time slots for user display
  const formatTimeSlotsForUser = () => {
    if (!settings.timeSlots || settings.timeSlots.length === 0) {
      return 'No time restrictions';
    }
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const formattedSlots = settings.timeSlots.map(slot => {
      const [day, start, end] = slot.split(':');
      const startHour = parseInt(start);
      const endHour = parseInt(end);
      const startAMPM = startHour >= 12 ? 'PM' : 'AM';
      const endAMPM = endHour >= 12 ? 'PM' : 'AM';
      const start12Hour = startHour === 0 ? 12 : startHour > 12 ? startHour - 12 : startHour;
      const end12Hour = endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour;
      
      return `${dayNames[parseInt(day)]} ${start12Hour} ${startAMPM} - ${end12Hour} ${endAMPM}`;
    });
    
    return formattedSlots.join(', ');
  };

  // Fetch user info and package on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Check if user has user_info data
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        let userPackageValue = 'basic';
        if (user) {
          // Check if user is admin
          const isAdmin = await checkIfUserIsAdmin(user.id);
          // Only check user_info for non-admin users
          if (!isAdmin) {
            // Fetch wallet and phone as well
            const { data: userInfo } = await supabase
              .from('user_info')
              .select('user_uid, package, wallet, phone')
              .eq('user_uid', user.id)
              .single();
            if (!userInfo) {
              setShowAlert(true);
              setTimeout(() => {
                navigate('/update-account');
              }, 3000);
              return;
            }
            if (userInfo.package) {
              userPackageValue = userInfo.package;
            }
            // Set formData defaults for method and accountDetails
            setFormData(prev => ({
              ...prev,
              method: userInfo.wallet || '',
              accountDetails: userInfo.phone || '',
            }));
          }
        }
        // Load withdrawal settings
        const { data: timeSlotsData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'withdrawal_time_slots')
          .single();
        const { data: packageLimitsData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'package_withdrawal_limits')
          .single();
        setSettings({
          timeSlots: timeSlotsData?.value || [],
          packageLimits: packageLimitsData?.value || {}
        });
        setUserPackage(userPackageValue);
        // Fetch withdrawal history from the database
        if (user) {
          const { data: withdrawalData, error: withdrawalError } = await supabase
            .from('withdrawal_requests')
            .select('*')
            .eq('user_uid', user.id)
            .order('created_at', { ascending: false });
          if (withdrawalError) {
            throw withdrawalError;
          }
          setWithdrawalHistory((withdrawalData || []).map(mapWithdrawalFields));
        }
      } catch (error) {
        console.error('Error loading withdrawal data:', error);
        toast({
          title: t('common.error'),
          description: t('withdrawal.error.loadData'),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [t, navigate]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check verification first
    const canProceed = requireVerification(() => {
      // This will only run if user is verified
      submitWithdrawalRequest();
    });
    
    if (!canProceed) {
      return; // User is not verified, alert already shown
    }
  };

  const submitWithdrawalRequest = async () => {
    setLoading(true);
    if (!formData.type || !formData.amount || !formData.method) {
      toast({
        title: t('common.error'),
        description: t('register.required'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Check time slot
    if (!isWithinTimeSlot()) {
      toast({
        title: t('withdrawal.error.timeSlot'),
        description: t('withdrawal.error.timeSlotMessage'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const selectedType = withdrawalTypes.find(t => t.value === formData.type);
    const amount = parseFloat(formData.amount);
    
    if (selectedType && amount > selectedType.balance) {
      toast({
        title: t('withdrawal.error.amount'),
        description: t('withdrawal.error.amountMessage'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Check package limits (use correct userPackage)
    const limitCheck = checkPackageLimits(amount);
    console.log('User wants to withdraw:', amount);
    if (!limitCheck.valid) {
      console.log('Withdrawal result: ERROR:', limitCheck.message);
      toast({
        title: t('withdrawal.error.limit'),
        description: limitCheck.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    console.log('Withdrawal result: SUCCESS');

    // Check max withdrawal amount
    if (amount > 6000) {
      toast({
        title: t('withdrawal.error.maxAmount'),
        description: t('withdrawal.maxWithdrawalLimit'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      toast({
        title: t('common.error'),
        description: t('withdrawal.userNotAuthenticated'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    // Fetch user info
    const { data: userInfo } = await supabase
      .from('user_info')
      .select('first_name, last_name, phone, wallet')
      .eq('user_uid', user.id)
      .single();
    // Fetch available offers (customize as needed)
    const { data: offersData } = await supabase
      .from('offers')
      .select('title')
      .eq('active', true);
    const availableOffers = offersData ? offersData.map(o => o.title).join(', ') : '';
    const { error: insertError } = await supabase
      .from('withdrawal_requests')
      .insert([
        {
          user_uid: user.id,
          user_name: userInfo ? `${userInfo.first_name} ${userInfo.last_name}` : '',
          phone_number: userInfo?.phone || '',
          wallet_type: userInfo?.wallet || '',
          available_offers: availableOffers,
      type: formData.type,
          amount: parseFloat(formData.amount),
      method: formData.method,
          account_details: formData.accountDetails,
      status: 'pending',
        },
      ]);
    if (insertError) {
      toast({
        title: t('common.error'),
        description: insertError.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    toast({
      title: t('common.success'),
      description: t('withdrawal.success.message'),
    });
    // Refresh withdrawal history
    const { data: withdrawalData, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_uid', user.id)
      .order('created_at', { ascending: false });
    if (!withdrawalError) {
      setWithdrawalHistory((withdrawalData || []).map(mapWithdrawalFields));
      // Print the created_at time of the most recent withdrawal, the current local time, and the limit_activated_at time
      if (withdrawalData && withdrawalData.length > 0) {
        const latest = withdrawalData[0];
        console.log('Supabase created_at:', latest.created_at);
        console.log('Local time:', new Date().toISOString());
        const packageLimit = settings.packageLimits[userPackage];
        if (packageLimit && packageLimit.limit_activated_at) {
          console.log('Limit activated at:', packageLimit.limit_activated_at);
        }
      }
    }
    // Reset form
    setFormData(prev => ({
      ...prev,
      type: '',
      amount: '',
    }));
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'pending': return <Hourglass className="w-4 h-4 text-yellow-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const balanceCount = useCountUp(balances?.balance ?? 0);
  const pointsCount = useCountUp(balances?.total_points ?? 0);
  const bonusesCount = useCountUp(balances?.bonuses ?? 0);
  const teamEarningsCount = useCountUp(balances?.team_earnings ?? 0);

  return (
    <div className="min-h-screen py-20">
      {/* Alert for incomplete account information */}
      {showAlert && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {t('common.completeProfile')}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold mb-4">{t('withdrawal.title')}</h1>
            <p className="text-base md:text-xl text-muted-foreground px-4">
              {t('withdrawal.subtitle')}
            </p>
          </div>

          <Tabs defaultValue="request" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="request" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {t('withdrawal.newRequest')}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                {t('withdrawal.history')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="request">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Withdrawal Form */}
                <div className="lg:col-span-2">
                  <Card className="shadow-glow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        {t('withdrawal.newRequest')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Time Slot Warning */}
                      {!isWithinTimeSlot() && (
                        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800">
                            <div>
                              <p className="font-semibold mb-2">{t('withdrawal.error.timeSlotMessage')}</p>
                              <p className="text-sm">
                                <strong>Available withdrawal times:</strong> {formatTimeSlotsForUser()}
                              </p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Package Limits Info */}
                      {settings.packageLimits[userPackage] && (
                        <Alert className="mb-6 border-blue-200 bg-blue-50">
                          <Package className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-800">
                            {t('withdrawal.packageLimits')
                              .replace('${min}', `${settings.packageLimits[userPackage].min}`)
                              .replace('${max}', `${settings.packageLimits[userPackage].max}`)
                              .replace('${daily}', `${settings.packageLimits[userPackage].daily}`)
                            }
                            <div className="mt-2 text-xs text-blue-700">
                              <strong>Note:</strong> Daily withdrawal limit resets at midnight (00:00).
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="type">{t('withdrawal.type')}</Label>
                          <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)}>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder={t('withdrawal.selectType')} />
                            </SelectTrigger>
                            <SelectContent>
                              {withdrawalTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label} ({type.amount.toLocaleString()} EGP)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="amount">{t('withdrawal.amount')}</Label>
                          <Input
                            id="amount"
                            name="amount"
                            type="number"
                            placeholder={t('withdrawal.amount')}
                            value={formData.amount}
                            onChange={handleInputChange}
                            className="h-12"
                            min="1"
                            step="0.01"
                          />
                          {formData.type && (
                            <p className="text-sm text-muted-foreground">
                              {t('withdrawal.maxAmount')} {withdrawalTypes.find(t => t.value === formData.type)?.amount.toLocaleString()} EGP
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="method">{t('withdrawal.method')}</Label>
                          <div
                            className="h-12 flex items-center px-3 rounded-md bg-gray-100 border border-input text-base text-gray-900"
                            style={{ minHeight: '3rem' }}
                          >
                            {formData.method || <span className="text-gray-400">{t('withdrawal.placeholder')}</span>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="accountDetails">{t('withdrawal.accountDetails')}</Label>
                          <div
                            className="h-12 flex items-center px-3 rounded-md bg-gray-100 border border-input text-base text-gray-900"
                            style={{ minHeight: '3rem' }}
                          >
                            {formData.accountDetails || <span className="text-gray-400">{t('withdrawal.placeholder')}</span>}
                          </div>
                        </div>

                        <Alert>
                          <Shield className="h-4 w-4" />
                          <AlertDescription>
                            {t('withdrawal.warning')}
                          </AlertDescription>
                        </Alert>

                        <Button 
                          type="submit" 
                          className="w-full h-12 text-lg shadow-glow transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95"
                          disabled={!isWithinTimeSlot() || loading}
                        >
                          {loading ? t('common.loading') : t('withdrawal.submit')}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                {/* Balance Summary */}
                <div className="space-y-6">
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle>{t('withdrawal.balances')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-6 my-6">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="rounded-2xl p-6 flex flex-row items-center gap-4 border border-zinc-800 bg-gradient-to-br from-green-900/40 to-green-800/10 shadow-lg transition-transform hover:scale-105 hover:shadow-green-500/40 hover:ring-2 hover:ring-green-400/40 group cursor-pointer relative overflow-hidden">
                              <DollarSign className="w-10 h-10 text-green-400 drop-shadow-lg group-hover:scale-110 transition-transform" />
                              <div>
                                <div className="text-3xl font-extrabold text-green-400 drop-shadow animate-pulse">{balanceCount} EGP</div>
                                <div className="text-muted-foreground mt-1 text-base font-medium tracking-wide">{t('profile.balance')}</div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Wallet balance available for withdrawal and offers.</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="rounded-2xl p-6 flex flex-row items-center gap-4 border border-zinc-800 bg-gradient-to-br from-blue-900/40 to-blue-800/10 shadow-lg transition-transform hover:scale-105 hover:shadow-blue-500/40 hover:ring-2 hover:ring-blue-400/40 group cursor-pointer relative overflow-hidden">
                              <Star className="w-10 h-10 text-blue-400 drop-shadow-lg group-hover:scale-110 transition-transform" />
                              <div>
                                <div className="text-3xl font-extrabold text-blue-400 drop-shadow animate-pulse">{pointsCount}</div>
                                <div className="text-muted-foreground mt-1 text-base font-medium tracking-wide">{t('profile.totalPoints')}</div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Total points earned from referrals and activities.</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="rounded-2xl p-6 flex flex-row items-center gap-4 border border-zinc-800 bg-gradient-to-br from-yellow-900/40 to-yellow-800/10 shadow-lg transition-transform hover:scale-105 hover:shadow-yellow-500/40 hover:ring-2 hover:ring-yellow-400/40 group cursor-pointer relative overflow-hidden">
                              <Gift className="w-10 h-10 text-yellow-400 drop-shadow-lg group-hover:scale-110 transition-transform" />
                              <div>
                                <div className="text-3xl font-extrabold text-yellow-400 drop-shadow animate-pulse">{bonusesCount} EGP</div>
                                <div className="text-muted-foreground mt-1 text-base font-medium tracking-wide">{t('profile.bonuses')}</div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Bonuses awarded for achievements and promotions.</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="rounded-2xl p-6 flex flex-row items-center gap-4 border border-zinc-800 bg-gradient-to-br from-purple-900/40 to-purple-800/10 shadow-lg transition-transform hover:scale-105 hover:shadow-purple-500/40 hover:ring-2 hover:ring-purple-400/40 group cursor-pointer relative overflow-hidden">
                              <Users className="w-10 h-10 text-purple-400 drop-shadow-lg group-hover:scale-110 transition-transform" />
                              <div>
                                <div className="text-3xl font-extrabold text-purple-400 drop-shadow animate-pulse">{teamEarningsCount} EGP</div>
                                <div className="text-muted-foreground mt-1 text-base font-medium tracking-wide">{t('profile.teamEarnings')}</div>
                        </div>
                          </div>
                          </TooltipTrigger>
                          <TooltipContent>Team earnings from your referral network.</TooltipContent>
                        </Tooltip>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="gradient-card shadow-glow">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-4">{t('withdrawal.verificationStatus')}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span>{t('profile.emailVerification')}</span>
                          <Badge className="bg-success">✓</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>{t('profile.phoneVerification')}</span>
                          <Badge className="bg-success">✓</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>{t('profile.identityVerification')}</span>
                          <Badge className="bg-success">✓</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">
                        {t('withdrawal.eligible')}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    {t('withdrawal.history')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">{t('common.loading')}</div>
                  ) : withdrawalHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t('withdrawal.noHistory')}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('withdrawal.history.id')}</TableHead>
                          <TableHead>{t('withdrawal.history.type')}</TableHead>
                          <TableHead>{t('withdrawal.history.amount')}</TableHead>
                          <TableHead>{t('withdrawal.history.method')}</TableHead>
                          <TableHead>{t('withdrawal.history.status')}</TableHead>
                          <TableHead>{t('withdrawal.history.date')}</TableHead>
                          <TableHead>{t('withdrawal.history.details')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawalHistory.map((withdrawal) => (
                          <TableRow key={withdrawal.id}>
                            <TableCell className="font-mono text-sm">
                              #{withdrawal.id}
                            </TableCell>
                            <TableCell>
                              {withdrawalTypes.find(t => t.value === withdrawal.type)?.label || withdrawal.type}
                            </TableCell>
                            <TableCell className="font-bold">
                              ${withdrawal.amount.toLocaleString()} EGP
                            </TableCell>
                            <TableCell>
                              {withdrawalMethods.find(m => m.value === withdrawal.method)?.label || withdrawal.method}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(withdrawal.status)}
                                <Badge className={getStatusColor(withdrawal.status)}>
                                  {t(`withdrawal.status.${withdrawal.status}`)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(withdrawal.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {withdrawal.rejectionReason && (
                                <div className="text-sm text-red-600 mb-1">
                                  <strong>{t('withdrawal.rejectionReason')}:</strong> {withdrawal.rejectionReason}
                                </div>
                              )}
                              {withdrawal.adminNote && (
                                <div className="text-sm text-green-600 mb-1">
                                  <strong>{t('withdrawal.adminNote')}:</strong> {withdrawal.adminNote}
                                </div>
                              )}
                              {withdrawal.status === 'paid' && withdrawal.proofImageUrl && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-1 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95"
                                  onClick={() => { setModalImageUrl(withdrawal.proofImageUrl); setShowImageModal(true); }}
                                >
                                  {t('withdrawal.viewProof')}
                                </Button>
                              )}
                              {!withdrawal.rejectionReason && !withdrawal.adminNote && !(withdrawal.status === 'paid' && withdrawal.proofImageUrl) && (
                                <span className="text-muted-foreground">{t('withdrawal.noDetails')}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal for proof image */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-background p-4 rounded shadow-lg max-w-lg w-full flex flex-col items-center">
            <img src={modalImageUrl} alt="Proof" className="max-h-[70vh] max-w-full mb-4 rounded" />
            <Button onClick={() => setShowImageModal(false)} className="transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95">
              {t('common.close')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
