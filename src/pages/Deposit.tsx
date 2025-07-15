import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { supabase, checkIfUserIsAdmin } from '@/lib/supabase';
import { AlertTriangle } from 'lucide-react';

export default function Deposit() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [userNumber, setUserNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [showAlert, setShowAlert] = useState(false);

  // Check authentication and fetch data
  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        setLoading(true);
        
        // Check if user is authenticated
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
          toast({ title: t('common.error'), description: 'Please login to access this page', variant: 'destructive' });
          navigate('/login');
          return;
        }
        
        setUser(userData.user);
        
        // Check if user is admin
        const isAdmin = await checkIfUserIsAdmin(userData.user.id);
        
        // Only check user_info for non-admin users
        if (!isAdmin) {
          const { data: userInfo } = await supabase
            .from('user_info')
            .select('user_uid')
            .eq('user_uid', userData.user.id)
            .single();
          
          if (!userInfo) {
            // Show alert before redirecting
            setShowAlert(true);
            setTimeout(() => {
              navigate('/update-account');
            }, 3000); // Redirect after 3 seconds
            return;
          }
        }
        
        // Fetch deposit numbers
        const { data: numbersData, error: numbersError } = await supabase.from('deposit_numbers').select('number');
        if (numbersError) {
          console.error('Error fetching deposit numbers:', numbersError);
          toast({ title: t('common.error'), description: 'Failed to load deposit numbers', variant: 'destructive' });
        } else if (numbersData && numbersData.length > 0) {
          const numbers = numbersData.map((n) => n.number);
        setSelectedNumber(numbers[Math.floor(Math.random() * numbers.length)]);
        } else {
          toast({ title: t('common.error'), description: 'No deposit numbers available', variant: 'destructive' });
      }

  // Fetch deposit history
        const { data: historyData, error: historyError } = await supabase
          .from('deposit_requests')
          .select('*')
          .eq('user_uid', userData.user.id)
          .order('created_at', { ascending: false });
        
        if (historyError) {
          console.error('Error fetching deposit history:', historyError);
          toast({ title: t('common.error'), description: 'Failed to load deposit history', variant: 'destructive' });
        } else {
          setHistory(historyData || []);
      }
      } catch (error) {
        console.error('Error in checkAuthAndFetchData:', error);
        toast({ title: t('common.error'), description: 'An unexpected error occurred', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthAndFetchData();
  }, [navigate, t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setScreenshot(null);
      return;
    }
    
    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast({ title: t('common.error'), description: t('deposit.error.imageType'), variant: 'destructive' });
      e.target.value = '';
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t('common.error'), description: 'File size must be less than 5MB', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    
    setScreenshot(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form inputs
    if (!amount || !userNumber || !screenshot || !selectedNumber) {
      toast({ title: t('common.error'), description: t('deposit.error.required'), variant: 'destructive' });
      return;
    }
    
    // Validate amount
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast({ title: t('common.error'), description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }
    
    // Validate user number
    if (userNumber.length < 10) {
      toast({ title: t('common.error'), description: 'Please enter a valid phone number', variant: 'destructive' });
      return;
    }
    
    if (!user) {
      toast({ title: t('common.error'), description: 'Please login to submit deposit', variant: 'destructive' });
      navigate('/login');
      return;
    }
    
    setSubmitting(true);
    
    try {
    // Upload screenshot to Supabase Storage
      const filePath = `deposits/${user.id}/${Date.now()}-${screenshot.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('deposit-screenshots')
        .upload(filePath, screenshot);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({ title: t('common.error'), description: 'Failed to upload screenshot. Please try again.', variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      
      const screenshotUrl = supabase.storage
        .from('deposit-screenshots')
        .getPublicUrl(uploadData.path).data.publicUrl;
      
      // Insert deposit request
      const { error: insertError } = await supabase.from('deposit_requests').insert([
        {
          user_uid: user.id,
          user_number: userNumber,
          target_number: selectedNumber,
          amount: amountValue,
          screenshot_url: screenshotUrl,
          status: 'pending',
        },
      ]);
      
      if (insertError) {
        console.error('Insert error:', insertError);
        toast({ title: t('common.error'), description: 'Failed to submit deposit request. Please try again.', variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      
      // Reset form
      setAmount('');
      setUserNumber('');
      setScreenshot(null);
      const fileInput = document.getElementById('screenshot') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      toast({ title: t('common.success'), description: t('deposit.success') });
      
      // Refresh history
      const { data: historyData, error: historyError } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_uid', user.id)
        .order('created_at', { ascending: false });
      
      if (!historyError) {
        setHistory(historyData || []);
    }
      
      // Handle gamification (simplified)
      try {
        const { data: allDeposits } = await supabase
          .from('deposit_requests')
          .select('id')
          .eq('user_uid', user.id);
        
        if (allDeposits && allDeposits.length === 3) {
          // Award Deposit Novice badge
          const { data: badge } = await supabase
            .from('badges')
            .select('id')
            .eq('name', 'Deposit Novice')
            .single();
          
          if (badge) {
            await supabase.from('user_badges').upsert([
              { user_uid: user.id, badge_id: badge.id }
            ]);
          }
        }
        
        if (allDeposits && allDeposits.length === 10) {
          // Award Deposit Master badge
          const { data: badge } = await supabase
            .from('badges')
            .select('id')
            .eq('name', 'Deposit Master')
            .single();
          
          if (badge) {
            await supabase.from('user_badges').upsert([
              { user_uid: user.id, badge_id: badge.id }
            ]);
          }
        }
        
        // Update user level
        const { count } = await supabase
          .from('user_badges')
          .select('id', { count: 'exact', head: true })
          .eq('user_uid', user.id);
        
        const newLevel = Math.max(1, Math.floor((count || 0) / 2));
        await supabase.from('user_info').update({ level: newLevel }).eq('user_uid', user.id);
      } catch (gamificationError) {
        console.error('Gamification error:', gamificationError);
        // Don't fail the deposit if gamification fails
      }
      
    } catch (error) {
      console.error('Submit error:', error);
      toast({ title: t('common.error'), description: t('deposit.error.unexpected'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-glow">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">{t('deposit.loading')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-glow">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">{t('deposit.loginRequired')}</p>
                  <Button onClick={() => navigate('/login')}>{t('nav.login')}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20">
      {/* Alert for incomplete account information */}
      {showAlert && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {t('common.completeProfile') || 'Please complete your account information to make deposits. Redirecting to profile setup...'}
            </AlertDescription>
          </Alert>
        </div>
      )}

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
                  <Input 
                    value={selectedNumber || ''} 
                    readOnly 
                    className="h-12 font-bold text-lg bg-muted" 
                    placeholder={t('deposit.loadingNumber')}
                  />
                  {!selectedNumber && (
                    <p className="text-sm text-muted-foreground mt-1">{t('deposit.noNumbersAvailable')}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="amount">{t('deposit.amount')}</Label>
                  <Input 
                    id="amount" 
                    type="text" 
                    inputMode="decimal" 
                    pattern="[0-9.]*" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    className="h-12" 
                    placeholder={t('deposit.amount')}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="userNumber">{t('deposit.userNumber')}</Label>
                  <Input 
                    id="userNumber" 
                    value={userNumber} 
                    onChange={e => setUserNumber(e.target.value)} 
                    className="h-12" 
                    placeholder={t('deposit.userNumber')}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="screenshot">{t('deposit.upload')}</Label>
                  <Input 
                    id="screenshot" 
                    type="file" 
                    accept="image/jpeg,image/png" 
                    onChange={handleFileChange} 
                    className="h-12" 
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('deposit.acceptedFormats')}
                  </p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg shadow-glow" 
                  disabled={submitting || !selectedNumber}
                >
                  {submitting ? t('deposit.submitting') : t('deposit.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 