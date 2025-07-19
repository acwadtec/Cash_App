
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
import { toast } from '@/hooks/use-toast';
import { Shield, AlertTriangle, Clock, Package, History, XCircle, CheckCircle, Hourglass } from 'lucide-react';
import { supabase, checkIfUserIsAdmin } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useUserBalances } from '@/hooks/useUserBalance';

interface WithdrawalSettings {
  timeSlots: string[];
  packageLimits: Record<string, { min: number; max: number; daily: number }>;
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

export default function Withdrawal() {
  const { t } = useLanguage();
  const navigate = useNavigate();
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
  // Calculate capital as the sum of personal_earnings, team_earnings, and bonuses
  const capital = balances
    ? balances.personal_earnings + balances.team_earnings + balances.bonuses
    : 0;

  const withdrawalTypes = [
    { value: 'personal', label: t('profile.personalEarnings'), balance: balances?.personal_earnings ?? 0 },
    { value: 'team', label: t('profile.teamEarnings'), balance: balances?.team_earnings ?? 0 },
    { value: 'bonuses', label: t('profile.bonuses'), balance: balances?.bonuses ?? 0 },
    { value: 'capital', label: t('profile.capital'), balance: balances?.balance ?? 0 },
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

    // Check daily limit
    const todayWithdrawals = withdrawalHistory.filter(w => 
      w.status === 'pending' || w.status === 'approved' || w.status === 'paid'
    ).filter(w => {
      const withdrawalDate = new Date(w.createdAt);
      const today = new Date();
      return withdrawalDate.toDateString() === today.toDateString();
    });

    const todayTotal = todayWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    if (todayTotal + amount > packageLimit.daily) {
      const remaining = packageLimit.daily - todayTotal;
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
    if (!offers.length) return false;
    const now = new Date();
    return offers.every(o => o.deadline && new Date(o.deadline) < now);
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
    
    if (!formData.type || !formData.amount || !formData.method) {
      toast({
        title: t('common.error'),
        description: t('register.required'),
        variant: 'destructive',
      });
      return;
    }

    // Check time slot
    if (!isWithinTimeSlot()) {
      toast({
        title: t('withdrawal.error.timeSlot'),
        description: t('withdrawal.error.timeSlotMessage'),
        variant: 'destructive',
      });
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
      return;
    }

    // Check package limits (use correct userPackage)
    const limitCheck = checkPackageLimits(amount);
    if (!limitCheck.valid) {
      toast({
        title: t('withdrawal.error.limit'),
        description: limitCheck.message,
        variant: 'destructive',
      });
      return;
    }

    // Check max withdrawal amount
    if (amount > 6000) {
      toast({
        title: t('withdrawal.error.maxAmount'),
        description: 'Maximum withdrawal per request is 6000.',
        variant: 'destructive',
      });
      return;
    }
    // Check if after offer deadline
    if (!isAfterAllDeadlines()) {
      toast({
        title: t('withdrawal.error.limit'),
        description: 'Withdrawals are only allowed after the offer deadline has passed.',
        variant: 'destructive',
      });
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      toast({
        title: t('common.error'),
        description: 'User not authenticated',
        variant: 'destructive',
      });
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
    }
    // Reset form
    setFormData({
      type: '',
      amount: '',
      method: '',
      accountDetails: '',
    });
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

  return (
    <div className="min-h-screen py-20">
      {/* Alert for incomplete account information */}
      {showAlert && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {t('common.completeProfile') || 'Please complete your account information to make withdrawals. Redirecting to profile setup...'}
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
                            {t('withdrawal.error.timeSlotMessage')}
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
                                  {type.label} (${type.balance.toLocaleString()})
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
                              {t('withdrawal.maxAmount')} ${withdrawalTypes.find(t => t.value === formData.type)?.balance.toLocaleString()}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="method">{t('withdrawal.method')}</Label>
                          <div
                            className="h-12 flex items-center px-3 rounded-md bg-gray-100 border border-input text-base text-gray-900"
                            style={{ minHeight: '3rem' }}
                          >
                            {formData.method || <span className="text-gray-400">{t('withdrawal.methodPlaceholder') || '-'}</span>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="accountDetails">{t('withdrawal.accountDetails')}</Label>
                          <div
                            className="h-12 flex items-center px-3 rounded-md bg-gray-100 border border-input text-base text-gray-900"
                            style={{ minHeight: '3rem' }}
                          >
                            {formData.accountDetails || <span className="text-gray-400">{t('withdrawal.accountPlaceholder') || '-'}</span>}
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
                          disabled={!isWithinTimeSlot() || loading || !isAfterAllDeadlines()}
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
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-accent/20">
                          <span className="font-medium">إجمالي الإيرادات</span>
                          <span className="font-bold text-primary">{balances ? `${balances.balance} ${t('deposit.amountUnit')}` : `${t('deposit.amountUnit')}`}</span>
                        </div>
                        {withdrawalTypes.map((type) => (
                          <div key={type.value} className="flex justify-between items-center p-3 rounded-lg bg-accent/20">
                            <span className="font-medium">{type.label}</span>
                            <span className="font-bold text-primary">
                              ${type.balance.toLocaleString()}
                            </span>
                          </div>
                        ))}
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
                              ${withdrawal.amount.toLocaleString()}
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
                                  {t('withdrawal.viewProof') || 'View Proof'}
                                </Button>
                              )}
                              {!withdrawal.rejectionReason && !withdrawal.adminNote && !(withdrawal.status === 'paid' && withdrawal.proofImageUrl) && (
                                <span className="text-muted-foreground">{t('withdrawal.noDetails') || 'No additional details'}</span>
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
              {t('common.close') || 'Close'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
