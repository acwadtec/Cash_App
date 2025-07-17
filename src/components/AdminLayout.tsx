import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Users, Package, Gift, DollarSign, BarChart3, Bell, Phone, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { testTables } from '@/lib/supabase';

export function AdminLayout() {
  const { t } = useLanguage();
  const location = useLocation();
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      const results = await testTables();
      
      // Check if any tables failed
      const failedTables = Object.entries(results)
        .filter(([_, result]) => !result.exists)
        .map(([table, result]) => `${table}: ${result.error}`);

      if (failedTables.length > 0) {
        toast({
          title: 'Connection Test Failed',
          description: `Some tables are not accessible. Check console for details.`,
          variant: 'destructive',
        });
        console.error('Failed tables:', failedTables);
      } else {
        toast({
          title: 'Connection Test Successful',
          description: 'All tables are accessible.',
        });
      }
    } catch (error) {
      toast({
        title: 'Connection Test Error',
        description: 'Failed to test connections. Check console for details.',
        variant: 'destructive',
      });
      console.error('Test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-sm">
        <div className="p-4">
          <h1 className="text-xl font-bold">{t('Admin Dashboard')}</h1>
          <Button 
            variant="outline" 
            className="w-full mt-4" 
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
        <nav className="mt-4">
          <Link
            to="/admin/users"
            className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              location.pathname === '/admin/users' ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <Users className="mr-2 h-4 w-4" />
            {t('Users')}
          </Link>
          <Link
            to="/admin/offers"
            className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              location.pathname === '/admin/offers' ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <Package className="mr-2 h-4 w-4" />
            {t('Manage Offers')}
          </Link>
          <Link
            to="/admin/referrals"
            className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              location.pathname === '/admin/referrals' ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <Gift className="mr-2 h-4 w-4" />
            {t('Referrals')}
          </Link>
          <Link
            to="/admin/withdrawals"
            className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              location.pathname === '/admin/withdrawals' ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            {t('Withdrawal Requests')}
          </Link>
          <Link
            to="/admin/transactions"
            className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              location.pathname === '/admin/transactions' ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            {t('Transaction Logs')}
          </Link>
          <Link
            to="/admin/notifications"
            className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              location.pathname === '/admin/notifications' ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <Bell className="mr-2 h-4 w-4" />
            {t('Notifications')}
          </Link>
          <Link
            to="/admin/deposit-numbers"
            className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              location.pathname === '/admin/deposit-numbers' ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <Phone className="mr-2 h-4 w-4" />
            {t('Deposit Numbers')}
          </Link>
          <Link
            to="/admin/deposit-requests"
            className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              location.pathname === '/admin/deposit-requests' ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            {t('Deposit Requests')}
          </Link>
          <Link
            to="/admin/support"
            className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              location.pathname === '/admin/support' ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <Phone className="mr-2 h-4 w-4" />
            {t('Customer Support')}
          </Link>
          <Link
            to="/admin/gamification"
            className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              location.pathname === '/admin/gamification' ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <Trophy className="mr-2 h-4 w-4" />
            {t('Gamification')}
          </Link>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
} 