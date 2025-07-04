import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import React, { useEffect, useState } from 'react';

interface Offer {
  id: string;
  title: string;
  description: string;
  amount: number;
  type?: string;
  deadline?: string;
  minAmount?: number;
}

export default function Offers() {
  const { t } = useLanguage();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOffers = async () => {
      setLoading(true);
      const res = await fetch('http://localhost:4000/api/offers');
      const data = await res.json();
      setOffers(data);
      setLoading(false);
    };
    fetchOffers();
  }, []);

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
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {offer.description}
                  </p>
                  <div className="space-y-2 mb-6 text-sm">
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
                  <Button className="w-full shadow-glow">
                    {t('offers.join') || 'Join Offer'}
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
