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
import { supabase, checkIfUserIsAdmin, checkAndAwardAllBadges } from '@/lib/supabase';
import { AlertTriangle, Copy, Shield, History } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
  const [userInfo, setUserInfo] = useState<{ wallet?: string; phone?: string } | null>(null);
  const [activeTab, setActiveTab] = useState('request');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const paginatedHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(history.length / itemsPerPage);

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
            .select('user_uid, wallet, phone')
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
          setUserInfo({ wallet: userInfo.wallet, phone: userInfo.phone });
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
    if (!amount || !screenshot || !selectedNumber) {
      toast({ title: t('common.error'), description: t('deposit.error.required'), variant: 'destructive' });
      return;
    }
    
    // Validate amount
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast({ title: t('common.error'), description: 'Please enter a valid amount', variant: 'destructive' });
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
          user_number: userNumber, // Keep userNumber for now, as it's not removed from form
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
      
      await checkAndAwardAllBadges(user.id);
      
    } catch (error) {
      console.error('Submit error:', error);
      toast({ title: t('common.error'), description: t('deposit.error.unexpected'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Add copy handler for deposit number
  const copyDepositNumber = async () => {
    if (!selectedNumber) return;
    try {
      await navigator.clipboard.writeText(selectedNumber);
      toast({
        title: t('common.copied'),
        description: t('deposit.copiedNumber'),
      });
    } catch (error) {
      toast({ title: t('common.error'), description: t('deposit.copyError') || 'Failed to copy deposit number', variant: 'destructive' });
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
                  <Button onClick={() => navigate('/login')} className="transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95">
                    {t('nav.login')}
                  </Button>
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
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">{t('deposit.title')}</h1>
            <p className="text-xl text-muted-foreground">
              {t('deposit.subtitle')}
            </p>
          </div>

          <Tabs defaultValue="request" value={activeTab} onValueChange={setActiveTab} className="space-y-6 mb-8 max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="request" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {t('deposit.newRequest') || 'New Deposit Request'}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                {t('deposit.history') || 'Deposit History'}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="request">
              {/* Deposit Form */}
              <div className="w-full">
                <Card className="shadow-glow w-full">
                  <CardHeader>
                    <CardTitle>{t('deposit.title')}</CardTitle>
                    <p className="text-muted-foreground mt-2">{t('deposit.subtitle')}</p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Withdrawal Method and Account Details (copied from Withdrawal page, replaces userNumber input) */}
                      {userInfo && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t('withdrawal.method')}</Label>
                            <div
                              className="h-12 flex items-center px-3 rounded-md bg-muted border border-input text-base text-foreground"
                              style={{ minHeight: '3rem' }}
                            >
                              {userInfo.wallet || <span className="text-muted-foreground">{t('withdrawal.methodPlaceholder') || '-'}</span>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>{t('deposit.mobileNumber') || 'Mobile Number'}</Label>
                            <div
                              className="h-12 flex items-center px-3 rounded-md bg-muted border border-input text-base text-foreground"
                              style={{ minHeight: '3rem' }}
                            >
                              {userInfo.phone || <span className="text-muted-foreground">{t('deposit.mobilePlaceholder') || '-'}</span>}
                            </div>
                          </div>
                        </div>
                      )}
                      <div>
                        <Label>{t('deposit.targetNumber')}</Label>
                        <div className="flex gap-2 items-center w-full">
                          <Input 
                            value={selectedNumber || ''} 
                            readOnly 
                            className="h-12 font-bold text-lg bg-muted flex-1" 
                            placeholder={t('deposit.loadingNumber')}
                          />
                          {selectedNumber && (
                            <Button onClick={copyDepositNumber} variant="outline" size="icon" type="button" aria-label={t('deposit.copyNumber') || 'Copy number'} className="transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-110 hover:shadow-lg active:scale-95">
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
                      {/* REMOVE userNumber input field */}
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
                        className="w-full h-12 text-lg shadow-glow transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95" 
                        disabled={submitting || !selectedNumber}
                      >
                        {submitting ? t('deposit.submitting') : t('deposit.submit')}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="history">
              {/* Deposit History Table or List */}
              <div className="w-full">
                <Card className="shadow-glow w-full">
                  <CardHeader>
                    <CardTitle>{t('deposit.history')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {history.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">{t('deposit.noHistory') || 'No deposit history'}</p>
                    ) : (
                      <>
                        <ul className="divide-y divide-border">
                          {paginatedHistory.map((item, idx) => (
                            <li key={item.id || idx} className="py-6">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                {/* Left: Image thumbnail */}
                                <div className="flex-shrink-0 flex items-center justify-center">
                                  {item.screenshot_url ? (
                                    <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={item.screenshot_url}
                                        alt={t('deposit.screenshot')}
                                        className="w-20 h-20 object-cover rounded-lg border border-border shadow hover:scale-105 transition-transform cursor-pointer"
                                      />
                                    </a>
                                  ) : (
                                    <div className="w-20 h-20 flex items-center justify-center bg-muted rounded-lg border border-border text-muted-foreground text-xs">
                                      {t('deposit.noScreenshot') || 'No image'}
                                    </div>
                                  )}
                                </div>
                                {/* Center: Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col md:flex-row md:items-center md:gap-6">
                                    <div className="font-bold text-lg text-foreground">
                                      {item.amount} {t('deposit.amountUnit') || ''}
                                    </div>
                                    <div className="mt-1 md:mt-0">
                                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold
                                        ${item.status === 'approved' ? 'bg-green-100 text-green-700' :
                                          item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                          item.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                          'bg-muted text-muted-foreground'}
                                      `}>
                                        {t(`deposit.status.${item.status}`) || item.status}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-2">
                                    {t('deposit.targetNumber')}: <span className="font-mono">{item.target_number}</span>
                                  </div>
                                </div>
                                {/* Right: Date/Time */}
                                <div className="text-right min-w-[120px]">
                                  <div className="text-sm text-muted-foreground">
                                    {t('deposit.date')}:<br />
                                    <span className="font-mono">
                                      {item.created_at ? new Date(item.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex justify-center items-center gap-2 mt-6">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>&lt;</Button>
                            <span className="mx-2 text-sm">{t('common.page')} {currentPage} {t('common.of')} {totalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>&gt;</Button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 