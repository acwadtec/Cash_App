
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Profile() {
  const { t } = useLanguage();

  // Mock user data
  const userData = {
    name: t('language.switch') === 'English' ? 'أحمد محمد' : 'Ahmed Mohammed',
    email: 'ahmed@example.com',
    phone: '+966501234567',
    verified: true,
    joinDate: '2024-01-15',
    stats: {
      teamEarnings: 2450.50,
      capital: 5000.00,
      personalEarnings: 1230.75,
      bonuses: 890.25,
      totalEarnings: 9571.50,
    },
    recentActivity: [
      { 
        type: 'bonus', 
        amount: 50, 
        date: '2024-07-01', 
        description: t('language.switch') === 'English' ? 'مكافأة إحالة صديق' : 'Friend referral bonus'
      },
      { 
        type: 'earning', 
        amount: 120, 
        date: '2024-06-30', 
        description: t('language.switch') === 'English' ? 'أرباح شخصية' : 'Personal earnings'
      },
      { 
        type: 'team', 
        amount: 200, 
        date: '2024-06-28', 
        description: t('language.switch') === 'English' ? 'أرباح الفريق' : 'Team earnings'
      },
    ]
  };

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
                    {userData.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center md:text-right">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">{userData.name}</h1>
                      <p className="text-muted-foreground mb-2">{userData.email}</p>
                      <p className="text-muted-foreground">{userData.phone}</p>
                    </div>
                    
                    <div className="flex flex-col items-center md:items-end gap-2">
                      <Badge className={userData.verified ? 'bg-success' : 'bg-warning'}>
                        {userData.verified ? t('profile.verified') : t('profile.pending')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {t('profile.memberSince')} {userData.joinDate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard title={t('profile.totalEarnings')} value={userData.stats.totalEarnings} color="text-success" />
            <StatCard title={t('profile.teamEarnings')} value={userData.stats.teamEarnings} />
            <StatCard title={t('profile.capital')} value={userData.stats.capital} />
            <StatCard title={t('profile.personalEarnings')} value={userData.stats.personalEarnings} />
            <StatCard title={t('profile.bonuses')} value={userData.stats.bonuses} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>{t('profile.recentActivity')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userData.recentActivity.map((activity, index) => (
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
