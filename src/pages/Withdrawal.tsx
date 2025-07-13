
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
import { supabase } from '@/lib/supabase';

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

  const withdrawalTypes = [
    { value: 'personal', label: t('profile.personalEarnings'), balance: 1230.75 },
    { value: 'team', label: t('profile.teamEarnings'), balance: 2450.50 },
    { value: 'bonuses', label: t('profile.bonuses'), balance: 890.25 },
    { value: 'capital', label: t('profile.capital'), balance: 5000.00 },
  ];

  const withdrawalMethods = [
    { value: 'bank', label: t('withdrawal.bank') },
    { value: 'wallet', label: t('withdrawal.wallet') },
    { value: 'crypto', label: t('withdrawal.crypto') },
  ];

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
        message: t('withdrawal.error.minAmount', { min: packageLimit.min }) 
      };
    }

    if (amount > packageLimit.max) {
      return { 
        valid: false, 
        message: t('withdrawal.error.maxAmount', { max: packageLimit.max }) 
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
      return { 
        valid: false, 
        message: t('withdrawal.error.dailyLimit', { 
          daily: packageLimit.daily, 
          used: todayTotal,
          remaining: packageLimit.daily - todayTotal
        }) 
      };
    }

    return { valid: true, message: '' };
  };

  // Load settings and withdrawal history
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
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

        // Load withdrawal history (mock data for now)
        const mockHistory: WithdrawalRequest[] = [
          {
            id: '1',
            type: 'personal',
            amount: 500,
            method: 'bank',
            accountDetails: '1234567890',
            status: 'paid',
            createdAt: '2024-07-10T10:00:00Z',
            adminNote: 'Payment processed successfully'
          },
          {
            id: '2',
            type: 'bonuses',
            amount: 200,
            method: 'wallet',
            accountDetails: 'wallet123',
            status: 'rejected',
            createdAt: '2024-07-09T15:30:00Z',
            rejectionReason: 'Invalid wallet address provided'
          },
          {
            id: '3',
            type: 'team',
            amount: 1000,
            method: 'crypto',
            accountDetails: 'crypto_address_123',
            status: 'pending',
            createdAt: '2024-07-11T09:15:00Z'
          }
        ];

        setWithdrawalHistory(mockHistory);
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
  }, [t]);

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

  const handleSubmit = (e: React.FormEvent) => {
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

    // Check package limits
    const limitCheck = checkPackageLimits(amount);
    if (!limitCheck.valid) {
      toast({
        title: t('withdrawal.error.limit'),
        description: limitCheck.message,
        variant: 'destructive',
      });
      return;
    }

    // Submit withdrawal request
    const newWithdrawal: WithdrawalRequest = {
      id: Date.now().toString(),
      type: formData.type,
      amount: amount,
      method: formData.method,
      accountDetails: formData.accountDetails,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setWithdrawalHistory(prev => [newWithdrawal, ...prev]);

    toast({
      title: t('common.success'),
      description: t('withdrawal.success.message'),
    });

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
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">{t('withdrawal.title')}</h1>
            <p className="text-xl text-muted-foreground">
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
                            {t('withdrawal.packageLimits', {
                              min: settings.packageLimits[userPackage].min,
                              max: settings.packageLimits[userPackage].max,
                              daily: settings.packageLimits[userPackage].daily
                            })}
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
                          <Select value={formData.method} onValueChange={(value) => handleSelectChange('method', value)}>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder={t('withdrawal.selectMethod')} />
                            </SelectTrigger>
                            <SelectContent>
                              {withdrawalMethods.map((method) => (
                                <SelectItem key={method.value} value={method.value}>
                                  {method.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="accountDetails">{t('withdrawal.accountDetails')}</Label>
                          <Input
                            id="accountDetails"
                            name="accountDetails"
                            placeholder={t('withdrawal.accountPlaceholder')}
                            value={formData.accountDetails}
                            onChange={handleInputChange}
                            className="h-12"
                          />
                        </div>

                        <Alert>
                          <Shield className="h-4 w-4" />
                          <AlertDescription>
                            {t('withdrawal.warning')}
                          </AlertDescription>
                        </Alert>

                        <Button 
                          type="submit" 
                          className="w-full h-12 text-lg shadow-glow"
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
                      <div className="space-y-4">
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
                              {withdrawal.status === 'rejected' && withdrawal.rejectionReason && (
                                <div className="text-sm text-red-600">
                                  <strong>{t('withdrawal.rejectionReason')}:</strong> {withdrawal.rejectionReason}
                                </div>
                              )}
                              {withdrawal.status === 'paid' && withdrawal.adminNote && (
                                <div className="text-sm text-green-600">
                                  <strong>{t('withdrawal.adminNote')}:</strong> {withdrawal.adminNote}
                                </div>
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
    </div>
  );
}
