import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Users, FileCheck, Gift, DollarSign, Bell, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OffersTable from '@/components/OffersTable';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
  });
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Mock data
  const stats = {
    totalUsers: 1247,
    pendingVerifications: 23,
    activeOffers: 8,
    pendingWithdrawals: 15,
  };

  const mockWithdrawals = [
    { id: 1, user: 'أحمد محمد', amount: 250, type: 'personal', method: 'bank', date: '2024-07-01' },
    { id: 2, user: 'فاطمة أحمد', amount: 150, type: 'bonus', method: 'wallet', date: '2024-07-02' },
    { id: 3, user: 'محمد علي', amount: 300, type: 'team', method: 'crypto', date: '2024-07-03' },
  ];

  const handleSendNotification = () => {
    if (!notificationData.title || !notificationData.message) {
      toast({
        title: t('common.error'),
        description: 'يرجى ملء جميع الحقول',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: t('common.success'),
      description: 'تم إرسال الإشعار بنجاح',
    });

    setNotificationData({ title: '', message: '' });
  };

  const handleExport = (type: string) => {
    toast({
      title: t('common.success'),
      description: `تم تصدير ${type} بنجاح`,
    });
  };

  const StatCard = ({ title, value, icon: Icon, color = 'text-primary' }: { 
    title: string; 
    value: number; 
    icon: any; 
    color?: string 
  }) => (
    <Card className="shadow-card">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  useEffect(() => {
    const fetchOffers = async () => {
      setLoadingOffers(true);
      const { data, error } = await supabase.from('offers').select('*');
      if (error) {
        console.error('Error fetching offers:', error);
        setOffers([]);
      } else {
        setOffers(data || []);
      }
      setLoadingOffers(false);
    };
    fetchOffers();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      const { data, error } = await supabase.from('users').select('*');
      if (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
      setLoadingUsers(false);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) {
        const { data: userInfo } = await supabase
          .from('user_info')
          .select('role')
          .eq('user_uid', user.id)
          .single();
        if (!userInfo || userInfo.role !== 'admin') {
          navigate('/profile');
        }
      } else {
        navigate('/login');
      }
    };
    checkAdmin();
  }, [navigate]);

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
              {t('admin.title')}
            </h1>
            <p className="text-muted-foreground">{t('admin.overview')}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title={t('admin.stats.totalUsers')} 
              value={stats.totalUsers} 
              icon={Users} 
              color="text-blue-600" 
            />
            <StatCard 
              title={t('admin.stats.pendingVerifications')} 
              value={stats.pendingVerifications} 
              icon={FileCheck} 
              color="text-orange-600" 
            />
            <StatCard 
              title={t('admin.stats.activeOffers')} 
              value={stats.activeOffers} 
              icon={Gift} 
              color="text-green-600" 
            />
            <StatCard 
              title={t('admin.stats.pendingWithdrawals')} 
              value={stats.pendingWithdrawals} 
              icon={DollarSign} 
              color="text-red-600" 
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="users">{t('admin.users')}</TabsTrigger>
              <TabsTrigger value="offers">{t('admin.offers')}</TabsTrigger>
              <TabsTrigger value="withdrawals">{t('admin.withdrawals')}</TabsTrigger>
              <TabsTrigger value="transactions">{t('admin.transactions')}</TabsTrigger>
              <TabsTrigger value="notifications">{t('admin.notifications')}</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.users')}</CardTitle>
                  <Button onClick={() => handleExport('المستخدمين')} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    {t('admin.export.users')}
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.users.name')}</TableHead>
                        <TableHead>{t('admin.users.email')}</TableHead>
                        <TableHead>{t('admin.users.phone')}</TableHead>
                        <TableHead>{t('admin.users.status')}</TableHead>
                        <TableHead>{t('admin.users.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingUsers ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.phone}</TableCell>
                            <TableCell>
                              <Badge className={user.status === 'verified' ? 'bg-success' : 'bg-warning'}>
                                {user.status === 'verified' ? 'Verified' : 'Pending'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline">
                                  View
                                </Button>
                                {user.status === 'pending' && (
                                  <Button size="sm" className="bg-success">
                                    Verify
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Offers Tab */}
            <TabsContent value="offers">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.offers')}</CardTitle>
                  <Button onClick={() => navigate('/manage-offers')} className="mt-4">
                    Manage Offers
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingOffers ? (
                    <div>Loading...</div>
                  ) : (
                    <OffersTable offers={offers} showActions={false} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Withdrawals Tab */}
            <TabsContent value="withdrawals">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>{t('admin.withdrawals')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.withdrawals.user')}</TableHead>
                        <TableHead>{t('admin.withdrawals.amount')}</TableHead>
                        <TableHead>{t('admin.withdrawals.type')}</TableHead>
                        <TableHead>{t('admin.withdrawals.method')}</TableHead>
                        <TableHead>{t('admin.withdrawals.date')}</TableHead>
                        <TableHead>{t('admin.users.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockWithdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell className="font-medium">{withdrawal.user}</TableCell>
                          <TableCell>${withdrawal.amount}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{withdrawal.type}</Badge>
                          </TableCell>
                          <TableCell>{withdrawal.method}</TableCell>
                          <TableCell>{withdrawal.date}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" className="bg-success">
                                {t('admin.withdrawals.approve')}
                              </Button>
                              <Button size="sm" variant="destructive">
                                {t('admin.withdrawals.reject')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.transactions')}</CardTitle>
                  <Button onClick={() => handleExport('المعاملات')} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    {t('admin.export.transactions')}
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    سجل شامل لجميع معاملات المنصة متاح للمراجعة والتصدير
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    {t('admin.notifications')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="notificationTitle">{t('admin.notifications.title')}</Label>
                        <Input
                          id="notificationTitle"
                          value={notificationData.title}
                          onChange={(e) => setNotificationData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="عنوان الإشعار"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notificationMessage">{t('admin.notifications.message')}</Label>
                        <textarea
                          id="notificationMessage"
                          value={notificationData.message}
                          onChange={(e) => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="نص الرسالة"
                          className="w-full h-32 px-3 py-2 border border-input rounded-md resize-none"
                        />
                      </div>
                      <Button onClick={handleSendNotification} className="w-full">
                        {t('admin.notifications.sendToAll')}
                      </Button>
                    </div>
                    <div className="p-4 bg-accent rounded-lg">
                      <h4 className="font-semibold mb-2">معاينة الإشعار</h4>
                      <div className="bg-background p-3 rounded border">
                        <h5 className="font-medium">{notificationData.title || 'عنوان الإشعار'}</h5>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notificationData.message || 'نص الرسالة سيظهر هنا'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
