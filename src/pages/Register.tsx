
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName || !formData.email || !formData.password) {
      toast({
        title: t('common.error'),
        description: t('register.required'),
        variant: 'destructive',
      });
      return;
    }
    // Supabase sign up
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          displayName: formData.displayName,
        },
      },
    });
    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: t('common.success'),
      description: t('register.success'),
    });
    navigate('/login');
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto shadow-glow">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
              {t('register.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t('register.displayName') || 'Display Name'}</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('register.email')}</Label>
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
                <Label htmlFor="password">{t('register.password') || t('login.password') || 'Password'}</Label>
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
              <Button type="submit" className="w-full h-12 text-lg shadow-glow">
                {t('register.submit')}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {t('register.hasAccount')}{' '}
                <a href="/login" className="text-primary hover:underline font-medium">
                  {t('register.login')}
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
