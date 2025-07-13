import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

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
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [joinedOffers, setJoinedOffers] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

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
    const { error } = await supabase.from('offer_joins').insert([{ user_id: userId, offer_id: offerId }]);
    if (error) {
      toast({ title: 'Error', description: 'Failed to join offer.', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'You have joined the offer!' });
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
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('offers.title') || 'Available Offers'}</h1>
          <p className="text-xl text-muted-foreground">
            {t('offers.subtitle') || 'Discover available offers and get additional rewards'}
          </p>
        </div>

        {loading ? (
          <div className="text-center">Loading...</div>
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
                        <span className="text-muted-foreground">Cost:</span>
                        <span>${offer.cost}</span>
                      </div>
                    )}
                    {offer.daily_profit !== undefined && offer.daily_profit !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily Profit:</span>
                        <span>${offer.daily_profit}</span>
                      </div>
                    )}
                    {offer.monthly_profit !== undefined && offer.monthly_profit !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Profit:</span>
                        <span>${offer.monthly_profit}</span>
                      </div>
                    )}
                    {offer.deadline && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('offers.deadline') || 'Deadline:'}</span>
                        <span>{offer.deadline}</span>
                      </div>
                    )}
                    {offer.minAmount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('offers.minAmount') || 'Minimum:'}</span>
                        <span>${offer.minAmount}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full shadow-glow"
                    onClick={() => handleJoinOffer(offer.id)}
                    disabled={joinedOffers.includes(offer.id)}
                  >
                    {joinedOffers.includes(offer.id) ? 'Joined' : (t('offers.join') || 'Join Offer')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto gradient-card shadow-glow">
            <CardContent className="pt-8">
              <h3 className="text-2xl font-bold mb-4">{t('offers.notification.title') || "Don't Miss New Offers!"}</h3>
              <p className="text-muted-foreground mb-6">
                {t('offers.notification.subtitle') || 'Stay tuned for the latest offers and rewards.'}
              </p>
              <Button variant="outline" size="lg">
                {t('offers.notification.button') || 'Notify Me'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
