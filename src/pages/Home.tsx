
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shield, Zap, Clock } from 'lucide-react';

export default function Home() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Shield,
      title: t('features.secure'),
      description: t('features.secure.desc'),
    },
    {
      icon: Zap,
      title: t('features.fast'),
      description: t('features.fast.desc'),
    },
    {
      icon: Clock,
      title: t('features.support'),
      description: t('features.support.desc'),
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-5"></div>
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 animate-fade-up">
              {t('home.title')}
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 animate-fade-up">
              {t('home.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up">
              <Button asChild size="lg" className="text-lg px-8 py-6 shadow-glow">
                <Link to="/register">{t('home.cta')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                <Link to="/login">{t('home.login')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-accent/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center p-8 shadow-card hover:shadow-glow transition-all duration-300 animate-scale-in">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 mx-auto mb-6 gradient-primary rounded-2xl flex items-center justify-center">
                    <feature.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="gradient-card shadow-glow max-w-2xl mx-auto text-center p-12">
            <CardContent>
              <h2 className="text-3xl font-bold mb-4 text-primary">
                {t('home.cta2.title')}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {t('home.cta2.subtitle')}
              </p>
              <Button asChild size="lg" className="px-8 py-6">
                <Link to="/register">{t('home.cta2.button')}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
