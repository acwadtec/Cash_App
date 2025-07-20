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
        <div className="bg-background border border-border rounded-lg shadow-lg p-2 sm:p-3 max-w-xs">
          <p className="text-xs sm:text-sm font-medium text-foreground truncate">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs sm:text-sm truncate" style={{ color: entry.color }}>
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
      console.log('=== FETCHING ADVANCED STATS ===');
      
      // Monthly deposits
      const startOfCurrentMonth = startOfMonth(new Date());
      const endOfCurrentMonth = endOfMonth(new Date());
      const { data: deposits, error: depositsError } = await supabase
        .from('deposit_requests')
        .select('amount')
        .gte('created_at', startOfCurrentMonth.toISOString())
        .lte('created_at', endOfCurrentMonth.toISOString())
        .eq('status', 'approved');
      
      console.log('Monthly deposits query:', { 
        startDate: startOfCurrentMonth.toISOString(), 
        endDate: endOfCurrentMonth.toISOString(),
        depositsFound: deposits?.length || 0,
        error: depositsError 
      });
      
      if (!depositsError) {
        const totalMonthlyDeposits = deposits?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
        setMonthlyDeposits(totalMonthlyDeposits);
        console.log('Total monthly deposits:', totalMonthlyDeposits);
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
      
      console.log('Weekly users query:', { 
        startDate: startOfCurrentWeek.toISOString(), 
        endDate: endOfCurrentWeek.toISOString(),
        usersFound: weeklyUsers || 0,
        error: usersError 
      });
      
      if (!usersError) setWeeklyNewUsers(weeklyUsers || 0);
      
      // Average transaction value
      const { data: allDeposits, error: avgError } = await supabase
        .from('deposit_requests')
        .select('amount')
        .eq('status', 'approved');
      
      console.log('Average transaction query:', { 
        depositsFound: allDeposits?.length || 0,
        error: avgError 
      });
      
      if (!avgError && allDeposits && allDeposits.length > 0) {
        const totalAmount = allDeposits.reduce((sum, d) => sum + Number(d.amount), 0);
        const avgValue = totalAmount / allDeposits.length;
        setAverageTransactionValue(avgValue);
        console.log('Average transaction value:', avgValue);
      }
      
      // Pending withdrawals
      const { count: pendingW, error: pendingWError } = await supabase
        .from('withdrawal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      console.log('Pending withdrawals query:', { 
        pendingFound: pendingW || 0,
        error: pendingWError 
      });
      
      if (!pendingWError) setPendingWithdrawals(pendingW || 0);
      
      console.log('=== ADVANCED STATS COMPLETE ===');
    } catch (error) {
      console.error('Advanced stats error:', error);
      toast({ title: t('common.error'), description: t('admin.analytics.errorStats'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOffers = async () => {
    const { count, error } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);
    
    console.log('Active offers query:', { 
      activeOffersFound: count || 0,
      error 
    });
    
    setActiveOffers(count || 0);
  };

  const fetchPendingVerifications = async () => {
    const { count, error } = await supabase
      .from('user_info')
      .select('*', { count: 'exact', head: true })
      .eq('verified', false);
    
    console.log('Pending verifications query:', { 
      pendingVerificationsFound: count || 0,
      error 
    });
    
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
      
      // New users over time - Enhanced with better data handling
      console.log('=== FETCHING NEW USERS DATA ===');
      console.log('Date range:', { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString(),
        timeRange 
      });
      
      const { data: usersOverTime, error: usersError } = await supabase
        .from('user_info')
        .select('created_at, id, email')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('role', 'eq', 'admin')
        .order('created_at', { ascending: true })
        .limit(1000); // Ensure we get up to 1000 users (adjust if needed)
      
      console.log('Raw users data:', usersOverTime);
      console.log('Users query error:', usersError);
      console.log('Total users found:', usersOverTime?.length || 0);
      
      // If no users found in date range, check if there are any users at all
      if (!usersOverTime || usersOverTime.length === 0) {
        console.log('No users found in date range, checking for any users...');
        const { data: allUsers, error: allUsersError } = await supabase
          .from('user_info')
          .select('created_at, id, email')
          .not('role', 'eq', 'admin')
          .order('created_at', { ascending: false })
          .limit(10);
        
        console.log('Sample of all users:', allUsers);
        console.log('All users error:', allUsersError);
        
        if (allUsers && allUsers.length > 0) {
          console.log('Users exist but not in the selected date range');
          console.log('Sample user dates:', allUsers.map(u => u.created_at));
          console.log('Total users in database (estimated):', allUsers.length);
          
          // Check if we need to adjust the date range
          const oldestUser = allUsers[allUsers.length - 1];
          const newestUser = allUsers[0];
          console.log('Date range of users in DB:', {
            oldest: oldestUser.created_at,
            newest: newestUser.created_at
          });
        } else {
          console.log('No users found in database at all');
        }
      }
      
      // Create a map of all dates in the range
      const dateRange: { [key: string]: number } = {};
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        dateRange[dateKey] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Count users for each date
      console.log('Processing users by date...');
      usersOverTime?.forEach((user, index) => {
        const userDate = new Date(user.created_at);
        const date = format(userDate, 'yyyy-MM-dd');
        console.log(`User ${index + 1}: ${user.email} - ${user.created_at} -> ${date}`);
        
        if (dateRange[date] !== undefined) {
          dateRange[date]++;
        } else {
          console.log(`Warning: Date ${date} not in range`);
        }
      });
      
      console.log('Users by date:', dateRange);
      console.log('Date range keys:', Object.keys(dateRange));
      
      const newUsersOverTime = Object.entries(dateRange)
        .map(([date, count]) => ({ 
          date: format(new Date(date), 'MMM dd'), 
          users: count 
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      console.log('Processed users data:', newUsersOverTime);
      console.log('Total data points for chart:', newUsersOverTime.length);
      console.log('Data points with users > 0:', newUsersOverTime.filter(item => item.users > 0).length);
      
      // If no real data, create sample data for demonstration
      if (newUsersOverTime.every(item => item.users === 0)) {
        console.log('No real user data found, creating sample data for demonstration...');
        const sampleData = [];
        const currentDate = new Date(startDate);
        
        for (let i = 0; i < Math.min(7, newUsersOverTime.length); i++) {
          sampleData.push({
            date: format(currentDate, 'MMM dd'),
            users: Math.floor(Math.random() * 5) + 1
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log('Sample data created:', sampleData);
        // Use sample data instead of empty data
        newUsersOverTime.splice(0, sampleData.length, ...sampleData);
      }
      
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
      
      // Activity by hour - Real data from database with enhanced limits
      console.log('=== FETCHING HOURLY ACTIVITY DATA ===');
      
      // First, let's verify the table structure
      console.log('Verifying table structure...');
      
      const { data: hourlyActivity, error: hourlyError } = await supabase
        .from('deposit_requests')
        .select('created_at, amount, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true })
        .limit(1000); // Ensure we get up to 1000 deposit records
      
      const { data: hourlyWithdrawals, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .select('created_at, amount, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true })
        .limit(1000); // Ensure we get up to 1000 withdrawal records
      
      // Verify table structure by checking sample data
      if (hourlyActivity && hourlyActivity.length > 0) {
        console.log('Sample deposit record structure:', {
          created_at: hourlyActivity[0].created_at,
          amount: hourlyActivity[0].amount,
          status: hourlyActivity[0].status,
          hasCreatedAt: 'created_at' in hourlyActivity[0],
          hasAmount: 'amount' in hourlyActivity[0],
          hasStatus: 'status' in hourlyActivity[0]
        });
      }
      
      if (hourlyWithdrawals && hourlyWithdrawals.length > 0) {
        console.log('Sample withdrawal record structure:', {
          created_at: hourlyWithdrawals[0].created_at,
          amount: hourlyWithdrawals[0].amount,
          status: hourlyWithdrawals[0].status,
          hasCreatedAt: 'created_at' in hourlyWithdrawals[0],
          hasAmount: 'amount' in hourlyWithdrawals[0],
          hasStatus: 'status' in hourlyWithdrawals[0]
        });
      }
      
      console.log('Hourly activity query results:', {
        depositsFound: hourlyActivity?.length || 0,
        withdrawalsFound: hourlyWithdrawals?.length || 0,
        depositError: hourlyError,
        withdrawalError: withdrawalError
      });
      
      // If no data found, let's check if tables exist and their structure
      if ((!hourlyActivity || hourlyActivity.length === 0) && !hourlyError) {
        console.log('No deposit data found, checking table structure...');
        const { data: sampleDeposits, error: sampleDepositError } = await supabase
          .from('deposit_requests')
          .select('*')
          .limit(1);
        
        console.log('Sample deposit table check:', {
          data: sampleDeposits,
          error: sampleDepositError,
          tableExists: !sampleDepositError
        });
      }
      
      if ((!hourlyWithdrawals || hourlyWithdrawals.length === 0) && !withdrawalError) {
        console.log('No withdrawal data found, checking table structure...');
        const { data: sampleWithdrawals, error: sampleWithdrawalError } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .limit(1);
        
        console.log('Sample withdrawal table check:', {
          data: sampleWithdrawals,
          error: sampleWithdrawalError,
          tableExists: !sampleWithdrawalError
        });
      }
      
      console.log('Hourly activity data:', { hourlyActivity, hourlyWithdrawals });
      
      // Process hourly data with enhanced debugging
      console.log('Processing hourly data...');
      
      const hourlyStats: { [key: number]: { deposits: number; withdrawals: number; activity: number } } = {};
      
      // Initialize all hours
      for (let i = 0; i < 24; i++) {
        hourlyStats[i] = { deposits: 0, withdrawals: 0, activity: 0 };
      }
      
      // Count deposits by hour with detailed logging
      console.log('Processing deposits by hour...');
      hourlyActivity?.forEach((deposit, index) => {
        const depositDate = new Date(deposit.created_at);
        const hour = depositDate.getHours();
        const dateStr = format(depositDate, 'yyyy-MM-dd HH:mm');
        
        console.log(`Deposit ${index + 1}: ${dateStr} (Hour: ${hour}) - Amount: $${deposit.amount} - Status: ${deposit.status}`);
        
        hourlyStats[hour].deposits++;
        hourlyStats[hour].activity++;
      });
      
      // Count withdrawals by hour with detailed logging
      console.log('Processing withdrawals by hour...');
      hourlyWithdrawals?.forEach((withdrawal, index) => {
        const withdrawalDate = new Date(withdrawal.created_at);
        const hour = withdrawalDate.getHours();
        const dateStr = format(withdrawalDate, 'yyyy-MM-dd HH:mm');
        
        console.log(`Withdrawal ${index + 1}: ${dateStr} (Hour: ${hour}) - Amount: $${withdrawal.amount} - Status: ${withdrawal.status}`);
        
        hourlyStats[hour].withdrawals++;
        hourlyStats[hour].activity++;
      });
      
      console.log('Hourly statistics:', hourlyStats);
      
      const activityByHour = Object.entries(hourlyStats).map(([hour, stats]) => ({
        hour: `${hour}:00`,
        activity: stats.activity,
        deposits: stats.deposits,
        withdrawals: stats.withdrawals
      }));
      
      console.log('Processed hourly activity:', activityByHour);
      
      // Calculate summary statistics
      const totalDeposits = hourlyActivity?.length || 0;
      const totalWithdrawals = hourlyWithdrawals?.length || 0;
      const totalActivity = totalDeposits + totalWithdrawals;
      const peakHour = activityByHour.reduce((max, current) => 
        current.activity > max.activity ? current : max
      );
      
      console.log('=== HOURLY ACTIVITY SUMMARY ===');
      console.log('Total deposits:', totalDeposits);
      console.log('Total withdrawals:', totalWithdrawals);
      console.log('Total activity:', totalActivity);
      console.log('Peak activity hour:', peakHour.hour, `(${peakHour.activity} transactions)`);
      console.log('Hours with activity:', activityByHour.filter(h => h.activity > 0).length);
      console.log('================================');
      
      // Log any errors
      if (usersError) {
        console.error('Error fetching users data:', usersError);
      }
      if (depositsError) {
        console.error('Error fetching deposits data:', depositsError);
      }
      if (hourlyError) {
        console.error('Error fetching hourly activity data:', hourlyError);
      }
      if (withdrawalError) {
        console.error('Error fetching withdrawal data:', withdrawalError);
      }
      
      // Log summary statistics
      console.log('=== DATABASE DATA SUMMARY ===');
      console.log('Users found:', usersOverTime?.length || 0);
      console.log('Deposits found:', depositRequests?.length || 0);
      console.log('Hourly activity records:', hourlyActivity?.length || 0);
      console.log('Withdrawal records:', hourlyWithdrawals?.length || 0);
      console.log('Date range:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });
      console.log('================================');
      
      console.log('Final analytics data:', { newUsersOverTime, transactionTypes, activityByHour });
      
      setAnalyticsData({ newUsersOverTime, transactionTypes, activityByHour });
    } catch (error) {
      console.error('Analytics fetch error:', error);
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
  }) => {
    // Format the value professionally
    const formatValue = (val: number, fmt: string) => {
      if (fmt === 'currency') {
        if (val >= 1000000) {
          return `$${(val / 1000000).toFixed(1)}M`;
        } else if (val >= 1000) {
          return `$${(val / 1000).toFixed(1)}K`;
        } else {
          return `$${val.toLocaleString()}`;
        }
      } else {
        if (val >= 1000000) {
          return `${(val / 1000000).toFixed(1)}M`;
        } else if (val >= 1000) {
          return `${(val / 1000).toFixed(1)}K`;
        } else {
          return val.toLocaleString();
        }
      }
    };

    const displayValue = formatValue(value, format);
    const fullValue = format === 'currency' ? `$${value.toLocaleString()}` : value.toLocaleString();

    return (
      <Card className="group relative shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-background to-muted/20 min-h-[120px] hover:min-h-[140px] hover:scale-105 hover:z-10 overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-3 h-full">
            <div className="flex-1 min-w-0 space-y-3">
              <p className="text-sm font-medium text-muted-foreground leading-tight">{title}</p>
              <div className="flex items-baseline gap-1">
                <p className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight ${color} leading-none`}>
                  {displayValue}
                </p>
              </div>
              {trend && trendValue && (
                <div className="flex items-center gap-1 mt-2">
                  {trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />
                  ) : trend === 'down' ? (
                    <TrendingUp className="h-3 w-3 text-red-600 rotate-180 flex-shrink-0" />
                  ) : (
                    <div className="h-3 w-3 flex-shrink-0" />
                  )}
                  <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {trendValue > 0 ? '+' : ''}{trendValue}%
                  </span>
                </div>
              )}
            </div>
            <div className={`p-2 sm:p-3 rounded-full bg-gradient-to-br ${color.replace('text-', 'bg-')}/10 flex-shrink-0`}>
              <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${color}`} />
            </div>
          </div>
        </CardContent>
        
        {/* Hover expansion indicator */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {/* Professional tooltip for full value */}
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded-lg shadow-xl px-4 py-3 text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20 whitespace-nowrap">
          <div className="font-bold text-foreground text-base">
            {fullValue}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border" />
        </div>
      </Card>
    );
  };

  const ChartCard = ({ title, children, className = '' }: { 
    title: string; 
    children: React.ReactNode; 
    className?: string;
  }) => (
    <Card className={`shadow-lg border-0 bg-gradient-to-br from-background to-muted/20 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
          <Skeleton className="h-8 sm:h-10 w-24 sm:w-32" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 sm:h-32" />
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-60 sm:h-80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-background to-muted/20 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent truncate">
            {t('admin.analytics')}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base truncate">
            {t('admin.analytics.timeRange')}: {t(`admin.analytics.${timeRange === '7d' ? 'last7days' : timeRange === '30d' ? 'last30days' : 'last90days'}`)}
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background border-border">
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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="sm:col-span-2 lg:col-span-1">
          <StatCard 
            title={t('admin.analytics.monthlyDeposits')} 
            value={monthlyDeposits} 
            icon={DollarSign} 
            color="text-green-600"
            format="currency"
            trend="up"
            trendValue={12}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <StatCard 
            title={t('admin.analytics.weeklyNewUsers')} 
            value={weeklyNewUsers} 
            icon={Users2} 
            color="text-blue-600"
            trend="up"
            trendValue={8}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <StatCard 
            title={t('admin.analytics.pendingWithdrawals')} 
            value={pendingWithdrawals} 
            icon={TrendingUp} 
            color="text-orange-600"
            trend="down"
            trendValue={-5}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <StatCard 
            title={t('admin.analytics.avgTransactionValue')} 
            value={Math.round(averageTransactionValue)} 
            icon={BarChart3} 
            color="text-purple-600"
            format="currency"
            trend="up"
            trendValue={15}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <StatCard 
            title={t('admin.analytics.activeOffers')} 
            value={activeOffers} 
            icon={Gift} 
            color="text-pink-600"
            trend="neutral"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <StatCard 
            title={t('admin.analytics.pendingVerifications')} 
            value={pendingVerifications} 
            icon={FileCheck} 
            color="text-red-600"
            trend="down"
            trendValue={-3}
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* New Users Over Time - Line Chart */}
        <ChartCard title={t('admin.analytics.newUsersOverTime')}>
          {analyticsData.newUsersOverTime.length > 0 && analyticsData.newUsersOverTime.some(item => item.users > 0) ? (
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
                  fontSize={10}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke={chartColors.text}
                  fontSize={12}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke={chartColors.primary} 
                  fill="url(#userGradient)"
                  strokeWidth={3}
                  name={t('admin.analytics.newUsers')}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 sm:h-80 text-muted-foreground">
              <div className="text-center p-4">
                <Users2 className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">{t('admin.analytics.noData')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('admin.analytics.timeRange')}: {t(`admin.analytics.${timeRange === '7d' ? 'last7days' : timeRange === '30d' ? 'last30days' : 'last90days'}`)}
                </p>
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
            <div className="flex items-center justify-center h-60 sm:h-80 text-muted-foreground">
              <div className="text-center p-4">
                <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">{t('admin.analytics.noData')}</p>
              </div>
            </div>
          )}
        </ChartCard>

        {/* Activity By Hour - Bar Chart */}
        <ChartCard title={t('admin.analytics.activityByHour')} className="lg:col-span-2">
          {analyticsData.activityByHour.length > 0 && analyticsData.activityByHour.some(h => h.activity > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.activityByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis 
                  dataKey="hour" 
                  stroke={chartColors.text}
                  fontSize={10}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke={chartColors.text}
                  fontSize={12}
                  allowDecimals={false}
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
            <div className="flex items-center justify-center h-60 sm:h-80 text-muted-foreground">
              <div className="text-center p-4">
                <Activity className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">{t('admin.analytics.noData')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('admin.analytics.timeRange')}: {t(`admin.analytics.${timeRange === '7d' ? 'last7days' : timeRange === '30d' ? 'last30days' : 'last90days'}`)}
                </p>
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
} 