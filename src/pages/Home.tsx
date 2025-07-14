
import { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shield, Zap, Clock, AlertTriangle } from 'lucide-react';
import { supabase, checkIfUserIsAdmin } from '@/lib/supabase';
import { useState } from 'react';

export default function Home() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      if (localStorage.getItem('cash-logged-in')) {
        // Check if user is admin
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (user) {
          const isAdmin = await checkIfUserIsAdmin(user.id);
          
          // Don't redirect admins automatically - let them use the toggle button
          // Only check user_info for non-admin users
          if (!isAdmin) {
            // Check if user has user_info data
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
          
          // User has info or is admin, can stay on home page
        }
      }
    };
    redirectIfLoggedIn();
  }, [navigate]);

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
    <div className="min-h-screen bg-background">
      {/* Alert for incomplete account information */}
      {showAlert && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {t('common.completeProfile') || 'Please complete your account information to access the website. Redirecting to profile setup...'}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 gradient-primary bg-clip-text text-transparent">
            {t('home.hero.title')}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('home.hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8 py-3 shadow-glow">
              <Link to="/register">{t('home.hero.cta')}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3">
              <Link to="/offers">{t('home.hero.learnMore')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t('home.features.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center shadow-glow">
                <CardContent className="pt-6">
                  <feature.icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">{t('home.cta.title')}</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('home.cta.subtitle')}
          </p>
          <Button asChild size="lg" className="text-lg px-8 py-3 shadow-glow">
            <Link to="/register">{t('home.cta.button')}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
