import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/utils';
import { useState, useEffect } from 'react';

export default function Profile() {
  const { t } = useLanguage();
  const form = useForm();
  const [uploading, setUploading] = useState(false);
  const [hasUserInfo, setHasUserInfo] = useState(false);
  const [loadingUserInfo, setLoadingUserInfo] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUserInfo = async () => {
      setLoadingUserInfo(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setLoadingUserInfo(false);
        return;
      }
      const user = userData.user;
      setUser(user);
      const { data, error } = await supabase
        .from('user_info')
        .select('*')
        .eq('user_uid', user.id)
        .single();
      if (data) {
        setHasUserInfo(true);
        setUserInfo(data);
      } else {
        setHasUserInfo(false);
      }
      setLoadingUserInfo(false);
    };
    checkUserInfo();
  }, []);

  const StatCard = ({ title, value, color = 'text-primary' }: { title: string; value: number; color?: string }) => (
    <Card className="text-center shadow-card">
      <CardContent className="pt-6">
        <div className={`text-3xl font-bold ${color} mb-2`}>
          ${value.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">{title}</div>
      </CardContent>
    </Card>
  );

  const onSubmit = async (data: any) => {
    setUploading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error('لم يتم العثور على المستخدم');
      const user = userData.user;
      const idFrontFile = data.idFront[0];
      const idBackFile = data.idBack[0];
      let idFrontUrl = '';
      let idBackUrl = '';
      if (idFrontFile) {
        const frontPath = `${user.id}/front-${Date.now()}-${idFrontFile.name}`;
        const { data: frontData, error: frontError } = await supabase.storage.from('id-photos').upload(frontPath, idFrontFile);
        if (frontError) throw frontError;
        idFrontUrl = supabase.storage.from('id-photos').getPublicUrl(frontData.path).data.publicUrl;
      }
      if (idBackFile) {
        const backPath = `${user.id}/back-${Date.now()}-${idBackFile.name}`;
        const { data: backData, error: backError } = await supabase.storage.from('id-photos').upload(backPath, idBackFile);
        if (backError) throw backError;
        idBackUrl = supabase.storage.from('id-photos').getPublicUrl(backData.path).data.publicUrl;
      }
      const { error } = await supabase.from('user_info').insert([
        {
          user_uid: user.id,
          email: user.email,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          wallet: data.wallet,
          id_front_url: idFrontUrl,
          id_back_url: idBackUrl,
          role: 'user',
        },
      ]);
      if (error) throw error;
      toast({ title: t('common.success'), description: 'تم حفظ البيانات بنجاح' });
      form.reset();
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message || 'حدث خطأ أثناء الحفظ' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-8 shadow-glow">
            <CardContent className="pt-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {user ? (
                      user.user_metadata?.username
                        ? user.user_metadata.username.split(' ').map((n: string) => n[0]).join('')
                        : user.email
                          ? user.email[0].toUpperCase()
                          : user.id.slice(0, 2).toUpperCase()
                    ) : ''}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center md:text-right">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">
                        {userInfo?.displayName ||
                         user?.user_metadata?.displayName ||
                         user?.user_metadata?.username ||
                         user?.email}
                      </h1>
                      <p className="text-muted-foreground mb-2">{user?.email}</p>
                      <p className="text-muted-foreground">{userInfo?.phone || ''}</p>
                    </div>
                    
                    <div className="flex flex-col items-center md:items-end gap-2">
                      <Badge className={userInfo?.verified ? 'bg-success' : 'bg-warning'}>
                        {userInfo?.verified ? t('profile.verified') : t('profile.pending')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {t('profile.memberSince')} {userInfo?.joinDate || ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard title={t('profile.totalEarnings')} value={userInfo?.stats?.totalEarnings || 0} color="text-success" />
            <StatCard title={t('profile.teamEarnings')} value={userInfo?.stats?.teamEarnings || 0} />
            <StatCard title={t('profile.capital')} value={userInfo?.stats?.capital || 0} />
            <StatCard title={t('profile.personalEarnings')} value={userInfo?.stats?.personalEarnings || 0} />
            <StatCard title={t('profile.bonuses')} value={userInfo?.stats?.bonuses || 0} />
          </div>

          {/* New User Info Form */}
          {!loadingUserInfo && !hasUserInfo && (
            <Card className="mt-8 shadow-glow">
              <CardHeader>
                <CardTitle>{t('profile.updateAccountInfo') || 'تحديث بيانات الحساب'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label>{t('profile.firstName') || 'الاسم الأول'}</label>
                      <Input type="text" placeholder={t('profile.firstNamePlaceholder') || ''} {...form.register('firstName', { required: true })} />
                    </div>
                    <div>
                      <label>{t('profile.lastName') || 'اسم العائلة'}</label>
                      <Input type="text" placeholder={t('profile.lastNamePlaceholder') || ''} {...form.register('lastName', { required: true })} />
                    </div>
                  </div>
                  <div>
                    <label>{t('profile.phone') || 'رقم الهاتف'}</label>
                    <Input type="text" placeholder={t('profile.phonePlaceholder') || ''} {...form.register('phone', { required: true })} />
                  </div>
                  <div>
                    <label>{t('profile.wallet') || 'المحفظة الإلكترونية'}</label>
                    <Select {...form.register('wallet', { required: true })} onValueChange={val => form.setValue('wallet', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('profile.selectWallet') || 'اختر المحفظة'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vodafone cash">{t('profile.walletVodafone') || 'فودافون كاش'}</SelectItem>
                        <SelectItem value="orange cash">{t('profile.walletOrange') || 'أورنج كاش'}</SelectItem>
                        <SelectItem value="we pay">{t('profile.walletWePay') || 'وي باي'}</SelectItem>
                        <SelectItem value="etisalate cash">{t('profile.walletEtisalat') || 'اتصالات كاش'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label>{t('profile.idFront') || 'صورة الهوية - الوجه الأمامي'}</label>
                      <Input type="file" accept="image/*" {...form.register('idFront', { required: true })} />
                    </div>
                    <div>
                      <label>{t('profile.idBack') || 'صورة الهوية - الوجه الخلفي'}</label>
                      <Input type="file" accept="image/*" {...form.register('idBack', { required: true })} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={uploading}>
                    {uploading ? t('profile.saving') || 'جاري الحفظ...' : t('profile.save') || 'حفظ البيانات'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Optionally, display user info if exists */}
          {!loadingUserInfo && hasUserInfo && userInfo && (
            <Card className="mt-8 shadow-glow">
              <CardHeader>
                <CardTitle>بياناتك المحفوظة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>الاسم الأول: {userInfo.first_name}</div>
                  <div>اسم العائلة: {userInfo.last_name}</div>
                  <div>رقم الهاتف: {userInfo.phone}</div>
                  <div>المحفظة الإلكترونية: {userInfo.wallet}</div>
                  <div>صورة الهوية - الوجه الأمامي: <a href={userInfo.id_front_url} target="_blank" rel="noopener noreferrer">عرض</a></div>
                  <div>صورة الهوية - الوجه الخلفي: <a href={userInfo.id_back_url} target="_blank" rel="noopener noreferrer">عرض</a></div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>{t('profile.recentActivity')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userInfo?.recentActivity?.map((activity, index) => (
                    <div key={index} className="flex justify-between items-center p-4 rounded-lg bg-accent/20">
                      <div>
                        <p className="font-medium">{activity.description}</p>
                        <p className="text-sm text-muted-foreground">{activity.date}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-success">
                          +${activity.amount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Account Status */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>{t('profile.accountStatus')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span>{t('profile.emailVerification')}</span>
                    <Badge className="bg-success">{t('profile.completed')}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('profile.phoneVerification')}</span>
                    <Badge className="bg-success">{t('profile.completed')}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('profile.identityVerification')}</span>
                    <Badge className="bg-success">{t('profile.completed')}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('profile.accountLevel')}</span>
                    <Badge className="bg-primary">{t('profile.advanced')}</Badge>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-lg gradient-card">
                  <h4 className="font-semibold mb-2">{t('profile.withdrawalStatus')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.withdrawalEligible')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
