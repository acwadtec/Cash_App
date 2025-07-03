import { useState } from 'react';
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

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
  });

  // Mock data
  const stats = {
    totalUsers: 1247,
    pendingVerifications: 23,
    activeOffers: 8,
    pendingWithdrawals: 15,
  };

  const mockUsers = [
    { id: 1, name: 'أحمد محمد', email: 'ahmed@example.com', phone: '+966501234567', status: 'verified' },
    { id: 2, name: 'فاطمة أحمد', email: 'fatima@example.com', phone: '+966509876543', status: 'pending' },
    { id: 3, name: 'محمد علي', email: 'mohamed@example.com', phone: '+966507654321', status: 'verified' },
  ];

  const mockOffers = [
    { id: 1, title: 'عرض التداول الذهبي', type: 'trading', reward: 500, deadline: '2024-08-15' },
    { id: 2, name: 'مكافأة الإحالة', type: 'referral', reward: 100, deadline: '2024-07-30' },
    { id: 3, title: 'العضوية المتقدمة', type: 'premium', reward: 1000, deadline: '2024-09-01' },
  ];

  const mockWithdrawals = [
    { id: 1, user: 'أحمد محمد', amount: 250, type: 'personal', method: 'bank', date: '2024-07-01' },
    { id: 2, user: 'فاطمة أحمد', amount: 150, type: 'bonus', method: 'wallet', date: '2024-07-02' },
    { id: 3, user: 'محمد علي', amount: 300, type: 'team', method: 'crypto', date: '2024-07-03' },
  ];

  // For demo/mock only. In production, this should be handled by the backend.
  const [depositNumbers, setDepositNumbers] = useState(() => JSON.parse(localStorage.getItem('depositNumbers') || '[]'));
  const [newNumber, setNewNumber] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // For demo/mock only. In production, this should be handled by the backend.
  const [depositRequests, setDepositRequests] = useState(() => JSON.parse(localStorage.getItem('depositRequests') || '[]'));

  const saveNumbers = (numbers: string[]) => {
    setDepositNumbers(numbers);
    // For demo/mock only. In production, this should be handled by the backend.
    localStorage.setItem('depositNumbers', JSON.stringify(numbers));
  };

  const handleAddNumber = () => {
    if (!newNumber || depositNumbers.length >= 10) return;
    saveNumbers([...depositNumbers, newNumber]);
    setNewNumber('');
  };
  const handleUpdateNumber = () => {
    if (editingIndex === null || !newNumber) return;
    const updated = [...depositNumbers];
    updated[editingIndex] = newNumber;
    saveNumbers(updated);
    setEditingIndex(null);
    setNewNumber('');
  };
  const handleRemoveNumber = (idx: number) => {
    const updated = depositNumbers.filter((_, i) => i !== idx);
    saveNumbers(updated);
  };
  const startEdit = (idx: number) => {
    setEditingIndex(idx);
    setNewNumber(depositNumbers[idx]);
  };

  const handleApproveDeposit = (id: number) => {
    const updated = depositRequests.map((req: any) => req.id === id ? { ...req, status: 'approved' } : req);
    setDepositRequests(updated);
    // For demo/mock only. In production, this should be handled by the backend.
    localStorage.setItem('depositRequests', JSON.stringify(updated));
  };
  const handleRejectDeposit = (id: number) => {
    const updated = depositRequests.map((req: any) => req.id === id ? { ...req, status: 'rejected' } : req);
    setDepositRequests(updated);
    // For demo/mock only. In production, this should be handled by the backend.
    localStorage.setItem('depositRequests', JSON.stringify(updated));
  };

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
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="users">{t('admin.users')}</TabsTrigger>
              <TabsTrigger value="offers">{t('admin.offers')}</TabsTrigger>
              <TabsTrigger value="withdrawals">{t('admin.withdrawals')}</TabsTrigger>
              <TabsTrigger value="transactions">{t('admin.transactions')}</TabsTrigger>
              <TabsTrigger value="notifications">{t('admin.notifications')}</TabsTrigger>
              <TabsTrigger value="deposits">{t('admin.deposit.requests')}</TabsTrigger>
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
                      {mockUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.phone}</TableCell>
                          <TableCell>
                            <Badge className={user.status === 'verified' ? 'bg-success' : 'bg-warning'}>
                              {user.status === 'verified' ? t('admin.users.verified') : t('admin.users.pending')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                {t('admin.users.view')}
                              </Button>
                              {user.status === 'pending' && (
                                <Button size="sm" className="bg-success">
                                  {t('admin.users.verify')}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
                  <Button>{t('admin.offers.create')}</Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.offers.title')}</TableHead>
                        <TableHead>{t('admin.offers.type')}</TableHead>
                        <TableHead>{t('admin.offers.reward')}</TableHead>
                        <TableHead>{t('admin.offers.deadline')}</TableHead>
                        <TableHead>{t('admin.users.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockOffers.map((offer) => (
                        <TableRow key={offer.id}>
                          <TableCell className="font-medium">{offer.title}</TableCell>
                          <TableCell>
                            <Badge>
                              {offer.type === 'trading' ? t('offers.trading') : 
                               offer.type === 'referral' ? t('offers.referral') : 
                               t('offers.premium')}
                            </Badge>
                          </TableCell>
                          <TableCell>${offer.reward}</TableCell>
                          <TableCell>{offer.deadline}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                {t('admin.offers.edit')}
                              </Button>
                              <Button size="sm" variant="destructive">
                                {t('admin.offers.delete')}
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

            {/* Deposits Tab */}
            <TabsContent value="deposits">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3 w-full">
                  <Card className="shadow-card mb-8">
                    <CardHeader>
                      <CardTitle>{t('admin.deposit.numbers')}</CardTitle>
                      <p className="text-muted-foreground text-sm">{t('admin.deposit.max')}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2 mb-4">
                        {depositNumbers.map((num: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input value={editingIndex === idx ? newNumber : num} readOnly={editingIndex !== idx} onChange={e => setNewNumber(e.target.value)} className="w-48" />
                            {editingIndex === idx ? (
                              <Button size="sm" onClick={handleUpdateNumber}>{t('admin.deposit.update')}</Button>
                            ) : (
                              <Button size="sm" onClick={() => startEdit(idx)}>{t('common.edit')}</Button>
                            )}
                            <Button size="sm" variant="destructive" onClick={() => handleRemoveNumber(idx)}>{t('admin.deposit.remove')}</Button>
                          </div>
                        ))}
                      </div>
                      {depositNumbers.length < 10 && (
                        <div className="flex gap-2">
                          <Input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder={t('admin.deposit.add')} className="w-48" />
                          <Button size="sm" onClick={handleAddNumber}>{t('admin.deposit.add')}</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                <div className="md:w-2/3 w-full">
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle>{t('admin.deposit.requests')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full text-left">
                        <thead>
                          <tr>
                            <th>{t('admin.deposit.userNumber')}</th>
                            <th>{t('admin.deposit.amount')}</th>
                            <th>{t('admin.deposit.targetNumber')}</th>
                            <th>{t('admin.deposit.screenshot')}</th>
                            <th>{t('admin.deposit.status')}</th>
                            <th>{t('admin.deposit.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {depositRequests.map((req: any) => (
                            <tr key={req.id}>
                              <td>{req.userNumber}</td>
                              <td>${req.amount}</td>
                              <td>{req.targetNumber}</td>
                              <td>{req.screenshot && <a href={req.screenshot} target="_blank" rel="noopener noreferrer">{t('admin.deposit.screenshot')}</a>}</td>
                              <td>
                                <Badge className={
                                  req.status === 'approved' ? 'bg-success' :
                                  req.status === 'rejected' ? 'bg-destructive' : 'bg-warning'
                                }>
                                  {t(`deposit.status.${req.status}`)}
                                </Badge>
                              </td>
                              <td>
                                {req.status === 'pending' && (
                                  <>
                                    <Button size="sm" className="bg-success mr-2" onClick={() => handleApproveDeposit(req.id)}>{t('admin.deposit.approve')}</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleRejectDeposit(req.id)}>{t('admin.deposit.reject')}</Button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
