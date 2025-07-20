import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVerificationGuard } from '@/components/VerificationGuard';
import { toast } from '@/hooks/use-toast';
import { supabase, checkIfUserIsAdmin, checkAndAwardAllBadges } from '@/lib/supabase';
import { AlertTriangle, Copy, Shield, History } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function Deposit() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { requireVerification } = useVerificationGuard();
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
  const [isVerified, setIsVerified] = useState(false);
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
          toast({ title: t('common.error'), description: t('error.loginRequired'), variant: 'destructive' });
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
            .select('user_uid, wallet, phone, verified')
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
          
          // Check if user is verified using the single verified field
          setIsVerified(userInfo.verified || false);
        } else {
          // Admin users are considered verified
          setIsVerified(true);
        }
        
        // Fetch deposit numbers
        const { data: numbersData, error: numbersError } = await supabase.from('deposit_numbers').select('number');
        if (numbersError) {
          console.error('Error fetching deposit numbers:', numbersError);
          toast({ title: t('common.error'), description: t('error.failedToLoadDepositNumbers'), variant: 'destructive' });
        } else if (numbersData && numbersData.length > 0) {
          const numbers = numbersData.map((n) => n.number);
        setSelectedNumber(numbers[Math.floor(Math.random() * numbers.length)]);
        } else {
          toast({ title: t('common.error'), description: t('deposit.noNumbersAvailable'), variant: 'destructive' });
      }

  // Fetch deposit history
        const { data: historyData, error: historyError } = await supabase
          .from('deposit_requests')
          .select('*')
          .eq('user_uid', userData.user.id)
          .order('created_at', { ascending: false });
        
        if (historyError) {
          console.error('Error fetching deposit history:', historyError);
          toast({ title: t('common.error'), description: t('error.failedToLoadHistory'), variant: 'destructive' });
        } else {
          setHistory(historyData || []);
      }
      } catch (error) {
        console.error('Error in checkAuthAndFetchData:', error);
        toast({ title: t('common.error'), description: t('error.unexpectedError'), variant: 'destructive' });
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
      toast({ title: t('common.error'), description: t('error.fileSizeLimit'), variant: 'destructive' });
      e.target.value = '';
      return;
    }
    
    setScreenshot(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check verification first
    const canProceed = requireVerification(() => {
      // This will only run if user is verified
      submitDepositRequest();
    });
    
    if (!canProceed) {
      // User is not verified, show specific message for deposit
      toast({ 
        title: t('common.error'), 
        description: t('deposit.error.verificationRequired') || 'You must verify your account before making deposits.', 
        variant: 'destructive' 
      });
      return; // User is not verified, alert already shown
    }
  };

  const submitDepositRequest = async () => {
    // Validate form inputs
    if (!amount || !screenshot || !selectedNumber) {
      toast({ title: t('common.error'), description: t('deposit.error.required'), variant: 'destructive' });
      return;
    }
    
    // Validate amount
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast({ title: t('common.error'), description: t('error.validAmount'), variant: 'destructive' });
      return;
    }
    
    if (!user) {
      toast({ title: t('common.error'), description: t('error.loginToSubmit'), variant: 'destructive' });
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
        toast({ title: t('common.error'), description: t('error.failedToUpload'), variant: 'destructive' });
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
          user_number: userInfo?.phone || '', // Use userInfo.phone
          target_number: selectedNumber,
          amount: amountValue,
          screenshot_url: screenshotUrl,
          status: 'pending',
        },
      ]);
      
      if (insertError) {
        console.error('Insert error:', insertError);
        toast({ title: t('common.error'), description: t('error.failedToSubmit'), variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      
      // Reset form
      setAmount('');
      setUserNumber('');
      setScreenshot(null);
      const fileInput = document.getElementById('screenshot') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      toast({ title: t('common.success'), description: t('deposit.success.message') });
      
      // Refresh history
      const { data: historyData, error: historyError } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_uid', user.id)
        .order('created_at', { ascending: false });
      
      if (!historyError) {
        setHistory(historyData || []);
      }
      
      // Award badges if applicable
      try {
        await checkAndAwardAllBadges(user.id);
      } catch (error) {
        console.error('Error awarding badges:', error);
      }
      
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({ title: t('common.error'), description: t('error.unexpectedError'), variant: 'destructive' });
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
      toast({ title: t('common.error'), description: t('deposit.copyError'), variant: 'destructive' });
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
    <div className="min-h-screen py-20 bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
      {/* Enhanced Alert for incomplete account information */}
      {showAlert && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
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
              {t('deposit.title')}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground px-4 max-w-3xl mx-auto leading-relaxed">
              {t('deposit.subtitle')}
            </p>
          </div>

          <Tabs defaultValue="request" value={activeTab} onValueChange={setActiveTab} className="space-y-8 mb-12 max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-primary/10 to-purple-500/10 p-1 rounded-xl">
              <TabsTrigger value="request" className="flex items-center gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300">
                <Shield className="w-5 h-5" />
                {t('deposit.newRequest')}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300">
                <History className="w-5 h-5" />
                {t('deposit.history')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="request">
              {/* Enhanced Deposit Form */}
              <div className="w-full">
                <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
                  <CardHeader className="relative">
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                      {t('deposit.title')}
                    </CardTitle>
                    <p className="text-muted-foreground mt-2">{t('deposit.subtitle')}</p>
                    {/* Verification Status */}
                    <div className="mt-4">
                      <Badge className={`${isVerified ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'} text-sm`}>
                        {isVerified ? '✓ Verified Account' : '⚠️ Verification Required'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    {/* Verification Status Alert */}
                    {!isVerified && (
                      <Alert className="mb-6 border-warning bg-gradient-to-r from-warning/10 to-warning/5 backdrop-blur-sm">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        <AlertDescription className="text-warning-foreground">
                          <div>
                            <p className="font-semibold mb-2">{t('deposit.error.verificationRequired') || 'Account Verification Required'}</p>
                            <p className="text-sm">
                              You must complete your account verification before making deposits. Please verify your email, phone, and identity.
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-8">
                      {/* Enhanced Withdrawal Method and Account Details */}
                      {userInfo && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-muted-foreground">{t('withdrawal.method')}</Label>
                            <div className="h-14 flex items-center px-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/20 text-base text-foreground">
                              {userInfo.wallet || <span className="text-muted-foreground">{t('withdrawal.methodPlaceholder') || '-'}</span>}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-muted-foreground">{t('deposit.mobileNumber')}</Label>
                            <div className="h-14 flex items-center px-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/20 text-base text-foreground">
                              {userInfo.phone || <span className="text-muted-foreground">{t('deposit.mobilePlaceholder')}</span>}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-muted-foreground">{t('deposit.targetNumber')}</Label>
                        <div className="flex gap-3 items-center w-full">
                          <Input 
                            value={selectedNumber || ''} 
                            readOnly 
                            className="h-14 font-bold text-xl bg-gradient-to-r from-primary/5 to-transparent border-primary/20 flex-1 rounded-xl" 
                            placeholder={t('deposit.loadingNumber')}
                          />
                          {selectedNumber && (
                            <Button onClick={copyDepositNumber} variant="outline" size="icon" type="button" aria-label={t('deposit.copyNumber')} className="h-14 w-14 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 hover:scale-110 transition-all duration-300">
                              <Copy className="h-5 w-5" />
                            </Button>
                          )}
                        </div>
                        {!selectedNumber && (
                          <p className="text-sm text-muted-foreground mt-2">{t('deposit.noNumbersAvailable')}</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="amount" className="text-sm font-medium text-muted-foreground">{t('deposit.amount')}</Label>
                        <Input 
                          id="amount" 
                          type="text" 
                          inputMode="decimal" 
                          pattern="[0-9.]*" 
                          value={amount} 
                          onChange={e => setAmount(e.target.value)} 
                          className="h-14 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 focus:border-primary/50 transition-all duration-300 rounded-xl" 
                          placeholder={t('deposit.amount')}
                          required
                          disabled={!isVerified}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="screenshot" className="text-sm font-medium text-muted-foreground">{t('deposit.upload')}</Label>
                        <Input 
                          id="screenshot" 
                          type="file" 
                          accept="image/jpeg,image/png" 
                          onChange={handleFileChange} 
                          className="h-14 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 focus:border-primary/50 transition-all duration-300 rounded-xl" 
                          required
                          disabled={!isVerified}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          {t('deposit.acceptedFormats')}
                        </p>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full h-14 text-lg bg-gradient-to-r from-primary to-purple-600 border-0 text-white hover:scale-105 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:shadow-2xl active:scale-95 font-bold rounded-xl" 
                        disabled={submitting || !selectedNumber || !isVerified}
                      >
                        {submitting ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            {t('deposit.submitting')}
                          </div>
                        ) : (
                          t('deposit.submit')
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="history">
              {/* Enhanced Deposit History */}
              <div className="w-full">
                <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
                  <CardHeader className="relative">
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                      {t('deposit.history')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    {history.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 flex items-center justify-center">
                          <div className="text-3xl">📋</div>
                        </div>
                        <p className="text-xl text-muted-foreground font-medium mb-2">
                          {t('deposit.noHistory')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Your deposit history will appear here
                        </p>
                      </div>
                    ) : (
                      <>
                        <ul className="space-y-6">
                          {paginatedHistory.map((item, idx) => (
                            <li key={item.id || idx} className="p-6 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 hover:scale-105 transition-all duration-300">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                {/* Left: Image thumbnail */}
                                <div className="flex-shrink-0 flex items-center justify-center">
                                  {item.screenshot_url ? (
                                    <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={item.screenshot_url}
                                        alt={t('deposit.screenshot')}
                                        className="w-24 h-24 object-cover rounded-xl border border-primary/20 shadow-lg hover:scale-110 transition-transform cursor-pointer"
                                      />
                                    </a>
                                  ) : (
                                    <div className="w-24 h-24 flex items-center justify-center bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl border border-primary/20 text-muted-foreground">
                                      <div className="text-2xl">📷</div>
                                    </div>
                                  )}
                                </div>
                                {/* Center: Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col md:flex-row md:items-center md:gap-6 mb-3">
                                    <div className="font-bold text-2xl text-foreground">
                                      {item.amount} {t('deposit.amountUnit') || ''}
                                    </div>
                                    <div className="mt-2 md:mt-0">
                                      <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold shadow-lg
                                        ${item.status === 'approved' ? 'bg-green-500/10 text-green-600 border border-green-500/20' :
                                          item.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20' :
                                          item.status === 'rejected' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                                          'bg-muted text-muted-foreground'}
                                      `}>
                                        {t(`deposit.status.${item.status}`) || item.status}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {t('deposit.targetNumber')}: <span className="font-mono font-medium">{item.target_number}</span>
                                  </div>
                                </div>
                                {/* Right: Date/Time */}
                                <div className="text-right min-w-[140px]">
                                  <div className="text-sm text-muted-foreground">
                                    {t('deposit.date')}:<br />
                                    <span className="font-mono font-medium">
                                      {item.created_at ? new Date(item.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                        {/* Enhanced Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex justify-center items-center gap-4 mt-8">
                            <Button 
                              variant="outline" 
                              size="lg" 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                              disabled={currentPage === 1}
                              className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20 hover:scale-105 transition-all duration-300"
                            >
                              &lt;
                            </Button>
                            <span className="mx-4 text-lg font-medium">{t('common.page')} {currentPage} {t('common.of')} {totalPages}</span>
                            <Button 
                              variant="outline" 
                              size="lg" 
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                              disabled={currentPage === totalPages}
                              className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20 hover:scale-105 transition-all duration-300"
                            >
                              &gt;
                            </Button>
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