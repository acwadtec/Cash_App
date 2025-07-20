
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground">
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

      {/* Enhanced Hero Section */}
      <section className="py-24 px-2 sm:px-4 bg-gradient-to-b from-background via-background to-primary/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
        <div className="container mx-auto text-center relative">
          <h1
            className="text-5xl md:text-7xl font-extrabold font-arabic mb-8 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent drop-shadow-lg tracking-tight leading-tight text-center"
            style={{
              letterSpacing: '0.01em',
              lineHeight: '1.1',
            }}
          >
            {t('home.hero.title')}
          </h1>
          <p
            className="text-xl md:text-3xl font-arabic font-light mb-12 max-w-3xl mx-auto text-muted-foreground text-center leading-relaxed"
            style={{
              lineHeight: '1.6',
            }}
          >
            {t('home.hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button
              asChild
              size="lg"
              className="text-lg px-10 py-4 shadow-2xl font-arabic font-bold transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-110 hover:shadow-2xl active:scale-95 bg-gradient-to-r from-primary to-purple-600 text-white border-0"
            >
              <Link to="/register">{t('home.hero.cta')}</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="text-lg px-10 py-4 font-arabic font-bold border-2 border-primary/30 text-primary bg-gradient-to-r from-primary/5 to-purple-500/5 hover:from-primary/10 hover:to-purple-500/10 hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary focus:outline-none transition-all duration-300 hover:scale-110 hover:shadow-2xl active:scale-95 shadow-lg backdrop-blur-sm"
            >
              <Link to="/read-more">{t('home.hero.readMore')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="py-20 px-2 sm:px-4 bg-gradient-to-b from-muted/30 to-background relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
        <div className="container mx-auto relative">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {t('home.features.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden group hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="pt-8 pb-8 relative">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary to-purple-600 p-1 group-hover:scale-110 transition-transform duration-300">
                    <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                      <feature.icon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-20 px-2 sm:px-4 bg-gradient-to-t from-background via-background to-primary/5 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
        <div className="container mx-auto text-center relative">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {t('home.cta.title')}
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            {t('home.cta.subtitle')}
          </p>
          <Button 
            asChild 
            size="lg" 
            className="text-xl px-12 py-5 shadow-2xl bg-gradient-to-r from-primary to-purple-600 text-white border-0 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-110 hover:shadow-2xl active:scale-95 font-bold"
          >
            <Link to="/register">{t('home.cta.button')}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
