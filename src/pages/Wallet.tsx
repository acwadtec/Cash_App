import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { DollarSign, Wallet as WalletIcon, TrendingUp, Coins } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface UserWallet {
  balance: number;
  bonuses: number;
  team_earnings: number;
  total_points: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function Wallet() {
  const { t, isRTL } = useLanguage();
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWallet = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) throw new Error('Not logged in');
        const { data, error } = await supabase
          .from('user_info')
          .select('balance, bonuses, team_earnings, total_points')
          .eq('user_uid', user.id)
          .single();
        if (error) throw error;
        setWallet(data);
        // Fetch recent transactions
        const { data: txs, error: txError } = await supabase
          .from('transactions')
          .select('id, type, amount, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (txError) throw txError;
        setTransactions(txs || []);
      } catch (err: any) {
        setError(err.message || 'Error loading wallet');
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, []);

  function formatType(type: string, t: (key: string) => string) {
    // Try translation, else fallback to formatted label
    const translation = t(`transactions.${type}`);
    if (translation && !translation.startsWith('transactions.')) return translation;
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  function formatStatus(status: string, t: (key: string) => string) {
    const translation = t(`transactions.${status}`);
    if (translation && !translation.startsWith('transactions.')) return translation;
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  return (
    <div className={`min-h-screen py-20 ${isRTL ? 'rtl' : 'ltr'} bg-background text-foreground`}>
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8 text-primary text-center">{t('profile.wallet') || 'Wallet'}</h1>
        {loading ? (
          <div className="py-16 text-center text-lg text-muted-foreground">{t('common.loading')}</div>
        ) : error ? (
          <div className="py-16 text-center text-red-500">{error}</div>
        ) : wallet ? (
          <div className="space-y-6">
            {/* Balance Cards */}
            <div className="flex flex-col gap-4">
              <Card className="border-green-400 dark:border-green-700">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                    <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">{t('profile.balance')}</p>
                    <p className="text-2xl font-bold text-green-800 dark:text-green-200">{wallet.balance} EGP</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-purple-400 dark:border-purple-700">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                    <WalletIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">{t('profile.bonuses')}</p>
                    <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">{wallet.bonuses} EGP</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-orange-400 dark:border-orange-700">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                    <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">{t('profile.teamEarnings')}</p>
                    <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">{wallet.team_earnings} EGP</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-400 dark:border-blue-700">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                    <Coins className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">{t('profile.totalPoints')}</p>
                    <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{wallet.total_points}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Recent Transactions */}
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">{t('transactions.title') || 'Recent Transactions'}</h2>
              {transactions.length === 0 ? (
                <div className="text-muted-foreground text-center py-8">{t('transactions.noResults') || 'No transactions found.'}</div>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>{t('transactions.id') || 'ID'}</TableHead>
                        <TableHead>{t('transactions.type') || 'Type'}</TableHead>
                        {/* Uncomment if you want description: <TableHead>{t('transactions.description') || 'Description'}</TableHead> */}
                        <TableHead>{t('transactions.amount') || 'Amount'}</TableHead>
                        <TableHead>{t('transactions.status') || 'Status'}</TableHead>
                        <TableHead>{t('transactions.date') || 'Date'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map(tx => (
                        <TableRow key={tx.id}>
                          <TableCell>{tx.id.slice(-6)}</TableCell>
                          <TableCell>{formatType(tx.type, t)}</TableCell>
                          {/* Uncomment if you want description: <TableCell>{tx.description || ''}</TableCell> */}
                          <TableCell>{tx.amount} EGP</TableCell>
                          <TableCell>{formatStatus(tx.status, t)}</TableCell>
                          <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-muted-foreground">{t('profile.noData') || 'No wallet data found.'}</div>
        )}
      </div>
    </div>
  );
} 