
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

  // Check if user has already made a withdrawal request today
  const hasWithdrawalToday = () => {
    const today = new Date().toDateString();
    return withdrawalHistory.some(withdrawal => 
      new Date(withdrawal.createdAt).toDateString() === today
    );
  };

  // Calculate daily withdrawal usage
  const getDailyWithdrawalUsage = () => {
    const today = new Date().toDateString();
    const todayWithdrawals = withdrawalHistory.filter(withdrawal => 
      new Date(withdrawal.createdAt).toDateString() === today
    );
    const used = todayWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    const daily = settings.packageLimits[userPackage]?.daily || 0;
    const remaining = Math.max(0, daily - used);
    
    return { used, daily, remaining };
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

    // Prevent multiple daily requests
    if (hasWithdrawalToday()) {
      toast({
        title: t('withdrawal.error.dailyLimit'),
        description: t('withdrawal.error.dailyLimitMessage'),
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const selectedType = withdrawalTypes.find(t => t.value === formData.type);
    const amount = parseFloat(formData.amount);
    
    if (selectedType && amount > selectedType.amount) {
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
    <div className="min-h-screen py-20 bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
      {/* Enhanced Alert for incomplete account information */}
      {showAlert && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert className="border-warning bg-gradient-to-r from-warning/10 to-warning/5 backdrop-blur-sm shadow-2xl">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <AlertDescription className="text-warning-foreground font-medium">
              {t('common.completeProfile')}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="container mx-auto px-4 relative">
        <div className="max-w-6xl mx-auto">
          {/* Enhanced Header */}
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('withdrawal.title')}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground px-4 max-w-3xl mx-auto leading-relaxed">
              {t('withdrawal.subtitle')}
            </p>
          </div>

          <Tabs defaultValue="request" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-primary/10 to-purple-500/10 p-1 rounded-xl">
              <TabsTrigger value="request" className="flex items-center gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300">
                <Shield className="w-5 h-5" />
                {t('withdrawal.newRequest')}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300">
                <History className="w-5 h-5" />
                {t('withdrawal.history')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="request">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Enhanced Withdrawal Form */}
                <div className="lg:col-span-2">
                  <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
                    <CardHeader className="relative">
                      <CardTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-purple-600 p-1">
                          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                            <Shield className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        {t('withdrawal.newRequest')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="relative">
                      {/* Enhanced Time Slot Warning */}
                      {!isWithinTimeSlot() && (
                        <Alert className="mb-6 border-warning bg-gradient-to-r from-warning/10 to-warning/5 backdrop-blur-sm">
                          <Clock className="h-5 w-5 text-warning" />
                          <AlertDescription className="text-warning-foreground">
                            <div>
                              <p className="font-semibold mb-2">{t('withdrawal.error.timeSlotMessage')}</p>
                              <p className="text-sm">
                                <strong>Available withdrawal times:</strong> {formatTimeSlotsForUser()}
                              </p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Daily Withdrawal Limit Warning */}
                      {hasWithdrawalToday() && (
                        <Alert className="mb-6 border-white/20 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm">
                          <AlertTriangle className="h-5 w-5 text-white" />
                          <AlertDescription className="text-white">
                            <div>
                              <p className="font-semibold mb-2">{t('withdrawal.error.dailyLimit')}</p>
                              <p className="text-sm mb-2">
                                Daily limit: {getDailyWithdrawalUsage().daily.toLocaleString()} EGP, 
                                Used: {getDailyWithdrawalUsage().used.toLocaleString()} EGP, 
                                Remaining: {getDailyWithdrawalUsage().remaining.toLocaleString()} EGP
                              </p>
                              <p className="text-sm">
                                You have already made a withdrawal request today. Please wait until tomorrow to make another request.
                              </p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Enhanced Package Limits Info */}
                      {settings.packageLimits[userPackage] && (
                        <Alert className="mb-6 border-primary bg-gradient-to-r from-primary/10 to-purple-500/5 backdrop-blur-sm">
                          <Package className="h-5 w-5 text-primary" />
                          <AlertDescription className="text-primary-foreground">
                            {t('withdrawal.packageLimits')
                              .replace('${min}', `${settings.packageLimits[userPackage].min}`)
                              .replace('${max}', `${settings.packageLimits[userPackage].max}`)
                              .replace('${daily}', `${settings.packageLimits[userPackage].daily}`)
                            }
                            <div className="mt-2 text-xs text-primary-foreground/80">
                              <strong>Note:</strong> Daily withdrawal limit resets at midnight (00:00).
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-3">
                          <Label htmlFor="type" className="text-sm font-medium text-muted-foreground">{t('withdrawal.type')}</Label>
                          <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)}>
                            <SelectTrigger className="h-14 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 focus:border-primary/50 transition-all duration-300 rounded-xl">
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

                        <div className="space-y-3">
                          <Label htmlFor="amount" className="text-sm font-medium text-muted-foreground">{t('withdrawal.amount')}</Label>
                          <Input
                            id="amount"
                            name="amount"
                            type="number"
                            placeholder={t('withdrawal.amount')}
                            value={formData.amount}
                            onChange={handleInputChange}
                            className="h-14 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 focus:border-primary/50 transition-all duration-300 rounded-xl"
                            min="1"
                            step="0.01"
                          />
                          {formData.type && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {t('withdrawal.maxAmount')} {withdrawalTypes.find(t => t.value === formData.type)?.amount.toLocaleString()} EGP
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="method" className="text-sm font-medium text-muted-foreground">{t('withdrawal.method')}</Label>
                          <div className="h-14 flex items-center px-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/20 text-base text-foreground">
                            {formData.method || <span className="text-muted-foreground">{t('withdrawal.placeholder')}</span>}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="accountDetails" className="text-sm font-medium text-muted-foreground">{t('withdrawal.accountDetails')}</Label>
                          <div className="h-14 flex items-center px-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/20 text-base text-foreground">
                            {formData.accountDetails || <span className="text-muted-foreground">{t('withdrawal.placeholder')}</span>}
                          </div>
                        </div>

                        <Alert className="border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5 backdrop-blur-sm">
                          <Shield className="h-5 w-5 text-primary" />
                          <AlertDescription className="text-primary-foreground">
                            {t('withdrawal.warning')}
                          </AlertDescription>
                        </Alert>

                        <Button 
                          type="submit" 
                          className="w-full h-14 text-lg bg-gradient-to-r from-primary to-purple-600 border-0 text-white hover:scale-105 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:shadow-2xl active:scale-95 font-bold rounded-xl"
                          disabled={!isWithinTimeSlot() || loading || hasWithdrawalToday()}
                        >
                          {loading ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                              {t('common.loading')}
                            </div>
                          ) : (
                            t('withdrawal.submit')
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                {/* Enhanced Balance Summary */}
                <div className="space-y-8">
                  <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
                    <CardHeader className="relative">
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        {t('withdrawal.balances')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="flex flex-col gap-6 my-6">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="rounded-2xl p-6 flex flex-row items-center gap-4 border border-primary/20 bg-gradient-to-br from-green-500/10 to-green-600/10 shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-green-500/30 hover:ring-2 hover:ring-green-400/40 group cursor-pointer relative overflow-hidden">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-green-600 p-1 group-hover:scale-110 transition-transform duration-300">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                  <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                              </div>
                              <div>
                                <div className="text-3xl font-extrabold text-green-600 drop-shadow animate-pulse">{balanceCount} EGP</div>
                                <div className="text-muted-foreground mt-1 text-base font-medium tracking-wide">{t('profile.balance')}</div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Wallet balance available for withdrawal and offers.</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="rounded-2xl p-6 flex flex-row items-center gap-4 border border-primary/20 bg-gradient-to-br from-blue-500/10 to-blue-600/10 shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/30 hover:ring-2 hover:ring-blue-400/40 group cursor-pointer relative overflow-hidden">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 p-1 group-hover:scale-110 transition-transform duration-300">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                  <Star className="w-6 h-6 text-blue-600" />
                                </div>
                              </div>
                              <div>
                                <div className="text-3xl font-extrabold text-blue-600 drop-shadow animate-pulse">{pointsCount}</div>
                                <div className="text-muted-foreground mt-1 text-base font-medium tracking-wide">{t('profile.totalPoints')}</div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Total points earned from referrals and activities.</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="rounded-2xl p-6 flex flex-row items-center gap-4 border border-primary/20 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-yellow-500/30 hover:ring-2 hover:ring-yellow-400/40 group cursor-pointer relative overflow-hidden">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 p-1 group-hover:scale-110 transition-transform duration-300">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                  <Gift className="w-6 h-6 text-yellow-600" />
                                </div>
                              </div>
                              <div>
                                <div className="text-3xl font-extrabold text-yellow-600 drop-shadow animate-pulse">{bonusesCount} EGP</div>
                                <div className="text-muted-foreground mt-1 text-base font-medium tracking-wide">{t('profile.bonuses')}</div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Bonuses awarded for achievements and promotions.</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="rounded-2xl p-6 flex flex-row items-center gap-4 border border-primary/20 bg-gradient-to-br from-purple-500/10 to-purple-600/10 shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-purple-500/30 hover:ring-2 hover:ring-purple-400/40 group cursor-pointer relative overflow-hidden">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 p-1 group-hover:scale-110 transition-transform duration-300">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                  <Users className="w-6 h-6 text-purple-600" />
                                </div>
                              </div>
                              <div>
                                <div className="text-3xl font-extrabold text-purple-600 drop-shadow animate-pulse">{teamEarningsCount} EGP</div>
                                <div className="text-muted-foreground mt-1 text-base font-medium tracking-wide">{t('profile.teamEarnings')}</div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Team earnings from your referral network.</TooltipContent>
                        </Tooltip>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
                    <CardContent className="pt-8 pb-8 relative">
                      <h3 className="font-bold text-xl mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        {t('withdrawal.verificationStatus')}
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20">
                          <span className="font-medium">{t('profile.emailVerification')}</span>
                          <Badge className="bg-green-500 text-white">✓</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20">
                          <span className="font-medium">{t('profile.phoneVerification')}</span>
                          <Badge className="bg-green-500 text-white">✓</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20">
                          <span className="font-medium">{t('profile.identityVerification')}</span>
                          <Badge className="bg-green-500 text-white">✓</Badge>
                        </div>
                        <div className={`flex justify-between items-center p-3 rounded-xl border ${
                          hasWithdrawalToday() 
                            ? 'bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-500/20' 
                            : 'bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/20'
                        }`}>
                          <span className="font-medium">Daily Withdrawal Status</span>
                          <Badge className={hasWithdrawalToday() ? "bg-red-500 text-white" : "bg-green-500 text-white"}>
                            {hasWithdrawalToday() ? "Used" : "Available"}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-6 text-center">
                        {t('withdrawal.eligible')}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-purple-600 p-1">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                        <History className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                    {t('withdrawal.history')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  {loading ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                      </div>
                      <p className="text-xl text-muted-foreground font-medium">
                        {t('common.loading')}
                      </p>
                    </div>
                  ) : withdrawalHistory.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 flex items-center justify-center">
                        <div className="text-3xl">📋</div>
                      </div>
                      <p className="text-xl text-muted-foreground font-medium mb-2">
                        {t('withdrawal.noHistory')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your withdrawal history will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
                            <TableHead className="text-primary font-bold">{t('withdrawal.history.id')}</TableHead>
                            <TableHead className="text-primary font-bold">{t('withdrawal.history.type')}</TableHead>
                            <TableHead className="text-primary font-bold">{t('withdrawal.history.amount')}</TableHead>
                            <TableHead className="text-primary font-bold">{t('withdrawal.history.method')}</TableHead>
                            <TableHead className="text-primary font-bold">{t('withdrawal.history.status')}</TableHead>
                            <TableHead className="text-primary font-bold">{t('withdrawal.history.date')}</TableHead>
                            <TableHead className="text-primary font-bold">{t('withdrawal.history.details')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {withdrawalHistory.map((withdrawal) => (
                            <TableRow key={withdrawal.id} className="hover:bg-gradient-to-r hover:from-primary/5 hover:to-purple-500/5 transition-all duration-300">
                              <TableCell className="font-mono text-sm font-medium">
                                #{withdrawal.id}
                              </TableCell>
                              <TableCell className="font-medium">
                                {withdrawalTypes.find(t => t.value === withdrawal.type)?.label || withdrawal.type}
                              </TableCell>
                              <TableCell className="font-bold text-lg">
                                {withdrawal.amount.toLocaleString()} EGP
                              </TableCell>
                              <TableCell>
                                {withdrawalMethods.find(m => m.value === withdrawal.method)?.label || withdrawal.method}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(withdrawal.status)}
                                  <Badge className={`${getStatusColor(withdrawal.status)} shadow-lg`}>
                                    {t(`withdrawal.status.${withdrawal.status}`)}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                {new Date(withdrawal.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                {withdrawal.rejectionReason && (
                                  <div className="text-sm text-red-600 mb-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <strong>{t('withdrawal.rejectionReason')}:</strong> {withdrawal.rejectionReason}
                                  </div>
                                )}
                                {withdrawal.adminNote && (
                                  <div className="text-sm text-green-600 mb-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <strong>{t('withdrawal.adminNote')}:</strong> {withdrawal.adminNote}
                                  </div>
                                )}
                                {withdrawal.status === 'paid' && withdrawal.proofImageUrl && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-1 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 hover:scale-105 transition-all duration-300"
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Enhanced Modal for proof image */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-card to-card/80 backdrop-blur-sm p-6 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col items-center border border-primary/20">
            <img src={modalImageUrl} alt="Proof" className="max-h-[70vh] max-w-full mb-6 rounded-xl shadow-2xl" />
            <Button 
              onClick={() => setShowImageModal(false)} 
              className="bg-gradient-to-r from-primary to-purple-600 border-0 text-white hover:scale-105 transition-all duration-300 shadow-2xl px-8 py-3 text-lg font-bold rounded-xl"
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
