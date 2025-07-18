import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect, useState } from 'react';
import { supabase, checkIfUserIsAdmin, testAccrueDailyOfferProfits, testAccrueMonthlyOfferProfits } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

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
}

export default function Offers() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [joinedOffers, setJoinedOffers] = useState<string[]>([]);
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
        const { data: joins } = await supabase
          .from('offer_joins')
          .select('offer_id')
          .eq('user_id', user.id);
        setJoinedOffers(joins ? joins.map(j => j.offer_id) : []);
      }
    };
    fetchUserAndJoins();
  }, []);

  const handleJoinOffer = async (offerId: string) => {
    if (!userId) {
      toast({ title: 'Error', description: 'You must be logged in to join an offer.', variant: 'destructive' });
      return;
    }
    // Fetch user balance
    const { data: userInfo, error: userError } = await supabase
      .from('user_info')
      .select('balance')
      .eq('user_uid', userId)
      .single();
    if (userError || !userInfo) {
      toast({ title: 'Error', description: 'Could not fetch user balance.', variant: 'destructive' });
      return;
    }
    // Fetch offer cost
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('cost')
      .eq('id', offerId)
      .single();
    if (offerError || !offer) {
      toast({ title: 'Error', description: 'Could not fetch offer cost.', variant: 'destructive' });
      return;
    }
    const cost = Number(offer.cost) || 0;
    if (userInfo.balance < cost) {
      toast({ title: 'Error', description: 'Insufficient balance to join this offer.', variant: 'destructive' });
      return;
    }
    // Subtract cost from user balance
    const newBalance = userInfo.balance - cost;
    const { error: updateError } = await supabase
      .from('user_info')
      .update({ balance: newBalance })
      .eq('user_uid', userId);
    if (updateError) {
      toast({ title: 'Error', description: 'Failed to update balance.', variant: 'destructive' });
      return;
    }
    // Log transaction for capital deposit (offer buy-in)
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'capital_deposit',
      amount: cost,
      status: 'completed',
      description: `Capital deposit for joining offer`,
      created_at: new Date().toISOString(),
    });
    // Insert join record
    const now = new Date().toISOString();
    const { error } = await supabase.from('offer_joins').insert([{ user_id: userId, offer_id: offerId, status: 'pending', approved_at: now, last_profit_at: now }]);
    if (error) {
      toast({ title: 'Error', description: 'Failed to join offer.', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Your join request is pending admin approval.' });
      setJoinedOffers(prev => [...prev, offerId]);
    }
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
              {t('common.completeProfile') || 'Please complete your account information to access offers. Redirecting to profile setup...'}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('offers.title') || 'Available Offers'}</h1>
          <p className="text-xl text-muted-foreground">
            {t('offers.subtitle') || 'Discover available offers and get additional rewards'}
          </p>
        </div>

        {loading ? (
          <div className="text-center">{t('offers.loading')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <Card key={offer.id} className="shadow-card hover:shadow-glow transition-all duration-300">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    {offer.type && (
                      <Badge className={getTypeColor(offer.type)}>
                        {t(`offers.${offer.type}`) || offer.type}
                      </Badge>
                    )}
                    <span className="text-2xl font-bold text-primary">
                      {offer.amount}
                    </span>
                  </div>
                  <CardTitle className="text-xl">
                    {offer.title}
                  </CardTitle>
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
                    className="w-full shadow-glow transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95"
                    onClick={() => handleJoinOffer(offer.id)}
                    disabled={joinedOffers.includes(offer.id)}
                  >
                    {joinedOffers.includes(offer.id) ? t('offers.joined') : t('offers.join')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto gradient-card shadow-glow">
            <CardContent className="pt-8">
              <h3 className="text-2xl font-bold mb-4">{t('offers.notification.title')}</h3>
              <p className="text-muted-foreground mb-6">
                {t('offers.notification.subtitle') || t('offers.stayTuned')}
              </p>
              <Button variant="outline" size="lg" className="transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95">
                {t('offers.notification.button') || t('offers.notifyMe')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
