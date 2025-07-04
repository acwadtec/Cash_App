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
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [activeOffers, setActiveOffers] = useState(0);
  const [depositNumbers, setDepositNumbers] = useState([]);
  const [newNumber, setNewNumber] = useState('');
  const [depositRequests, setDepositRequests] = useState([]);
  const [loadingDepositNumbers, setLoadingDepositNumbers] = useState(false);
  const [loadingDepositRequests, setLoadingDepositRequests] = useState(false);

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

  const fetchActiveOffers = async () => {
    const { count } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);
    setActiveOffers(count || 0);
  };

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
      fetchActiveOffers();
    };
    fetchOffers();
  }, []);

  useEffect(() => {
    const fetchUserCount = async () => {
      const { count } = await supabase
        .from('user_info')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'admin');
      setUserCount(count || 0);
    };
    fetchUserCount();
  }, []);

  useEffect(() => {
    const fetchPendingVerifications = async () => {
      const { count } = await supabase
        .from('user_info')
        .select('*', { count: 'exact', head: true })
        .eq('verified', false)
        .neq('role', 'admin');
      setPendingVerifications(count || 0);
    };
    fetchPendingVerifications();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      const { data, error } = await supabase.from('user_info').select('*').neq('role', 'admin');
      if (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
      setLoadingUsers(false);
      fetchUserCount();
      fetchPendingVerifications();
      fetchActiveOffers();
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

  const handleView = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleVerify = async (userId) => {
    const { error } = await supabase
      .from('user_info')
      .update({ verified: true })
      .eq('id', userId);
    if (!error) {
      // Refresh users list
      const { data } = await supabase.from('user_info').select('*').neq('role', 'admin');
      setUsers(data || []);
      toast({ title: t('common.success'), description: 'User verified successfully' });
      fetchUserCount();
      fetchPendingVerifications();
    } else {
      toast({ title: t('common.error'), description: error.message });
    }
  };

  const handleRemove = async (userId) => {
    const { error } = await supabase
      .from('user_info')
      .delete()
      .eq('id', userId);
    if (!error) {
      // Refresh users list and user count
      const { data } = await supabase.from('user_info').select('*').neq('role', 'admin');
      setUsers(data || []);
      fetchUserCount();
      toast({ title: t('common.success'), description: 'User removed successfully' });
    } else {
      toast({ title: t('common.error'), description: error.message });
    }
  };

  // Fetch deposit numbers
  const fetchDepositNumbers = async () => {
    setLoadingDepositNumbers(true);
    const { data } = await supabase.from('deposit_numbers').select('*').order('created_at', { ascending: true });
    setDepositNumbers(data || []);
    setLoadingDepositNumbers(false);
  };
  // Fetch deposit requests
  const fetchDepositRequests = async () => {
    setLoadingDepositRequests(true);
    const { data } = await supabase.from('deposit_requests').select('*').order('created_at', { ascending: false });
    setDepositRequests(data || []);
    setLoadingDepositRequests(false);
  };
  useEffect(() => {
    fetchDepositNumbers();
    fetchDepositRequests();
  }, []);

  // Add deposit number
  const handleAddNumber = async () => {
    if (!newNumber) return;
    if (depositNumbers.length >= 10) {
      toast({ title: t('common.error'), description: t('deposit.error.maxNumbers'), variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('deposit_numbers').insert([{ number: newNumber }]);
    if (!error) {
      setNewNumber('');
      fetchDepositNumbers();
    }
  };
  // Remove deposit number
  const handleRemoveNumber = async (id) => {
    await supabase.from('deposit_numbers').delete().eq('id', id);
    fetchDepositNumbers();
  };
  // Update deposit number
  const handleUpdateNumber = async (id, number) => {
    await supabase.from('deposit_numbers').update({ number }).eq('id', id);
    fetchDepositNumbers();
  };
  // Approve deposit request
  const handleApproveDeposit = async (request) => {
    // Update request status
    await supabase.from('deposit_requests').update({ status: 'approved' }).eq('id', request.id);
    // Update user balance
    const { data: userInfo } = await supabase.from('user_info').select('balance').eq('user_uid', request.user_uid).single();
    const newBalance = (userInfo?.balance || 0) + Number(request.amount);
    await supabase.from('user_info').update({ balance: newBalance }).eq('user_uid', request.user_uid);
    fetchDepositRequests();
    toast({ title: t('common.success'), description: t('deposit.success') });
  };
  // Reject deposit request
  const handleRejectDeposit = async (id) => {
    await supabase.from('deposit_requests').update({ status: 'rejected' }).eq('id', id);
    fetchDepositRequests();
  };

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
              value={userCount} 
              icon={Users} 
              color="text-blue-600" 
            />
            <StatCard 
              title={t('admin.stats.pendingVerifications')} 
              value={pendingVerifications} 
              icon={FileCheck} 
              color="text-orange-600" 
            />
            <StatCard 
              title={t('admin.stats.activeOffers')} 
              value={activeOffers} 
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
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="users">{t('admin.users')}</TabsTrigger>
              <TabsTrigger value="offers">{t('admin.offers')}</TabsTrigger>
              <TabsTrigger value="withdrawals">{t('admin.withdrawals')}</TabsTrigger>
              <TabsTrigger value="transactions">{t('admin.transactions')}</TabsTrigger>
              <TabsTrigger value="notifications">{t('admin.notifications')}</TabsTrigger>
              <TabsTrigger value="depositNumbers">{t('deposit.numbers') || 'Deposit Numbers'}</TabsTrigger>
              <TabsTrigger value="depositRequests">{t('deposit.requests') || 'Deposit Requests'}</TabsTrigger>
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
                            <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.phone}</TableCell>
                            <TableCell>
                              <Badge className={user.verified ? 'bg-success' : 'bg-warning'}>
                                {user.verified ? 'Verified' : 'Pending'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline" onClick={() => handleView(user)}>
                                  View
                                </Button>
                                {!user.verified && (
                                  <Button size="sm" className="bg-success" onClick={() => handleVerify(user.id)}>
                                    Verify
                                  </Button>
                                )}
                                <Button size="sm" variant="destructive" onClick={() => handleRemove(user.id)}>
                                  Remove
                                </Button>
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
                          className="flex h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none"
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

            {/* Deposit Numbers Tab */}
            <TabsContent value="depositNumbers">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>{t('deposit.numbers') || 'Deposit Numbers'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex gap-2">
                    <Input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder={t('deposit.userNumber') || 'Mobile Number'} />
                    <Button onClick={handleAddNumber} disabled={depositNumbers.length >= 10}>{t('common.save') || 'Add'}</Button>
                  </div>
                  {loadingDepositNumbers ? (
                    <div>Loading...</div>
                  ) : (
                    <ul className="space-y-2">
                      {depositNumbers.map((num) => (
                        <li key={num.id} className="flex items-center gap-2">
                          <Input value={num.number} onChange={e => handleUpdateNumber(num.id, e.target.value)} />
                          <Button variant="destructive" onClick={() => handleRemoveNumber(num.id)}>{t('common.delete') || 'Remove'}</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Deposit Requests Tab */}
            <TabsContent value="depositRequests">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>{t('deposit.requests') || 'Deposit Requests'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingDepositRequests ? (
                    <div>Loading...</div>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <th>{t('deposit.amount') || 'Amount'}</th>
                          <th>{t('deposit.userNumber') || 'User Number'}</th>
                          <th>{t('deposit.targetNumber') || 'Target Number'}</th>
                          <th>{t('deposit.screenshot') || 'Screenshot'}</th>
                          <th>{t('deposit.status') || 'Status'}</th>
                          <th>{t('deposit.actions') || 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {depositRequests.map((req) => (
                          <tr key={req.id}>
                            <td>{req.amount}</td>
                            <td>{req.user_number}</td>
                            <td>{req.target_number}</td>
                            <td><a href={req.screenshot_url} target="_blank" rel="noopener noreferrer">{t('deposit.view') || 'View'}</a></td>
                            <td>{req.status}</td>
                            <td>
                              {req.status === 'pending' && (
                                <>
                                  <Button size="sm" className="bg-success mr-2" onClick={() => handleApproveDeposit(req)}>{t('common.save') || 'Approve'}</Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleRejectDeposit(req.id)}>{t('common.delete') || 'Reject'}</Button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-background p-6 rounded shadow-lg min-w-[300px]">
            <h2 className="text-xl font-bold mb-4">User Details</h2>
            <div className="mb-2">Name: {selectedUser.first_name} {selectedUser.last_name}</div>
            <div className="mb-2">Email: {selectedUser.email}</div>
            <div className="mb-2">Phone: {selectedUser.phone}</div>
            <div className="mb-2">Wallet: {selectedUser.wallet}</div>
            <div className="mb-2">Verified: {selectedUser.verified ? 'Yes' : 'No'}</div>
            <button className="mt-4 px-4 py-2 bg-primary text-white rounded" onClick={() => setShowUserModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
