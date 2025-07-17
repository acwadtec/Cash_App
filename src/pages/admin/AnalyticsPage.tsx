import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users2, DollarSign, Gift, FileCheck } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [monthlyDeposits, setMonthlyDeposits] = useState(0);
  const [weeklyNewUsers, setWeeklyNewUsers] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [averageTransactionValue, setAverageTransactionValue] = useState(0);
  const [activeOffers, setActiveOffers] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [analyticsData, setAnalyticsData] = useState({
    newUsersOverTime: [],
    transactionTypes: [],
    activityByHour: []
  });
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAdvancedStats();
    fetchAnalyticsData();
    fetchActiveOffers();
    fetchPendingVerifications();
  }, [timeRange]);

  const fetchAdvancedStats = async () => {
    try {
      setLoading(true);
      // Monthly deposits
      const startOfCurrentMonth = startOfMonth(new Date());
      const endOfCurrentMonth = endOfMonth(new Date());
      const { data: deposits, error: depositsError } = await supabase
        .from('deposit_requests')
        .select('amount')
        .gte('created_at', startOfCurrentMonth.toISOString())
        .lte('created_at', endOfCurrentMonth.toISOString())
        .eq('status', 'approved');
      if (!depositsError) {
        const totalMonthlyDeposits = deposits?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
        setMonthlyDeposits(totalMonthlyDeposits);
      }
      // Weekly new users
      const startOfCurrentWeek = startOfWeek(new Date());
      const endOfCurrentWeek = endOfWeek(new Date());
      const { count: weeklyUsers, error: usersError } = await supabase
        .from('user_info')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfCurrentWeek.toISOString())
        .lte('created_at', endOfCurrentWeek.toISOString())
        .not('role', 'eq', 'admin');
      if (!usersError) setWeeklyNewUsers(weeklyUsers || 0);
      // Average transaction value
      const { data: allDeposits, error: avgError } = await supabase
        .from('deposit_requests')
        .select('amount')
        .eq('status', 'approved');
      if (!avgError && allDeposits && allDeposits.length > 0) {
        const totalAmount = allDeposits.reduce((sum, d) => sum + Number(d.amount), 0);
        setAverageTransactionValue(totalAmount / allDeposits.length);
      }
      // Pending withdrawals
      const { count: pendingW, error: pendingWError } = await supabase
        .from('withdrawal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (!pendingWError) setPendingWithdrawals(pendingW || 0);
    } catch (error) {
      toast({ title: t('common.error'), description: t('admin.analytics.errorStats'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOffers = async () => {
    const { count } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);
    setActiveOffers(count || 0);
  };

  const fetchPendingVerifications = async () => {
    const { count } = await supabase
      .from('user_info')
      .select('*', { count: 'exact', head: true })
      .eq('verified', false);
    setPendingVerifications(count || 0);
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      // Time range
      const endDate = new Date();
      const startDate = new Date();
      if (timeRange === '7d') startDate.setDate(endDate.getDate() - 7);
      else if (timeRange === '30d') startDate.setDate(endDate.getDate() - 30);
      else if (timeRange === '90d') startDate.setDate(endDate.getDate() - 90);
      // New users over time
      const { data: usersOverTime, error: usersError } = await supabase
        .from('user_info')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      const usersByDate = {};
      usersOverTime?.forEach(user => {
        const date = format(new Date(user.created_at), 'yyyy-MM-dd');
        usersByDate[date] = (usersByDate[date] || 0) + 1;
      });
      const newUsersOverTime = Object.entries(usersByDate).map(([date, count]) => ({ date, count }));
      // Transaction types
      const { data: depositRequests, error: depositsError } = await supabase
        .from('deposit_requests')
        .select('status, amount');
      const transactionTypes = [
        { type: 'approved', count: depositRequests?.filter(r => r.status === 'approved').length || 0 },
        { type: 'pending', count: depositRequests?.filter(r => r.status === 'pending').length || 0 },
        { type: 'rejected', count: depositRequests?.filter(r => r.status === 'rejected').length || 0 }
      ];
      // Activity by hour (mock data)
      const activityByHour = Array.from({ length: 24 }, (_, i) => ({ hour: i, activity: Math.floor(Math.random() * 50) + 10 }));
      setAnalyticsData({ newUsersOverTime, transactionTypes, activityByHour });
    } catch (error) {
      toast({ title: t('common.error'), description: t('admin.analytics.errorFetch'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'text-primary', trend, trendValue }: { 
    title: string; 
    value: number; 
    icon: React.ComponentType<{ className?: string }>; 
    color?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: number;
  }) => (
    <Card className="shadow-card hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-1">
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : trend === 'down' ? (
                  <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />
                ) : (
                  <div className="h-3 w-3" />
                )}
                <span className={`text-xs ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {trendValue > 0 ? '+' : ''}{trendValue}%
                </span>
              </div>
            )}
          </div>
          <div>
            <Icon className={`h-8 w-8 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('admin.analytics')}</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('admin.analytics.timeRange')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{t('admin.analytics.last7days')}</SelectItem>
            <SelectItem value="30d">{t('admin.analytics.last30days')}</SelectItem>
            <SelectItem value="90d">{t('admin.analytics.last90days')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t('admin.analytics.monthlyDeposits')} value={monthlyDeposits} icon={DollarSign} />
        <StatCard title={t('admin.analytics.weeklyNewUsers')} value={weeklyNewUsers} icon={Users2} />
        <StatCard title={t('admin.analytics.pendingWithdrawals')} value={pendingWithdrawals} icon={TrendingUp} />
        <StatCard title={t('admin.analytics.avgTransactionValue')} value={averageTransactionValue} icon={BarChart3} />
        <StatCard title={t('admin.analytics.activeOffers')} value={activeOffers} icon={Gift} />
        <StatCard title={t('admin.analytics.pendingVerifications')} value={pendingVerifications} icon={FileCheck} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.analytics.newUsersOverTime')}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Chart placeholder */}
            <pre className="text-xs">{JSON.stringify(analyticsData.newUsersOverTime, null, 2)}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.analytics.transactionTypes')}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Chart placeholder */}
            <pre className="text-xs">{JSON.stringify(analyticsData.transactionTypes, null, 2)}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.analytics.activityByHour')}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Chart placeholder */}
            <pre className="text-xs">{JSON.stringify(analyticsData.activityByHour, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 