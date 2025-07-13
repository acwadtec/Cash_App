
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Shield, AlertTriangle } from 'lucide-react';

export default function Withdrawal() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    method: '',
    accountDetails: '',
  });

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

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">{t('withdrawal.title')}</h1>
            <p className="text-xl text-muted-foreground">
              {t('withdrawal.subtitle')}
            </p>
          </div>

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

                    <Button type="submit" className="w-full h-12 text-lg shadow-glow">
                      {t('withdrawal.submit')}
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
        </div>
      </div>
    </div>
  );
}
