import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

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
    // Fetch user_info to check role
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    let role = 'user';
    if (user) {
      const { data: userInfo } = await supabase
        .from('user_info')
        .select('role')
        .eq('user_uid', user.id)
        .single();
      if (userInfo && userInfo.role === 'admin') {
        role = 'admin';
      }
    }
    toast({
      title: t('common.success'),
      description: t('login.success'),
    });
    localStorage.setItem('cash-logged-in', 'true');
    if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/profile');
    }
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <Card className="max-w-md mx-auto shadow-glow">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
              {t('login.title')}
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              {t('login.subtitle')}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('login.password')}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="h-12"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, rememberMe: checked as boolean }))
                    }
                  />
                  <Label htmlFor="rememberMe" className="text-sm">
                    {t('login.rememberMe')}
                  </Label>
                </div>
                <a href="#" className="text-sm text-primary hover:underline">
                  {t('login.forgotPassword')}
                </a>
              </div>

              <Button type="submit" className="w-full h-12 text-lg shadow-glow">
                {t('login.submit')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {t('login.noAccount')}{' '}
                <a href="/register" className="text-primary hover:underline font-medium">
                  {t('login.createAccount')}
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
