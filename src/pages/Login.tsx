import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { supabase, checkIfUserIsAdmin } from '@/lib/supabase';
import { Link } from 'react-router-dom';

export default function Login() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: t('common.error'),
        description: t('login.error'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
    // Supabase Auth login
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
      
    if (error) {
      toast({
        title: t('common.error'),
        description: t('login.error'),
        variant: 'destructive',
      });
      return;
    }

      // Check if user is admin using new admins table
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
      
    if (user) {
        const isAdmin = await checkIfUserIsAdmin(user.id);
        
    toast({
      title: t('common.success'),
      description: t('login.success'),
    });
        
    localStorage.setItem('cash-logged-in', 'true');
        
        // Don't redirect admins automatically - let them use the toggle button
        // Check if user has user_info data (for non-admin users)
        const { data: userInfo } = await supabase
          .from('user_info')
          .select('user_uid')
          .eq('user_uid', user.id)
          .single();
        
        if (userInfo) {
          // User has info, go to home page
          navigate('/');
    } else {
          // User doesn't have info, go to update account
          navigate('/update-account');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: t('common.error'),
        description: t('login.unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
      <div className="relative w-full max-w-md mx-4">
        <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
          <CardHeader className="relative text-center pb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary to-purple-600 p-1">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <div className="text-3xl">🔐</div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('login.title')}
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              {t('login.subtitle')}
            </p>
          </CardHeader>
          <CardContent className="relative px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Input
                  type="email"
                  name="email"
                  placeholder={t('login.email')}
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="h-12 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 focus:border-primary/50 transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  name="password"
                  placeholder={t('login.password')}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="h-12 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 focus:border-primary/50 transition-all duration-300"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-primary to-purple-600 border-0 text-white hover:scale-105 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:shadow-2xl active:scale-95 font-bold text-lg" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    {t('common.loading')}
                  </div>
                ) : (
                  t('login.submit')
                )}
              </Button>
            </form>
            <div className="mt-8 text-center">
              <Link 
                to="/register" 
                className="text-primary hover:text-primary/80 font-medium transition-colors duration-300 hover:scale-105 inline-block"
              >
                {t('login.noAccount')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
