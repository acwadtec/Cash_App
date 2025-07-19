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
}

export default function Offers() {
  const { t } = useLanguage();
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

  const handleJoinOffer = async (offerId: string) => {
    // Check verification first
    const canProceed = requireVerification(() => {
      // This will only run if user is verified
      joinOffer(offerId);
    });
    
    if (!canProceed) {
      return; // User is not verified, alert already shown
    }
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'trading': return 'bg-primary text-primary-foreground';
      case 'referral': return 'bg-success text-success-foreground';
      case 'premium': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen py-20">
      {/* Removed test buttons for profit accrual */}
      {/* Alert for incomplete account information */}
      {showAlert && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {t('common.completeProfile')}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-4xl font-bold mb-4">{t('offers.title')}</h1>
          <p className="text-base md:text-xl text-muted-foreground px-4">
            {t('offers.subtitle')}
          </p>
        </div>

        {loading ? (
          <div className="text-center">{t('offers.loading')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {offers.map((offer) => (
              <Card key={offer.id} className="shadow-card hover:shadow-glow transition-all duration-300">
                <CardHeader>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      {offer.type && (
                        <Badge className={getTypeColor(offer.type)}>
                          {t(`offers.${offer.type}`) || offer.type}
                        </Badge>
                      )}
                      <CardTitle className="text-xl font-bold">
                        {offer.title}
                      </CardTitle>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-2xl font-bold text-primary">{offer.amount}</span>
                      {offer.join_limit !== null && (
                        offer.join_count >= (offer.join_limit || 0) ? (
                          <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200 mt-1">{t('offers.fullyBooked')}</Badge>
                        ) : (
                                                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 mt-1">
                              {Math.max(0, (offer.join_limit || 0) - (offer.join_count || 0))} / {offer.join_limit} {t('offers.slots')}
                            </Badge>
                        )
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <img
                    src={offer.image_url || '/placeholder.svg'}
                    alt={offer.title}
                    className="w-full h-40 object-contain rounded mb-4 bg-white p-2 border"
                    onError={e => e.currentTarget.src = '/placeholder.svg'}
                  />
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {offer.description}
                  </p>
                  <div className="space-y-2 mb-6 text-sm">
                    {offer.cost !== undefined && offer.cost !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('offers.cost')}:</span>
                        <span>${offer.cost}</span>
                      </div>
                    )}
                    {offer.daily_profit !== undefined && offer.daily_profit !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('offers.dailyProfit')}:</span>
                        <span>${offer.daily_profit}</span>
                      </div>
                    )}
                    {offer.monthly_profit !== undefined && offer.monthly_profit !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('offers.monthlyProfit')}:</span>
                        <span>${offer.monthly_profit}</span>
                      </div>
                    )}
                    {offer.deadline && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('offers.deadline')}:</span>
                        <span>{offer.deadline}</span>
                      </div>
                    )}
                    {offer.minAmount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('offers.minAmount')}:</span>
                        <span>${offer.minAmount}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    className={`w-full shadow-glow transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95 ${
                      joinStatuses[offer.id] === 'rejected' ? 'bg-red-500 hover:bg-red-600 text-white' :
                      joinStatuses[offer.id] === 'approved' ? 'bg-green-500 hover:bg-green-600 text-white' :
                      joinStatuses[offer.id] === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                      (offer.user_join_limit && (userJoinCounts[offer.id] || 0) >= offer.user_join_limit) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : ''
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
                    <div className="text-xs text-muted-foreground mt-1 text-center">
                      {t('offers.joined')} {userJoinCounts[offer.id] || 0} / {offer.user_join_limit} {t('offers.times')}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 md:mt-12 text-center px-4">
          <Card className="max-w-2xl mx-auto gradient-card shadow-glow">
            <CardContent className="pt-8">
              <h3 className="text-2xl font-bold mb-4">{t('offers.notification.title')}</h3>
              <p className="text-muted-foreground mb-6">
                {t('offers.notification.subtitle')}
              </p>
                              <Button variant="outline" size="lg" className="transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95">
                  {t('offers.notification.button')}
                </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
