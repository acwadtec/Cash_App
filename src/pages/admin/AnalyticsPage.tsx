import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users2, DollarSign, Gift, FileCheck, Calendar, Activity } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
// Recharts Components
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const { theme } = useTheme();
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

  // Theme-aware colors for charts
  const chartColors = {
    primary: theme === 'dark' ? '#3b82f6' : '#2563eb',
    secondary: theme === 'dark' ? '#10b981' : '#059669',
    accent: theme === 'dark' ? '#f59e0b' : '#d97706',
    danger: theme === 'dark' ? '#ef4444' : '#dc2626',
    success: theme === 'dark' ? '#22c55e' : '#16a34a',
    warning: theme === 'dark' ? '#f97316' : '#ea580c',
    grid: theme === 'dark' ? '#374151' : '#e5e7eb',
    text: theme === 'dark' ? '#f9fafb' : '#111827',
    background: theme === 'dark' ? '#1f2937' : '#ffffff'
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label, type = 'default' }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {type === 'currency' ? `$${entry.value.toLocaleString()}` : entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

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
        .lte('created_at', endDate.toISOString())
        .not('role', 'eq', 'admin');
      
      const usersByDate: { [key: string]: number } = {};
      usersOverTime?.forEach(user => {
        const date = format(new Date(user.created_at), 'yyyy-MM-dd');
        usersByDate[date] = (usersByDate[date] || 0) + 1;
      });
      
      const newUsersOverTime = Object.entries(usersByDate)
        .map(([date, count]) => ({ 
          date: format(new Date(date), 'MMM dd'), 
          users: count 
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Transaction types
      const { data: depositRequests, error: depositsError } = await supabase
        .from('deposit_requests')
        .select('status, amount');
      
      const transactionTypes = [
        { 
          name: t('admin.analytics.approved'), 
          value: depositRequests?.filter(r => r.status === 'approved').length || 0,
          color: chartColors.success
        },
        { 
          name: t('admin.analytics.pending'), 
          value: depositRequests?.filter(r => r.status === 'pending').length || 0,
          color: chartColors.warning
        },
        { 
          name: t('admin.analytics.rejected'), 
          value: depositRequests?.filter(r => r.status === 'rejected').length || 0,
          color: chartColors.danger
        }
      ];
      
      // Activity by hour (simulated data based on time)
      const activityByHour = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        activity: Math.floor(Math.random() * 50) + 10,
        deposits: Math.floor(Math.random() * 20) + 5,
        withdrawals: Math.floor(Math.random() * 15) + 3
      }));
      
      setAnalyticsData({ newUsersOverTime, transactionTypes, activityByHour });
    } catch (error) {
      toast({ title: t('common.error'), description: t('admin.analytics.errorFetch'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'text-primary', trend, trendValue, format = 'number' }: { 
    title: string; 
    value: number; 
    icon: React.ComponentType<{ className?: string }>; 
    color?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: number;
    format?: 'number' | 'currency';
  }) => (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-background to-muted/20">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold ${color}`}>
              {format === 'currency' ? `$${value.toLocaleString()}` : value.toLocaleString()}
            </p>
            {trend && trendValue && (
              <div className="flex items-center gap-1">
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : trend === 'down' ? (
                  <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />
                ) : (
                  <div className="h-3 w-3" />
                )}
                <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {trendValue > 0 ? '+' : ''}{trendValue}%
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full bg-gradient-to-br ${color.replace('text-', 'bg-')}/10`}>
            <Icon className={`h-8 w-8 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ChartCard = ({ title, children, className = '' }: { 
    title: string; 
    children: React.ReactNode; 
    className?: string;
  }) => (
    <Card className={`shadow-lg border-0 bg-gradient-to-br from-background to-muted/20 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4 p-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 bg-gradient-to-br from-background via-background to-muted/20 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t('admin.analytics')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('admin.analytics.timeRange')}: {t(`admin.analytics.${timeRange === '7d' ? 'last7days' : timeRange === '30d' ? 'last30days' : 'last90days'}`)}
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px] bg-background border-border">
            <SelectValue placeholder={t('admin.analytics.timeRange')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{t('admin.analytics.last7days')}</SelectItem>
            <SelectItem value="30d">{t('admin.analytics.last30days')}</SelectItem>
            <SelectItem value="90d">{t('admin.analytics.last90days')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard 
          title={t('admin.analytics.monthlyDeposits')} 
          value={monthlyDeposits} 
          icon={DollarSign} 
          color="text-green-600"
          format="currency"
          trend="up"
          trendValue={12}
        />
        <StatCard 
          title={t('admin.analytics.weeklyNewUsers')} 
          value={weeklyNewUsers} 
          icon={Users2} 
          color="text-blue-600"
          trend="up"
          trendValue={8}
        />
        <StatCard 
          title={t('admin.analytics.pendingWithdrawals')} 
          value={pendingWithdrawals} 
          icon={TrendingUp} 
          color="text-orange-600"
          trend="down"
          trendValue={-5}
        />
        <StatCard 
          title={t('admin.analytics.avgTransactionValue')} 
          value={Math.round(averageTransactionValue)} 
          icon={BarChart3} 
          color="text-purple-600"
          format="currency"
          trend="up"
          trendValue={15}
        />
        <StatCard 
          title={t('admin.analytics.activeOffers')} 
          value={activeOffers} 
          icon={Gift} 
          color="text-pink-600"
          trend="neutral"
        />
        <StatCard 
          title={t('admin.analytics.pendingVerifications')} 
          value={pendingVerifications} 
          icon={FileCheck} 
          color="text-red-600"
          trend="down"
          trendValue={-3}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* New Users Over Time - Line Chart */}
        <ChartCard title={t('admin.analytics.newUsersOverTime')}>
          {analyticsData.newUsersOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.newUsersOverTime}>
                <defs>
                  <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis 
                  dataKey="date" 
                  stroke={chartColors.text}
                  fontSize={12}
                />
                <YAxis 
                  stroke={chartColors.text}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke={chartColors.primary} 
                  fill="url(#userGradient)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-80 text-muted-foreground">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('admin.analytics.noData')}</p>
              </div>
            </div>
          )}
        </ChartCard>

        {/* Transaction Types - Pie Chart */}
        <ChartCard title={t('admin.analytics.transactionTypes')}>
          {analyticsData.transactionTypes.some(t => t.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.transactionTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analyticsData.transactionTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry: any) => (
                    <span style={{ color: chartColors.text }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-80 text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('admin.analytics.noData')}</p>
              </div>
            </div>
          )}
        </ChartCard>

        {/* Activity By Hour - Bar Chart */}
        <ChartCard title={t('admin.analytics.activityByHour')} className="md:col-span-2">
          {analyticsData.activityByHour.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.activityByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis 
                  dataKey="hour" 
                  stroke={chartColors.text}
                  fontSize={12}
                />
                <YAxis 
                  stroke={chartColors.text}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value, entry: any) => (
                    <span style={{ color: chartColors.text }}>{value}</span>
                  )}
                />
                <Bar 
                  dataKey="activity" 
                  fill={chartColors.primary} 
                  radius={[4, 4, 0, 0]}
                  name={t('admin.analytics.activity')}
                />
                <Bar 
                  dataKey="deposits" 
                  fill={chartColors.success} 
                  radius={[4, 4, 0, 0]}
                  name={t('admin.transactions.deposits')}
                />
                <Bar 
                  dataKey="withdrawals" 
                  fill={chartColors.warning} 
                  radius={[4, 4, 0, 0]}
                  name={t('admin.transactions.withdrawals')}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-80 text-muted-foreground">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('admin.analytics.noData')}</p>
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
} 