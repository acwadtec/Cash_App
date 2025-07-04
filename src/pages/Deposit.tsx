import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

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
  const [history, setHistory] = useState([]);

  // Pick a random admin number on mount
  useEffect(() => {
    const fetchNumbers = async () => {
      const { data } = await supabase.from('deposit_numbers').select('number');
      if (data && data.length > 0) {
        const numbers = data.map((n) => n.number);
        setSelectedNumber(numbers[Math.floor(Math.random() * numbers.length)]);
      }
    };
    fetchNumbers();
  }, []);

  // Fetch deposit history
  useEffect(() => {
    const fetchHistory = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) {
        const { data } = await supabase
          .from('deposit_requests')
          .select('*')
          .eq('user_uid', user.id)
          .order('created_at', { ascending: false });
        setHistory(data || []);
      }
    };
    fetchHistory();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !['image/jpeg', 'image/png'].includes(file.type)) {
      toast({ title: t('common.error'), description: t('deposit.error.imageType'), variant: 'destructive' });
      return;
    }
    setScreenshot(file || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !userNumber || !screenshot || !selectedNumber) {
      toast({ title: t('common.error'), description: t('deposit.error.required'), variant: 'destructive' });
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(screenshot.type)) {
      toast({ title: t('common.error'), description: t('deposit.error.imageType'), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    // Upload screenshot to Supabase Storage
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    let screenshotUrl = '';
    if (user) {
      const filePath = `deposits/${user.id}/${Date.now()}-${screenshot.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('deposit-screenshots').upload(filePath, screenshot);
      if (uploadError) {
        toast({ title: t('common.error'), description: uploadError.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      screenshotUrl = supabase.storage.from('deposit-screenshots').getPublicUrl(uploadData.path).data.publicUrl;
      // Insert deposit request
      const { error } = await supabase.from('deposit_requests').insert([
        {
          user_uid: user.id,
          user_number: userNumber,
          target_number: selectedNumber,
          amount: Number(amount),
          screenshot_url: screenshotUrl,
          status: 'pending',
        },
      ]);
      if (error) {
        toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      setAmount('');
      setUserNumber('');
      setScreenshot(null);
      toast({ title: t('common.success'), description: t('deposit.success') });
      // Refresh history
      const { data } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_uid', user.id)
        .order('created_at', { ascending: false });
      setHistory(data || []);
    }
    setSubmitting(false);
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
      {/* Below the form, show deposit history */}
      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">{t('deposit.history') || 'Deposit History'}</h2>
          <div className="space-y-4">
            {history.map((item) => (
              <Card key={item.id} className="shadow-card">
                <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div><b>{t('deposit.amount') || 'Amount'}:</b> {item.amount}</div>
                    <div><b>{t('deposit.userNumber') || 'Your Number'}:</b> {item.user_number}</div>
                    <div><b>{t('deposit.targetNumber') || 'Target Number'}:</b> {item.target_number}</div>
                    <div><b>{t('deposit.status') || 'Status'}:</b> {item.status}</div>
                    <div><b>{t('deposit.date') || 'Date'}:</b> {item.created_at?.slice(0, 10)}</div>
                  </div>
                  <div>
                    <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer">
                      <img src={item.screenshot_url} alt="screenshot" className="w-32 h-32 object-cover rounded" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 