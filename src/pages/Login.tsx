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
        description: error.message,
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{t('login.title')}</CardTitle>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Input
                type="email"
                  name="email"
                placeholder={t('login.email')}
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            <div>
                <Input
                type="password"
                  name="password"
                placeholder={t('login.password')}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('common.loading') : t('login.submit')}
              </Button>
            </form>
          <div className="mt-4 text-center">
            <Link to="/register" className="text-primary hover:underline">
              {t('login.noAccount')}
            </Link>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
