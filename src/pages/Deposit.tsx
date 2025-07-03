import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Mock admin numbers (should be replaced by context or prop in real app)
const getAdminNumbers = () => {
  return JSON.parse(localStorage.getItem('depositNumbers') || '[]');
};

export default function Deposit() {
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [userNumber, setUserNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);

  // Pick a random admin number on mount
  useState(() => {
    const numbers = getAdminNumbers();
    if (numbers.length > 0) {
      setSelectedNumber(numbers[Math.floor(Math.random() * numbers.length)]);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !['image/jpeg', 'image/png'].includes(file.type)) {
      toast({ title: t('common.error'), description: t('deposit.error.imageType'), variant: 'destructive' });
      return;
    }
    setScreenshot(file || null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !userNumber || !screenshot || !selectedNumber) {
      toast({ title: t('common.error'), description: t('deposit.error.required'), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    // Mock: Save to localStorage as pending deposit
    const deposits = JSON.parse(localStorage.getItem('depositRequests') || '[]');
    const reader = new FileReader();
    reader.onload = () => {
      deposits.push({
        id: Date.now(),
        amount,
        userNumber,
        targetNumber: selectedNumber,
        screenshot: reader.result,
        status: 'pending',
        date: new Date().toISOString(),
      });
      localStorage.setItem('depositRequests', JSON.stringify(deposits));
      setAmount('');
      setUserNumber('');
      setScreenshot(null);
      toast({ title: t('common.success'), description: t('deposit.success') });
      setSubmitting(false);
    };
    reader.readAsDataURL(screenshot);
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-glow">
            <CardHeader>
              <CardTitle>{t('deposit.title')}</CardTitle>
              <p className="text-muted-foreground mt-2">{t('deposit.subtitle')}</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label>{t('deposit.targetNumber')}</Label>
                  <Input value={selectedNumber || ''} readOnly className="h-12 font-bold text-lg" />
                </div>
                <div>
                  <Label htmlFor="amount">{t('deposit.amount')}</Label>
                  <Input id="amount" type="text" inputMode="decimal" pattern="[0-9.]*" value={amount} onChange={e => setAmount(e.target.value)} className="h-12" />
                </div>
                <div>
                  <Label htmlFor="userNumber">{t('deposit.userNumber')}</Label>
                  <Input id="userNumber" value={userNumber} onChange={e => setUserNumber(e.target.value)} className="h-12" />
                </div>
                <div>
                  <Label htmlFor="screenshot">{t('deposit.upload')}</Label>
                  <Input id="screenshot" type="file" accept="image/jpeg,image/png" onChange={handleFileChange} className="h-12" />
                </div>
                <Button type="submit" className="w-full h-12 text-lg shadow-glow" disabled={submitting}>
                  {t('deposit.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 