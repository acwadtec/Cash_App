
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Offers() {
  const { t } = useLanguage();

  // Mock offers data with translation support
  const offers = [
    {
      id: 1,
      titleKey: 'offers.weekly',
      descriptionKey: 'offers.weekly.desc',
      bonus: '10%',
      type: 'trading',
      deadline: '2024-07-15',
      minAmount: 100,
    },
    {
      id: 2,
      titleKey: 'offers.referral.title',
      descriptionKey: 'offers.referral.desc',
      bonus: '50',
      type: 'referral',
      deadline: '2024-08-01',
      minAmount: 0,
    },
    {
      id: 3,
      titleKey: 'offers.advanced.title',
      descriptionKey: 'offers.advanced.desc',
      bonus: '15%',
      type: 'premium',
      deadline: '2024-07-30',
      minAmount: 1000,
    },
  ];

  // Fallback titles and descriptions for offers
  const offerTexts = {
    'offers.weekly': t('language.switch') === 'English' ? 'Weekly Trading Offer' : 'عرض التداول الأسبوعي',
    'offers.weekly.desc': t('language.switch') === 'English' ? 'Get 10% extra bonus on all trading operations this week' : 'احصل على 10% مكافأة إضافية على جميع عمليات التداول هذا الأسبوع',
    'offers.referral.title': t('language.switch') === 'English' ? 'Referral Bonus' : 'مكافأة الإحالة',
    'offers.referral.desc': t('language.switch') === 'English' ? 'Invite your friends and get 50 points for each new friend' : 'ادع أصدقاءك واحصل على 50 نقطة عن كل صديق جديد',
    'offers.advanced.title': t('language.switch') === 'English' ? 'Advanced Trader Offer' : 'عرض المتداول المتقدم',
    'offers.advanced.desc': t('language.switch') === 'English' ? 'For advanced traders: Get 15% bonus on large trades' : 'للمتداولين المتقدمين: احصل على 15% مكافأة على التداولات الكبيرة',
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
          <h1 className="text-4xl font-bold mb-4">{t('offers.title')}</h1>
          <p className="text-xl text-muted-foreground">
            {t('offers.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <Card key={offer.id} className="shadow-card hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge className={getTypeColor(offer.type)}>
                    {t(`offers.${offer.type}`)}
                  </Badge>
                  <span className="text-2xl font-bold text-primary">
                    {offer.bonus}{offer.type === 'referral' ? ` ${t('language.switch') === 'English' ? 'points' : 'نقطة'}` : ''}
                  </span>
                </div>
                <CardTitle className="text-xl">
                  {offerTexts[offer.titleKey as keyof typeof offerTexts]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {offerTexts[offer.descriptionKey as keyof typeof offerTexts]}
                </p>
                
                <div className="space-y-2 mb-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('offers.deadline')}</span>
                    <span>{offer.deadline}</span>
                  </div>
                  {offer.minAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('offers.minAmount')}</span>
                      <span>${offer.minAmount}</span>
                    </div>
                  )}
                </div>

                <Button className="w-full shadow-glow">
                  {t('offers.join')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto gradient-card shadow-glow">
            <CardContent className="pt-8">
              <h3 className="text-2xl font-bold mb-4">{t('offers.notification.title')}</h3>
              <p className="text-muted-foreground mb-6">
                {t('offers.notification.subtitle')}
              </p>
              <Button variant="outline" size="lg">
                {t('offers.notification.button')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
