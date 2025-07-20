import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect, useState } from 'react';
import { supabase, checkIfUserIsAdmin } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useVerificationGuard } from '@/components/VerificationGuard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Gift, Users, Star } from 'lucide-react';
import { Dialog as ConfirmDialog, DialogContent as ConfirmDialogContent, DialogHeader as ConfirmDialogHeader, DialogTitle as ConfirmDialogTitle } from '@/components/ui/dialog';

interface Offer {
  id: string;
  title: string;
  description: string;
  amount: number;
  cost?: number;
  daily_profit?: number;
  monthly_profit?: number;
  image_url?: string;
  type?: string;
  deadline?: string;
  minAmount?: number;
  join_limit?: number | null;
  join_count?: number;
  user_join_limit?: number | null;
  title_en?: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;
}

export default function Offers() {
  const { t, isRTL, language } = useLanguage();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { requireVerification } = useVerificationGuard();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  // Change joinedOffers to an object mapping offerId to status
  const [joinStatuses, setJoinStatuses] = useState<{ [offerId: string]: string }>({});
  // Track how many times the user has joined each offer
  const [userJoinCounts, setUserJoinCounts] = useState<{ [offerId: string]: number }>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  // Add state for modal and selected balance type
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null);
  const [selectedBalanceType, setSelectedBalanceType] = useState<'balance' | 'bonuses' | 'team_earnings' | null>(null);
  const [userBalances, setUserBalances] = useState<{ balance: number; bonuses: number; team_earnings: number; total_points: number } | null>(null);
  const [showUserConfirm, setShowUserConfirm] = useState(false);
  const [pendingUserJoin, setPendingUserJoin] = useState<null | (() => void)>(null);
  const [pendingBalanceType, setPendingBalanceType] = useState<string | null>(null);

  // Check if user has user_info data
  useEffect(() => {
    const checkUserInfo = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) {
        // Check if user is admin
        const isAdmin = await checkIfUserIsAdmin(user.id);
        
        // Only check user_info for non-admin users
        if (!isAdmin) {
          const { data: userInfo } = await supabase
            .from('user_info')
            .select('user_uid')
            .eq('user_uid', user.id)
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
      }
    };
    checkUserInfo();
  }, [navigate]);

  useEffect(() => {
    const fetchOffers = async () => {
      setLoading(true);
      // Fetch all fields from Supabase
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('active', true);
      if (error) {
        setOffers([]);
      } else {
        setOffers(data || []);
      }
      setLoading(false);
    };
    fetchOffers();
  }, []);

  useEffect(() => {
    const fetchUserAndJoins = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Fetch offer_id and status for each join
        const { data: joins } = await supabase
          .from('offer_joins')
          .select('offer_id, status')
          .eq('user_id', user.id);
        // Map offer_id to status and count
        const statusMap: { [offerId: string]: string } = {};
        const countMap: { [offerId: string]: number } = {};
        if (joins) {
          joins.forEach((j: any) => {
            statusMap[j.offer_id] = j.status;
            countMap[j.offer_id] = (countMap[j.offer_id] || 0) + 1;
          });
        }
        setJoinStatuses(statusMap);
        setUserJoinCounts(countMap);
      }
    };
    fetchUserAndJoins();
  }, []);

  // Fetch user balances on mount
  useEffect(() => {
    const fetchBalances = async () => {
      const { data, error } = await supabase
        .from('user_info')
        .select('balance, bonuses, team_earnings, total_points')
        .eq('user_uid', userId)
        .single();
      if (!error && data) {
        setUserBalances({
          balance: data.balance ?? 0,
          bonuses: data.bonuses ?? 0,
          team_earnings: data.team_earnings ?? 0,
          total_points: data.total_points ?? 0,
        });
      }
    };
    if (userId) fetchBalances();
  }, [userId]);

  const handleJoinOffer = (offerId: string) => {
    setPendingOfferId(offerId);
    setShowBalanceModal(true);
  };

  const joinOffer = async (offerId: string) => {
    if (!userId) {
              toast({ title: t('common.error'), description: t('error.mustLogin'), variant: 'destructive' });
      return;
    }
    // Fetch offer details including join_limit, join_count, and user_join_limit
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('cost, join_limit, join_count, user_join_limit')
      .eq('id', offerId)
      .single();
    if (offerError || !offer) {
              toast({ title: t('common.error'), description: t('error.couldNotFetchOffer'), variant: 'destructive' });
      return;
    }
    // Check per-user join limit
    const userJoins = userJoinCounts[offerId] || 0;
    if (offer.user_join_limit && userJoins >= offer.user_join_limit) {
              toast({ title: t('common.error'), description: t('error.maxJoinsReached'), variant: 'destructive' });
      return;
    }
    if (offer.join_limit !== null && offer.join_count >= offer.join_limit) {
              toast({ title: t('common.error'), description: t('error.offerFullyBooked'), variant: 'destructive' });
      return;
    }
    // Fetch user balance
    const { data: userInfo, error: userError } = await supabase
      .from('user_info')
      .select('balance')
      .eq('user_uid', userId)
      .single();
    if (userError || !userInfo) {
              toast({ title: t('common.error'), description: t('error.couldNotFetchBalance'), variant: 'destructive' });
      return;
    }
    const cost = Number(offer.cost) || 0;
    if (userInfo.balance < cost) {
              toast({ title: t('common.error'), description: t('error.insufficientBalance'), variant: 'destructive' });
      return;
    }
    // Subtract cost from user balance
    const newBalance = userInfo.balance - cost;
    const { error: updateError } = await supabase
      .from('user_info')
      .update({ balance: newBalance })
      .eq('user_uid', userId);
    if (updateError) {
              toast({ title: t('common.error'), description: t('error.failedToUpdateBalance'), variant: 'destructive' });
      return;
    }
    // Log transaction for balance deposit (offer buy-in)
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'balance_deposit',
      amount: cost,
      status: 'completed',
      description: t('offers.balanceDeposit'),
      created_at: new Date().toISOString(),
    });
    // Insert join record
    const now = new Date().toISOString();
    const { error } = await supabase.from('offer_joins').insert([{ user_id: userId, offer_id: offerId, status: 'pending', approved_at: now, last_profit_at: now }]);
    if (error) {
              toast({ title: t('common.error'), description: t('error.failedToJoinOffer'), variant: 'destructive' });
      return;
    }
    // Increment join_count for the offer
    await supabase.from('offers').update({ join_count: offer.join_count + 1 }).eq('id', offerId);
            toast({ title: t('common.success'), description: t('success.joinRequestPending') });
    setJoinStatuses(prev => ({ ...prev, [offerId]: 'pending' }));
    // After successful join, update userJoinCounts
    setUserJoinCounts(prev => ({ ...prev, [offerId]: (prev[offerId] || 0) + 1 }));
  };

  // Add function to handle balance selection and join
  const handleSelectBalanceType = (type: 'balance' | 'bonuses' | 'team_earnings' | 'total_points') => {
    setPendingBalanceType(type);
    setShowUserConfirm(true);
    setPendingUserJoin(() => () => doJoinWithBalanceType(type));
  };

  // Move the actual join logic to a new function
  type BalanceType = 'balance' | 'bonuses' | 'team_earnings' | 'total_points';
  const doJoinWithBalanceType = async (type: BalanceType) => {
    setShowUserConfirm(false);
    if (!pendingOfferId || !userBalances) return;
    // Fetch offer details
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('cost, join_limit, join_count, user_join_limit')
      .eq('id', pendingOfferId)
      .single();
    if (offerError || !offer) {
      toast({ title: t('common.error'), description: t('error.couldNotFetchOffer'), variant: 'destructive' });
      setShowBalanceModal(false);
      return;
    }
    // Check per-user join limit
    const userJoins = userJoinCounts[pendingOfferId] || 0;
    if (offer.user_join_limit && userJoins >= offer.user_join_limit) {
      toast({ title: t('common.error'), description: t('error.maxJoinsReached'), variant: 'destructive' });
      setShowBalanceModal(false);
      return;
    }
    if (offer.join_limit !== null && offer.join_count >= offer.join_limit) {
      toast({ title: t('common.error'), description: t('error.offerFullyBooked'), variant: 'destructive' });
      setShowBalanceModal(false);
      return;
    }
    const cost = Number(offer.cost) || 0;
    if (type === 'total_points' && userBalances.total_points < cost) {
      toast({ title: t('common.error'), description: t('error.insufficientBalance'), variant: 'destructive' });
      setShowBalanceModal(false);
      return;
    }
    // Subtract cost from selected balance
    const newBalances = { ...userBalances, [type]: userBalances[type] - cost };
    const { error: updateError } = await supabase
      .from('user_info')
      .update({ [type]: newBalances[type] })
      .eq('user_uid', userId);
    if (updateError) {
      toast({ title: t('common.error'), description: t('error.failedToUpdateBalance'), variant: 'destructive' });
      setShowBalanceModal(false);
      return;
    }
    // Log transaction for deposit
    await supabase.from('transactions').insert({
      user_id: userId,
      type: `${type}_deposit`,
      amount: cost,
      status: 'completed',
      description: t('offers.balanceDeposit'),
      created_at: new Date().toISOString(),
    });
    // Insert join record
    const now = new Date().toISOString();
    const { error } = await supabase.from('offer_joins').insert([{ user_id: userId, offer_id: pendingOfferId, status: 'pending', approved_at: now, last_profit_at: now }]);
    if (error) {
      toast({ title: t('common.error'), description: t('error.failedToJoinOffer'), variant: 'destructive' });
      setShowBalanceModal(false);
      return;
    }
    await supabase.from('offers').update({ join_count: offer.join_count + 1 }).eq('id', pendingOfferId);
    toast({ title: t('common.success'), description: t('success.joinRequestPending') });
    setJoinStatuses(prev => ({ ...prev, [pendingOfferId]: 'pending' }));
    setUserJoinCounts(prev => ({ ...prev, [pendingOfferId]: (prev[pendingOfferId] || 0) + 1 }));
    setShowBalanceModal(false);
    setPendingOfferId(null);
    setSelectedBalanceType(null);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'trading': return 'bg-primary text-primary-foreground';
      case 'referral': return 'bg-success text-success-foreground';
      case 'premium': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen py-20 bg-gradient-to-br from-background via-background to-muted/20">
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

      <div className="container mx-auto px-4">
        {/* Enhanced Header */}
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {t('offers.title')}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground px-4 max-w-3xl mx-auto leading-relaxed">
            {t('offers.subtitle')}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 mx-auto"></div>
              <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-primary mx-auto"></div>
            </div>
            <p className="mt-6 text-lg text-muted-foreground font-medium">{t('offers.loading')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {offers.map((offer) => (
              <Card key={offer.id} className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden group hover:scale-105 transition-all duration-300" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardHeader className="relative">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      {offer.type && (
                        <Badge className={`${getTypeColor(offer.type)} shadow-lg font-medium`}>
                          {t(`offers.${offer.type}`) || offer.type}
                        </Badge>
                      )}
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        {language === 'ar' ? (offer.title_ar || offer.title_en) : (offer.title_en || offer.title_ar)}
                      </CardTitle>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-3xl font-bold text-primary">{offer.amount}</span>
                      {offer.join_limit !== null && (
                        offer.join_count >= (offer.join_limit || 0) ? (
                          <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20 shadow-lg">{t('offers.fullyBooked')}</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 shadow-lg">
                            {Math.max(0, (offer.join_limit || 0) - (offer.join_count || 0))} / {offer.join_limit} {t('offers.slots')}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="relative mb-6 overflow-hidden rounded-lg">
                    <img
                      src={offer.image_url || '/placeholder.svg'}
                      alt={language === 'ar' ? (offer.title_ar || offer.title_en) : (offer.title_en || offer.title_ar)}
                      className="w-full h-48 object-contain bg-gradient-to-br from-white to-gray-50 p-4 border border-gray-200 group-hover:scale-105 transition-transform duration-300"
                      onError={e => e.currentTarget.src = '/placeholder.svg'}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed text-lg">
                    {language === 'ar' ? (offer.description_ar || offer.description_en) : (offer.description_en || offer.description_ar)}
                  </p>
                  <div className="space-y-3 mb-8 text-sm">
                    {offer.cost !== undefined && offer.cost !== 0 && (
                      <div className="flex justify-between p-3 rounded-lg bg-gradient-to-r from-green-500/5 to-transparent border border-green-500/10">
                        <span className="text-muted-foreground font-medium">{t('offers.cost')}:</span>
                        <span className="font-bold text-green-600">{offer.cost} EGP</span>
                      </div>
                    )}
                    {offer.daily_profit !== undefined && offer.daily_profit !== 0 && (
                      <div className="flex justify-between p-3 rounded-lg bg-gradient-to-r from-blue-500/5 to-transparent border border-blue-500/10">
                        <span className="text-muted-foreground font-medium">{t('offers.dailyProfit')}:</span>
                        <span className="font-bold text-blue-600">{offer.daily_profit} EGP</span>
                      </div>
                    )}
                    {offer.monthly_profit !== undefined && offer.monthly_profit !== 0 && (
                      <div className="flex justify-between p-3 rounded-lg bg-gradient-to-r from-purple-500/5 to-transparent border border-purple-500/10">
                        <span className="text-muted-foreground font-medium">{t('offers.monthlyProfit')}:</span>
                        <span className="font-bold text-purple-600">{offer.monthly_profit} EGP</span>
                      </div>
                    )}
                    {offer.deadline && (
                      <div className="flex justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-500/5 to-transparent border border-yellow-500/10">
                        <span className="text-muted-foreground font-medium">{t('offers.deadline')}:</span>
                        <span className="font-bold text-yellow-600">{offer.deadline}</span>
                      </div>
                    )}
                    {offer.minAmount && (
                      <div className="flex justify-between p-3 rounded-lg bg-gradient-to-r from-orange-500/5 to-transparent border border-orange-500/10">
                        <span className="text-muted-foreground font-medium">{t('offers.minAmount')}:</span>
                        <span className="font-bold text-orange-600">{offer.minAmount} EGP</span>
                      </div>
                    )}
                  </div>
                  <Button
                    className={`w-full shadow-2xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-2xl active:scale-95 py-4 text-lg font-bold ${
                      joinStatuses[offer.id] === 'rejected' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                      joinStatuses[offer.id] === 'approved' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                      joinStatuses[offer.id] === 'pending' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' :
                      (offer.user_join_limit && (userJoinCounts[offer.id] || 0) >= offer.user_join_limit) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
                      'bg-gradient-to-r from-primary to-purple-600 text-white'
                    }`}
                    onClick={() => handleJoinOffer(offer.id)}
                    disabled={
                      joinStatuses[offer.id] === 'rejected' ||
                      joinStatuses[offer.id] === 'approved' ||
                      joinStatuses[offer.id] === 'pending' ||
                      (offer.user_join_limit && (userJoinCounts[offer.id] || 0) >= offer.user_join_limit) ||
                      (offer.join_limit !== null && offer.join_count >= offer.join_limit)
                    }
                  >
                    {joinStatuses[offer.id] === 'rejected' ? t('offers.notJoined') :
                     joinStatuses[offer.id] === 'approved' ? t('offers.joined') :
                     joinStatuses[offer.id] === 'pending' ? t('offers.pendingApproval') :
                     (offer.user_join_limit && (userJoinCounts[offer.id] || 0) >= offer.user_join_limit)
                       ? `${t('offers.maxJoined')} (${offer.user_join_limit})`
                       : (offer.join_limit !== null && offer.join_count >= offer.join_limit)
                         ? t('offers.fullyBooked')
                         : t('offers.join')}
                  </Button>
                  {offer.user_join_limit && (
                    <div className="text-sm text-muted-foreground mt-3 text-center font-medium">
                      {t('offers.joined')} {userJoinCounts[offer.id] || 0} / {offer.user_join_limit} {t('offers.times')}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Enhanced Notification Section */}
        <div className="mt-12 md:mt-16 text-center px-4">
          <Card className="max-w-3xl mx-auto shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
            <CardContent className="pt-10 pb-10 relative">
              <h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                {t('offers.notification.title')}
              </h3>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                {t('offers.notification.subtitle')}
              </p>
              <Button 
                variant="outline" 
                size="lg" 
                className="bg-gradient-to-r from-primary to-purple-600 border-0 text-white hover:scale-105 transition-all duration-300 shadow-2xl px-8 py-4 text-lg font-bold"
              >
                {t('offers.notification.button')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={showBalanceModal} onOpenChange={setShowBalanceModal}>
        <DialogContent className="max-w-md bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('offers.selectBalanceType')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-6">
            <button
              className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-300 hover:scale-105 shadow-lg group ${
                !userBalances || userBalances.balance <= 0
                  ? 'border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 dark:text-gray-500 cursor-not-allowed'
                  : 'border-green-500/20 bg-gradient-to-r from-green-500/5 to-green-600/5 hover:from-green-500/10 hover:to-green-600/10 hover:border-green-500/40 dark:border-green-400/30 dark:bg-gradient-to-r dark:from-green-950/20 dark:to-green-900/20 dark:hover:from-green-950/40 dark:hover:to-green-900/40 dark:hover:border-green-400/50'
              }`}
              onClick={() => handleSelectBalanceType('balance')}
              disabled={!userBalances || userBalances.balance <= 0}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-green-600 p-1 group-hover:scale-110 transition-transform duration-300">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="flex-1 text-left">
                <span className={`font-bold text-lg ${!userBalances || userBalances.balance <= 0 ? 'text-gray-400 dark:text-gray-500' : 'text-green-700 dark:text-green-400'}`}>
                  {t('profile.balance')}
                </span>
                <div className={`text-sm ${!userBalances || userBalances.balance <= 0 ? 'text-gray-400 dark:text-gray-500' : 'text-green-600/70 dark:text-green-400/70'}`}>
                  Available balance
                </div>
              </div>
              <span className={`font-bold text-xl ${!userBalances || userBalances.balance <= 0 ? 'text-gray-400 dark:text-gray-500' : 'text-green-700 dark:text-green-400'}`}>
                {userBalances?.balance ?? 0} EGP
              </span>
            </button>
            <button
              className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-300 hover:scale-105 shadow-lg group ${
                !userBalances || userBalances.total_points <= 0
                  ? 'border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 dark:text-gray-500 cursor-not-allowed'
                  : 'border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-blue-600/5 hover:from-blue-500/10 hover:to-blue-600/10 hover:border-blue-500/40 dark:border-blue-400/30 dark:bg-gradient-to-r dark:from-blue-950/20 dark:to-blue-900/20 dark:hover:from-blue-950/40 dark:hover:to-blue-900/40 dark:hover:border-blue-400/50'
              }`}
              onClick={() => handleSelectBalanceType('total_points')}
              disabled={!userBalances || userBalances.total_points <= 0}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 p-1 group-hover:scale-110 transition-transform duration-300">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex-1 text-left">
                <span className={`font-bold text-lg ${!userBalances || userBalances.total_points <= 0 ? 'text-gray-400 dark:text-gray-500' : 'text-blue-700 dark:text-blue-400'}`}>
                  {t('profile.totalPoints')}
                </span>
                <div className={`text-sm ${!userBalances || userBalances.total_points <= 0 ? 'text-gray-400 dark:text-gray-500' : 'text-blue-600/70 dark:text-blue-400/70'}`}>
                  Total points earned
                </div>
              </div>
              <span className={`font-bold text-xl ${!userBalances || userBalances.total_points <= 0 ? 'text-gray-400 dark:text-gray-500' : 'text-blue-700 dark:text-blue-400'}`}>
                {userBalances?.total_points ?? 0}
              </span>
            </button>
            <button
              className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-300 hover:scale-105 shadow-lg group ${
                !userBalances || userBalances.bonuses <= 0
                  ? 'border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 dark:text-gray-500 cursor-not-allowed'
                  : 'border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-yellow-600/5 hover:from-yellow-500/10 hover:to-yellow-600/10 hover:border-yellow-500/40 dark:border-yellow-400/30 dark:bg-gradient-to-r dark:from-yellow-950/20 dark:to-yellow-900/20 dark:hover:from-yellow-950/40 dark:hover:to-yellow-900/40 dark:hover:border-yellow-400/50'
              }`}
              onClick={() => handleSelectBalanceType('bonuses')}
              disabled={!userBalances || userBalances.bonuses <= 0}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 p-1 group-hover:scale-110 transition-transform duration-300">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <Gift className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="flex-1 text-left">
                <span className={`font-bold text-lg ${!userBalances || userBalances.bonuses <= 0 ? 'text-gray-400 dark:text-gray-500' : 'text-yellow-700 dark:text-yellow-400'}`}>
                  {t('profile.bonuses')}
                </span>
                <div className={`text-sm ${!userBalances || userBalances.bonuses <= 0 ? 'text-gray-400 dark:text-gray-500' : 'text-yellow-600/70 dark:text-yellow-400/70'}`}>
                  Bonus rewards
                </div>
              </div>
              <span className={`font-bold text-xl ${!userBalances || userBalances.bonuses <= 0 ? 'text-gray-400 dark:text-gray-500' : 'text-yellow-700 dark:text-yellow-400'}`}>
                {userBalances?.bonuses ?? 0} EGP
              </span>
            </button>
            <button
              className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-300 hover:scale-105 shadow-lg group ${
                !userBalances || userBalances.team_earnings <= 0
                  ? 'border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 dark:text-gray-500 cursor-not-allowed'
                  : 'border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-purple-600/5 hover:from-purple-500/10 hover:to-purple-600/10 hover:border-purple-500/40 dark:border-purple-400/30 dark:bg-gradient-to-r dark:from-purple-950/20 dark:to-purple-900/20 dark:hover:from-purple-950/40 dark:hover:to-purple-900/40 dark:hover:border-purple-400/50'
              }`}
              onClick={() => handleSelectBalanceType('team_earnings')}
              disabled={!userBalances || userBalances.team_earnings <= 0}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 p-1 group-hover:scale-110 transition-transform duration-300">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="flex-1 text-left">
                <span className={`font-bold text-lg ${!userBalances || userBalances.team_earnings <= 0 ? 'text-gray-400 dark:text-gray-500' : 'text-purple-700 dark:text-purple-400'}`}>
                  {t('profile.teamEarnings')}
                </span>
                <div className={`text-sm ${!userBalances || userBalances.team_earnings <= 0 ? 'text-gray-400 dark:text-gray-500' : 'text-purple-600/70 dark:text-purple-400/70'}`}>
                  Team commission
                </div>
              </div>
              <span className={`font-bold text-xl ${!userBalances || userBalances.team_earnings <= 0 ? 'text-gray-400 dark:text-gray-500' : 'text-purple-700 dark:text-purple-400'}`}>
                {userBalances?.team_earnings ?? 0} EGP
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={showUserConfirm} onOpenChange={setShowUserConfirm}>
        <ConfirmDialogContent className="max-w-md bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0">
          <ConfirmDialogHeader>
            <ConfirmDialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Are you sure you want to join this offer using {pendingBalanceType === 'balance' ? t('profile.balance') : pendingBalanceType === 'bonuses' ? t('profile.bonuses') : pendingBalanceType === 'team_earnings' ? t('profile.teamEarnings') : t('profile.totalPoints')}?
            </ConfirmDialogTitle>
          </ConfirmDialogHeader>
          <div className="flex justify-end gap-4 mt-8">
            <Button 
              variant="outline" 
              onClick={() => setShowUserConfirm(false)}
              className="border-2 border-primary/30 text-primary bg-gradient-to-r from-primary/5 to-purple-500/5 hover:from-primary/10 hover:to-purple-500/10 hover:scale-105 transition-all duration-300 shadow-lg"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => { setShowUserConfirm(false); if (pendingUserJoin) pendingUserJoin(); }}
              className="bg-gradient-to-r from-primary to-purple-600 border-0 text-white hover:scale-105 transition-all duration-300 shadow-2xl font-bold"
            >
              Confirm
            </Button>
          </div>
        </ConfirmDialogContent>
      </ConfirmDialog>
    </div>
  );
}
