import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users2, DollarSign } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Services
import { supabase } from '@/lib/supabase';

interface AnalyticsData {
  newUsersOverTime: {
    date: string;
    count: number;
  }[];
  transactionTypes: {
    type: string;
    count: number;
    amount: number;
  }[];
  activityByHour: {
    hour: number;
    count: number;
  }[];
}

interface Stats {
  monthlyDeposits: number;
  weeklyNewUsers: number;
  pendingWithdrawals: number;
  averageTransactionValue: number;
}

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    newUsersOverTime: [],
    transactionTypes: [],
    activityByHour: []
  });
  const [stats, setStats] = useState<Stats>({
    monthlyDeposits: 0,
    weeklyNewUsers: 0,
    pendingWithdrawals: 0,
    averageTransactionValue: 0
  });
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      // Fetch new users over time
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (usersError) throw usersError;

      // Group users by date
      const usersByDate = usersData?.reduce((acc, user) => {
        const date = new Date(user.created_at).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Fetch transactions data
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('type, amount, created_at, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (transactionsError) throw transactionsError;

      // Group transactions by type
      const transactionsByType = transactionsData?.reduce((acc, transaction) => {
        if (!acc[transaction.type]) {
          acc[transaction.type] = { count: 0, amount: 0 };
        }
        acc[transaction.type].count++;
        acc[transaction.type].amount += transaction.amount;
        return acc;
      }, {} as Record<string, { count: number; amount: number }>);

      // Calculate activity by hour
      const activityByHour = transactionsData?.reduce((acc, transaction) => {
        const hour = new Date(transaction.created_at).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      // Calculate stats
      const monthlyDeposits = transactionsData
        ?.filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      const weeklyNewUsers = Object.values(usersByDate || {})
        .reduce((sum, count) => sum + count, 0);

      const pendingWithdrawals = transactionsData
        ?.filter(t => t.type === 'withdrawal' && t.status === 'pending')
        .length || 0;

      const averageTransactionValue = transactionsData?.length
        ? transactionsData.reduce((sum, t) => sum + t.amount, 0) / transactionsData.length
        : 0;

      setAnalyticsData({
        newUsersOverTime: Object.entries(usersByDate || {}).map(([date, count]) => ({
          date,
          count
        })),
        transactionTypes: Object.entries(transactionsByType || {}).map(([type, data]) => ({
          type,
          count: data.count,
          amount: data.amount
        })),
        activityByHour: Object.entries(activityByHour || {}).map(([hour, count]) => ({
          hour: parseInt(hour),
          count
        }))
      });

      setStats({
        monthlyDeposits,
        weeklyNewUsers,
        pendingWithdrawals,
        averageTransactionValue
      });
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to fetch analytics data'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend }: { 
    title: string; 
    value: number | string; 
    icon: React.ComponentType<{ className?: string }>;
    trend?: { type: 'up' | 'down'; value: number };
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {trend && (
          <p className={`text-xs ${trend.type === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend.type === 'up' ? '+' : '-'}{trend.value}%
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('Analytics')}</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('Select time range')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{t('Last 7 days')}</SelectItem>
            <SelectItem value="30d">{t('Last 30 days')}</SelectItem>
            <SelectItem value="90d">{t('Last 90 days')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('Monthly Deposits')}
          value={`$${stats.monthlyDeposits.toLocaleString()}`}
          icon={DollarSign}
        />
        <StatCard
          title={t('Weekly New Users')}
          value={stats.weeklyNewUsers}
          icon={Users2}
        />
        <StatCard
          title={t('Pending Withdrawals')}
          value={stats.pendingWithdrawals}
          icon={TrendingUp}
        />
        <StatCard
          title={t('Avg Transaction Value')}
          value={`$${stats.averageTransactionValue.toLocaleString()}`}
          icon={BarChart3}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('New Users Over Time')}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Add chart component here */}
            <pre className="text-xs">
              {JSON.stringify(analyticsData.newUsersOverTime, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Transaction Types')}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Add chart component here */}
            <pre className="text-xs">
              {JSON.stringify(analyticsData.transactionTypes, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Activity by Hour')}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Add chart component here */}
            <pre className="text-xs">
              {JSON.stringify(analyticsData.activityByHour, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 