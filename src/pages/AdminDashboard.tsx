import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { Users, FileCheck, Gift, DollarSign, Bell, Download, Users2, Trophy, TrendingUp, BarChart3, Search, CalendarIcon } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

// Custom Components
import OffersTable from '@/components/OffersTable';

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Services
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    type: 'info',
    target: 'all',
    targetValue: '',
    banner: false,
    scheduledAt: '',
    imageFile: null,
    imageUrl: '',
    id: null,
  });
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
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
  
  // New state for enhanced features
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userDateFilter, setUserDateFilter] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Advanced stats state
  const [monthlyDeposits, setMonthlyDeposits] = useState(0);
  const [weeklyNewUsers, setWeeklyNewUsers] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [averageTransactionValue, setAverageTransactionValue] = useState(0);
  
  // Analytics data
  const [analyticsData, setAnalyticsData] = useState({
    newUsersOverTime: [],
    transactionTypes: [],
    activityByHour: []
  });
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);
  const [offerUserCounts, setOfferUserCounts] = useState({});
  const [offerProfits, setOfferProfits] = useState({});

  // Add referral system state
  const [referralSettings, setReferralSettings] = useState({
    level1Points: 100,
    level2Points: 50,
    level3Points: 25
  });
  const [topReferrers, setTopReferrers] = useState([]);
  const [loadingReferrers, setLoadingReferrers] = useState(false);

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNotificationData(prev => ({ ...prev, imageFile: file, imageUrl: URL.createObjectURL(file) }));
    }
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const filePath = `notifications/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('notification-images').upload(filePath, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('notification-images').getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleSendNotification = async () => {
    if (!notificationData.title || !notificationData.message) {
      toast({ title: t('common.error'), description: t('common.error'), variant: 'destructive' });
      return;
    }
    let imageUrl = notificationData.imageUrl;
    if (notificationData.imageFile && !imageUrl.startsWith('http')) {
      imageUrl = await uploadImage(notificationData.imageFile);
    }
    const notif = {
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type,
      user_uid: notificationData.target === 'user' ? notificationData.targetValue : null,
      banner: notificationData.banner,
      scheduled_at: notificationData.scheduledAt ? new Date(notificationData.scheduledAt).toISOString() : null,
      sent_at: notificationData.scheduledAt ? null : new Date().toISOString(),
      read: false,
      image_url: imageUrl || null,
    };
    if (editingId) {
      await supabase.from('notifications').update(notif).eq('id', editingId);
    } else {
      await supabase.from('notifications').insert([notif]);
    }
    setNotificationData({ title: '', message: '', type: 'info', target: 'all', targetValue: '', banner: false, scheduledAt: '', imageFile: null, imageUrl: '', id: null });
    setEditingId(null);
    fetchNotifications();
  };

  const handleEdit = (notif) => {
    setNotificationData({
      title: notif.title,
      message: notif.message,
      type: notif.type,
      target: notif.user_uid ? 'user' : 'all',
      targetValue: notif.user_uid || '',
      banner: notif.banner,
      scheduledAt: notif.scheduled_at ? notif.scheduled_at.slice(0, 16) : '',
      imageFile: null,
      imageUrl: notif.image_url || '',
      id: notif.id,
    });
    setEditingId(notif.id);
  };

  const handleDelete = async (notif) => {
    if (notif.image_url) {
      // Remove image from storage
      const path = notif.image_url.split('/notification-images/')[1];
      if (path) {
        await supabase.storage.from('notification-images').remove([path]);
      }
    }
    await supabase.from('notifications').delete().eq('id', notif.id);
    fetchNotifications();
  };

  const handleExport = (type: string, format?: string) => {
    toast({
      title: t('common.success'),
      description: `تم تصدير ${type} ${format ? `بصيغة ${format.toUpperCase()}` : ''} بنجاح`,
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

  const fetchUserCount = async () => {
    const { count } = await supabase
      .from('user_info')
      .select('*', { count: 'exact', head: true })
      .neq('role', 'admin');
    setUserCount(count || 0);
  };
  const fetchPendingVerifications = async () => {
    const { count } = await supabase
      .from('user_info')
      .select('*', { count: 'exact', head: true })
      .eq('verified', false)
      .neq('role', 'admin');
    setPendingVerifications(count || 0);
  };

  useEffect(() => {
    fetchUserCount();
    fetchPendingVerifications();
    fetchActiveOffers();
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
      toast({ title: t('common.success'), description: 'User removed successfully' });
    } else {
      toast({ title: t('common.error'), description: error.message });
    }
  };

  // Fetch deposit numbers
  const fetchDepositNumbers = async () => {
    setLoadingDepositNumbers(true);
    try {
      const { data, error } = await supabase.from('deposit_numbers').select('*').order('created_at', { ascending: true });
      if (error) {
        console.error('Error fetching deposit numbers:', error);
        toast({ title: t('common.error'), description: 'Failed to fetch deposit numbers', variant: 'destructive' });
      } else {
        setDepositNumbers(data || []);
      }
    } catch (error) {
      console.error('Error fetching deposit numbers:', error);
      toast({ title: t('common.error'), description: 'Failed to fetch deposit numbers', variant: 'destructive' });
    } finally {
      setLoadingDepositNumbers(false);
    }
  };
  // Fetch deposit requests
  const fetchDepositRequests = async () => {
    setLoadingDepositRequests(true);
    try {
      const { data, error } = await supabase.from('deposit_requests').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching deposit requests:', error);
        toast({ title: t('common.error'), description: 'Failed to fetch deposit requests', variant: 'destructive' });
      } else {
        setDepositRequests(data || []);
      }
    } catch (error) {
      console.error('Error fetching deposit requests:', error);
      toast({ title: t('common.error'), description: 'Failed to fetch deposit requests', variant: 'destructive' });
    } finally {
      setLoadingDepositRequests(false);
    }
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

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching notifications:', error);
        toast({ title: t('common.error'), description: 'Failed to fetch notifications', variant: 'destructive' });
      } else {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({ title: t('common.error'), description: 'Failed to fetch notifications', variant: 'destructive' });
    } finally {
      setLoadingNotifications(false);
    }
  };

  // New functions for enhanced features
  const fetchAdvancedStats = async () => {
    try {
      // Fetch monthly deposits
      const startOfCurrentMonth = startOfMonth(new Date());
      const endOfCurrentMonth = endOfMonth(new Date());
      const { data: deposits, error: depositsError } = await supabase
        .from('deposit_requests')
        .select('amount')
        .gte('created_at', startOfCurrentMonth.toISOString())
        .lte('created_at', endOfCurrentMonth.toISOString())
        .eq('status', 'approved');
      
      if (depositsError) {
        console.error('Error fetching monthly deposits:', depositsError);
      } else {
        const totalMonthlyDeposits = deposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
        setMonthlyDeposits(totalMonthlyDeposits);
      }

      // Fetch weekly new users
      const startOfCurrentWeek = startOfWeek(new Date());
      const endOfCurrentWeek = endOfWeek(new Date());
      const { count: weeklyUsers, error: usersError } = await supabase
        .from('user_info')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfCurrentWeek.toISOString())
        .lte('created_at', endOfCurrentWeek.toISOString())
        .neq('role', 'admin');
      
      if (usersError) {
        console.error('Error fetching weekly users:', usersError);
      } else {
        setWeeklyNewUsers(weeklyUsers || 0);
      }

      // Fetch pending withdrawals (using mock data for now)
      setPendingWithdrawals(15);

      // Calculate average transaction value
      const { data: allDeposits, error: avgError } = await supabase
        .from('deposit_requests')
        .select('amount')
        .eq('status', 'approved');
      
      if (avgError) {
        console.error('Error fetching average transaction value:', avgError);
      } else if (allDeposits && allDeposits.length > 0) {
        const totalAmount = allDeposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0);
        const average = totalAmount / allDeposits.length;
        setAverageTransactionValue(average);
      }
    } catch (error) {
      console.error('Error fetching advanced stats:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      // New users over time (last 30 days)
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data: usersOverTime, error: usersError } = await supabase
        .from('user_info')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .neq('role', 'admin')
        .order('created_at', { ascending: true });

      if (usersError) {
        console.error('Error fetching users over time:', usersError);
      }

      // Group by date
      const usersByDate = {};
      usersOverTime?.forEach(user => {
        const date = format(new Date(user.created_at), 'yyyy-MM-dd');
        usersByDate[date] = (usersByDate[date] || 0) + 1;
      });

      const newUsersOverTime = Object.entries(usersByDate).map(([date, count]) => ({
        date,
        count
      }));

      // Transaction types (deposit requests by status)
      const { data: depositRequests, error: depositsError } = await supabase
        .from('deposit_requests')
        .select('status, amount');

      if (depositsError) {
        console.error('Error fetching deposit requests for analytics:', depositsError);
      }

      const transactionTypes = [
        { type: 'approved', count: depositRequests?.filter(r => r.status === 'approved').length || 0 },
        { type: 'pending', count: depositRequests?.filter(r => r.status === 'pending').length || 0 },
        { type: 'rejected', count: depositRequests?.filter(r => r.status === 'rejected').length || 0 }
      ];

      // Activity by hour (mock data for now)
      const activityByHour = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        activity: Math.floor(Math.random() * 50) + 10
      }));

      setAnalyticsData({
        newUsersOverTime,
        transactionTypes,
        activityByHour
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  };

  useEffect(() => { 
    fetchNotifications(); 
    fetchAdvancedStats();
    fetchAnalyticsData();
  }, []);

  // Filtering and pagination logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = userSearchTerm === '' || 
      user.first_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.phone?.includes(userSearchTerm);
    
    const matchesStatus = userStatusFilter === 'all' || 
      (userStatusFilter === 'verified' && user.verified) ||
      (userStatusFilter === 'pending' && !user.verified);
    
    const matchesDate = !userDateFilter || 
      format(new Date(user.created_at), 'yyyy-MM-dd') === format(userDateFilter, 'yyyy-MM-dd');
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearchTerm, userStatusFilter, userDateFilter]);

  // Fetch number of users joined per offer
  const fetchOfferUserCounts = async (offersList) => {
    if (!offersList || offersList.length === 0) return;
    const offerIds = offersList.map((o) => o.id);
    try {
      const { data, error } = await supabase
        .from('offer_joins')
        .select('offer_id, user_id')
        .in('offer_id', offerIds);
      
      if (error) {
        console.error('Error fetching offer user counts:', error);
        setOfferUserCounts({});
        setOfferProfits({});
        return;
      }

      // Group by offer_id and count users
      const counts = {};
      const profits = {};
      
      data?.forEach((row) => {
        if (!counts[row.offer_id]) {
          counts[row.offer_id] = 0;
        }
        counts[row.offer_id]++;
      });

      // Calculate profits for each offer
      offerIds.forEach((offerId) => {
        const offer = offersList.find((o) => o.id === offerId);
        if (offer && counts[offerId]) {
          // Profit = users * (monthly_profit - cost)
          profits[offerId] = counts[offerId] * ((offer.monthly_profit || 0) - (offer.cost || 0));
        }
      });

      setOfferUserCounts(counts);
      setOfferProfits(profits);
    } catch (error) {
      console.error('Error fetching offer user counts:', error);
      setOfferUserCounts({});
      setOfferProfits({});
    }
  };

  useEffect(() => {
    if (offers.length > 0) {
      fetchOfferUserCounts(offers);
    }
  }, [offers]);

  // Fetch top referrers
  const fetchTopReferrers = async () => {
    setLoadingReferrers(true);
    try {
      const { data, error } = await supabase
        .from('user_info')
        .select('first_name, last_name, email, referral_count, total_referral_points')
        .not('referral_count', 'is', null)
        .order('total_referral_points', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching top referrers:', error);
        toast({ title: t('common.error'), description: 'Failed to fetch top referrers', variant: 'destructive' });
        setTopReferrers([]);
      } else {
        setTopReferrers(data || []);
      }
    } catch (error) {
      console.error('Error fetching top referrers:', error);
      toast({ title: t('common.error'), description: 'Failed to fetch top referrers', variant: 'destructive' });
      setTopReferrers([]);
    } finally {
      setLoadingReferrers(false);
    }
  };

  // Update referral settings
  const handleUpdateReferralSettings = async () => {
    const { error } = await supabase
      .from('referral_settings')
      .upsert([{
        id: 1, // Assuming single settings record
        level1_points: referralSettings.level1Points,
        level2_points: referralSettings.level2Points,
        level3_points: referralSettings.level3Points,
        updated_at: new Date().toISOString()
      }]);
    
    if (error) {
      toast({ title: t('common.error'), description: 'Failed to update referral settings', variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: 'Referral settings updated successfully' });
    }
  };

  // Load referral settings
  const loadReferralSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error) {
        console.error('Error loading referral settings:', error);
        // Use default settings if no settings found
        setReferralSettings({
          level1Points: 100,
          level2Points: 50,
          level3Points: 25
        });
      } else if (data) {
        setReferralSettings({
          level1Points: data.level1_points || 100,
          level2Points: data.level2_points || 50,
          level3Points: data.level3_points || 25
        });
      }
    } catch (error) {
      console.error('Error loading referral settings:', error);
      // Use default settings on error
      setReferralSettings({
        level1Points: 100,
        level2Points: 50,
        level3Points: 25
      });
    }
  };

  useEffect(() => {
    loadReferralSettings();
    fetchTopReferrers();
  }, []);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
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
              title="إجمالي الإيداعات هذا الشهر" 
              value={monthlyDeposits} 
              icon={TrendingUp} 
              color="text-purple-600" 
            />
            <StatCard 
              title="المستخدمون الجدد هذا الأسبوع" 
              value={weeklyNewUsers} 
              icon={Users} 
              color="text-indigo-600" 
            />
            <StatCard 
              title="متوسط قيمة المعاملة" 
              value={Math.round(averageTransactionValue)} 
              icon={BarChart3} 
              color="text-teal-600" 
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="users">{t('admin.users')}</TabsTrigger>
              <TabsTrigger value="offers">{t('admin.offers')}</TabsTrigger>
              <TabsTrigger value="withdrawals">{t('admin.withdrawals')}</TabsTrigger>
              <TabsTrigger value="transactions">{t('admin.transactions')}</TabsTrigger>
              <TabsTrigger value="analytics">التحليلات</TabsTrigger>
              <TabsTrigger value="notifications">{t('admin.notifications')}</TabsTrigger>
              <TabsTrigger value="depositNumbers">{t('deposit.numbers') || 'Deposit Numbers'}</TabsTrigger>
              <TabsTrigger value="depositRequests">{t('deposit.requests') || 'Deposit Requests'}</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.users')}</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={() => handleExport('المستخدمين')} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      {t('admin.export.users')}
                    </Button>
                    <Button onClick={() => handleExport('المستخدمين', 'csv')} variant="outline">
                      CSV
                    </Button>
                    <Button onClick={() => handleExport('المستخدمين', 'pdf')} variant="outline">
                      PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filters */}
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="البحث بالاسم أو البريد الإلكتروني أو الهاتف..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="حالة التحقق" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="verified">محقق</SelectItem>
                        <SelectItem value="pending">معلق</SelectItem>
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-48">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {userDateFilter ? format(userDateFilter, 'yyyy-MM-dd') : 'تاريخ التسجيل'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={userDateFilter}
                          onSelect={setUserDateFilter}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Filtered Users Table */}
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
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedUsers.map((user) => (
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

                  {/* Pagination */}
                  {filteredUsers.length > itemsPerPage && (
                    <div className="mt-6">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.ceil(filteredUsers.length / itemsPerPage) }, (_, i) => (
                            <PaginationItem key={i + 1}>
                              <PaginationLink
                                onClick={() => setCurrentPage(i + 1)}
                                isActive={currentPage === i + 1}
                                className="cursor-pointer"
                              >
                                {i + 1}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredUsers.length / itemsPerPage)))}
                              className={currentPage === Math.ceil(filteredUsers.length / itemsPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
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
                    <OffersTable 
                      offers={offers} 
                      showActions={false}
                      renderExtra={(offer) => (
                        <div className="flex flex-col gap-1 text-xs">
                          <span><b>Users:</b> {offerUserCounts[offer.id] || 0}</span>
                          <span><b>Profit/Loss:</b> ${offerProfits[offer.id] !== undefined ? offerProfits[offer.id].toLocaleString() : '0'}</span>
                        </div>
                      )}
                    />
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

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* New Users Over Time Chart */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      المستخدمون الجدد عبر الزمن
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        {analyticsData.newUsersOverTime.length > 0 ? (
                          <div className="space-y-2">
                            {analyticsData.newUsersOverTime.map((item, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <span>{item.date}</span>
                                <Badge variant="outline">{item.count} مستخدم</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p>لا توجد بيانات متاحة</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Transaction Types Chart */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      أنواع المعاملات
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        {analyticsData.transactionTypes.length > 0 ? (
                          <div className="space-y-2">
                            {analyticsData.transactionTypes.map((item, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <span>{item.type === 'approved' ? 'مقبول' : item.type === 'pending' ? 'معلق' : 'مرفوض'}</span>
                                <Badge variant="outline">{item.count} معاملة</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p>لا توجد بيانات متاحة</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Activity by Hour Chart */}
                <Card className="shadow-card lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      النشاط حسب الساعة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        {analyticsData.activityByHour.length > 0 ? (
                          <div className="grid grid-cols-6 gap-2 w-full">
                            {analyticsData.activityByHour.map((item, index) => (
                              <div key={index} className="text-center">
                                <div className="text-xs text-muted-foreground">{item.hour}:00</div>
                                <div className="text-sm font-medium">{item.activity}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p>لا توجد بيانات متاحة</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.transactions')}</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={() => handleExport('المعاملات')} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      {t('admin.export.transactions')}
                    </Button>
                    <Button onClick={() => handleExport('المعاملات', 'csv')} variant="outline">
                      CSV
                    </Button>
                    <Button onClick={() => handleExport('المعاملات', 'pdf')} variant="outline">
                      PDF
                    </Button>
                    <Button onClick={() => handleExport('المعاملات', 'excel')} variant="outline">
                      Excel
                    </Button>
                  </div>
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
                          placeholder={t('admin.notifications.title')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notificationMessage">{t('admin.notifications.message')}</Label>
                        <textarea
                          id="notificationMessage"
                          value={notificationData.message}
                          onChange={(e) => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
                          placeholder={t('admin.notifications.message')}
                          className="flex h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('admin.notifications.type')}</Label>
                        <select className="w-full border rounded px-2 py-1" value={notificationData.type} onChange={e => setNotificationData(prev => ({ ...prev, type: e.target.value }))}>
                          <option value="info">{t('admin.notifications.type.info')}</option>
                          <option value="offer">{t('admin.notifications.type.offer')}</option>
                          <option value="ad">{t('admin.notifications.type.ad')}</option>
                          <option value="warning">{t('admin.notifications.type.warning')}</option>
                          <option value="success">{t('admin.notifications.type.success')}</option>
                          <option value="error">{t('admin.notifications.type.error')}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('admin.notifications.target')}</Label>
                        <select className="w-full border rounded px-2 py-1" value={notificationData.target} onChange={e => setNotificationData(prev => ({ ...prev, target: e.target.value, targetValue: '' }))}>
                          <option value="all">{t('admin.notifications.target.all')}</option>
                          <option value="user">{t('admin.notifications.target.user')}</option>
                        </select>
                        {notificationData.target === 'user' && (
                          <Input
                            value={notificationData.targetValue}
                            onChange={e => setNotificationData(prev => ({ ...prev, targetValue: e.target.value }))}
                            placeholder={t('admin.notifications.target.placeholder')}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="banner" checked={notificationData.banner} onChange={e => setNotificationData(prev => ({ ...prev, banner: e.target.checked }))} />
                        <Label htmlFor="banner">{t('admin.notifications.banner')}</Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="scheduledAt">{t('admin.notifications.schedule')}</Label>
                        <Input
                          id="scheduledAt"
                          type="datetime-local"
                          value={notificationData.scheduledAt}
                          onChange={e => setNotificationData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('admin.notifications.image')}</Label>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} />
                        {notificationData.imageUrl && (
                          <img src={notificationData.imageUrl} alt="preview" style={{ maxWidth: 120, marginTop: 8, borderRadius: 8 }} />
                        )}
                      </div>
                      <Button onClick={handleSendNotification} className="w-full">
                        {t('admin.notifications.send')}
                      </Button>
                    </div>
                    <div className="p-4 bg-accent rounded-lg">
                      <h4 className="font-semibold mb-2">{t('common.view')}</h4>
                      <div className="bg-background p-3 rounded border">
                        <h5 className="font-medium">{notificationData.title || t('admin.notifications.title')}</h5>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notificationData.message || t('admin.notifications.message')}
                        </p>
                        <div className="mt-2 text-xs">
                          <span className="mr-2">{t('admin.notifications.type')}: {t(`admin.notifications.type.${notificationData.type}`)}</span>
                          <span className="mr-2">{t('admin.notifications.banner')}: {notificationData.banner ? t('common.success') : t('common.cancel')}</span>
                          {notificationData.scheduledAt && <span>{t('admin.notifications.scheduledAt')}: {notificationData.scheduledAt}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-8">
                    <h4 className="font-semibold mb-4">{t('admin.notifications')}</h4>
                    {loadingNotifications ? (
                      <div>{t('common.loading')}</div>
                    ) : notifications.length === 0 ? (
                      <div>{t('admin.notifications.noNotifications')}</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('admin.notifications.title')}</TableHead>
                            <TableHead>{t('admin.notifications.type')}</TableHead>
                            <TableHead>{t('admin.notifications.target')}</TableHead>
                            <TableHead>{t('admin.notifications.banner')}</TableHead>
                            <TableHead>{t('admin.notifications.scheduledAt')}</TableHead>
                            <TableHead>{t('admin.notifications.status')}</TableHead>
                            <TableHead>{t('admin.notifications.image')}</TableHead>
                            <TableHead>{t('admin.notifications.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {notifications.map((notif) => (
                            <TableRow key={notif.id}>
                              <TableCell>{notif.title}</TableCell>
                              <TableCell>{t(`admin.notifications.type.${notif.type}`)}</TableCell>
                              <TableCell>{notif.user_uid ? notif.user_uid : t('admin.notifications.target.all')}</TableCell>
                              <TableCell>{notif.banner ? t('common.success') : t('common.cancel')}</TableCell>
                              <TableCell>{notif.scheduled_at ? format(new Date(notif.scheduled_at), 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                              <TableCell>{notif.sent_at ? t('admin.notifications.status.sent') : notif.scheduled_at ? t('admin.notifications.status.scheduled') : '-'}</TableCell>
                              <TableCell>
                                {notif.image_url && <img src={notif.image_url} alt="notif" style={{ maxWidth: 60, borderRadius: 6 }} />}
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="outline" onClick={() => handleEdit(notif)}>{t('common.edit') || 'Edit'}</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDelete(notif)}>{t('common.delete') || 'Delete'}</Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
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
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('deposit.amount') || 'Amount'}</TableHead>
                          <TableHead>{t('deposit.userNumber') || 'User Number'}</TableHead>
                          <TableHead>{t('deposit.targetNumber') || 'Target Number'}</TableHead>
                          <TableHead>{t('deposit.screenshot') || 'Screenshot'}</TableHead>
                          <TableHead>{t('deposit.status') || 'Status'}</TableHead>
                          <TableHead>{t('deposit.actions') || 'Actions'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {depositRequests.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell>{req.amount}</TableCell>
                            <TableCell>{req.user_number}</TableCell>
                            <TableCell>{req.target_number}</TableCell>
                            <TableCell>
                              <a href={req.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {t('deposit.view') || 'View'}
                              </a>
                            </TableCell>
                            <TableCell>
                              <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                                {req.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {req.status === 'pending' && (
                                <div className="flex space-x-2">
                                  <Button size="sm" className="bg-success" onClick={() => handleApproveDeposit(req)}>
                                    {t('common.save') || 'Approve'}
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleRejectDeposit(req.id)}>
                                    {t('common.delete') || 'Reject'}
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Referrals Tab */}
            <TabsContent value="referrals">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Referral Settings */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users2 className="h-5 w-5" />
                      Referral System Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="level1">Level 1 Points (Direct Referrals)</Label>
                      <Input
                        id="level1"
                        type="number"
                        value={referralSettings.level1Points}
                        onChange={(e) => setReferralSettings(prev => ({ ...prev, level1Points: parseInt(e.target.value) || 0 }))}
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="level2">Level 2 Points (Indirect Referrals)</Label>
                      <Input
                        id="level2"
                        type="number"
                        value={referralSettings.level2Points}
                        onChange={(e) => setReferralSettings(prev => ({ ...prev, level2Points: parseInt(e.target.value) || 0 }))}
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="level3">Level 3 Points (Third Level)</Label>
                      <Input
                        id="level3"
                        type="number"
                        value={referralSettings.level3Points}
                        onChange={(e) => setReferralSettings(prev => ({ ...prev, level3Points: parseInt(e.target.value) || 0 }))}
                        placeholder="25"
                      />
                    </div>
                    <Button onClick={handleUpdateReferralSettings} className="w-full">
                      Update Settings
                    </Button>
                  </CardContent>
                </Card>

                {/* Top Referrers */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Top Referrers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingReferrers ? (
                      <div className="text-center py-4">Loading...</div>
                    ) : topReferrers.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">No referrers found</div>
                    ) : (
                      <div className="space-y-3">
                        {topReferrers.map((referrer, index) => (
                          <div key={referrer.email} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{referrer.first_name} {referrer.last_name}</p>
                                <p className="text-sm text-muted-foreground">{referrer.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">{referrer.total_referral_points || 0} pts</p>
                              <p className="text-sm text-muted-foreground">{referrer.referral_count || 0} referrals</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Referral Statistics */}
              <Card className="shadow-card mt-6">
                <CardHeader>
                  <CardTitle>Referral Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {topReferrers.reduce((sum, r) => sum + (r.referral_count || 0), 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Referrals</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {topReferrers.reduce((sum, r) => sum + (r.total_referral_points || 0), 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Points Awarded</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {topReferrers.length}
                      </p>
                      <p className="text-sm text-muted-foreground">Active Referrers</p>
                    </div>
                  </div>
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
