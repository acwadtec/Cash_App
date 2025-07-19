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
    <div className={`min-h-screen py-20 ${isRTL ? 'rtl' : 'ltr'} bg-gradient-to-br from-background via-background to-muted/20 text-foreground`}>
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {t('profile.wallet') || 'Wallet'}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage your balances and view transaction history
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 mx-auto"></div>
              <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-primary mx-auto"></div>
            </div>
            <p className="mt-6 text-lg text-muted-foreground font-medium">{t('common.loading')}</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-red-500/10 to-red-600/10 flex items-center justify-center">
              <div className="text-3xl text-red-500">⚠️</div>
            </div>
            <p className="text-xl text-red-500 font-medium">{error}</p>
          </div>
        ) : wallet ? (
          <div className="space-y-8">
            {/* Enhanced Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-2xl bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20 overflow-hidden group hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="flex items-center gap-6 p-6 relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-green-600 p-1 group-hover:scale-110 transition-transform duration-300">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <DollarSign className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-green-600/70 font-medium mb-1">{t('profile.balance')}</p>
                    <p className="text-3xl font-bold text-green-600">{wallet.balance} <span className="text-lg">EGP</span></p>
                    <p className="text-xs text-green-600/50 mt-1">Available balance</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20 overflow-hidden group hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="flex items-center gap-6 p-6 relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 p-1 group-hover:scale-110 transition-transform duration-300">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <WalletIcon className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-purple-600/70 font-medium mb-1">{t('profile.bonuses')}</p>
                    <p className="text-3xl font-bold text-purple-600">{wallet.bonuses} <span className="text-lg">EGP</span></p>
                    <p className="text-xs text-purple-600/50 mt-1">Bonus rewards</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20 overflow-hidden group hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="flex items-center gap-6 p-6 relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 p-1 group-hover:scale-110 transition-transform duration-300">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <TrendingUp className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-orange-600/70 font-medium mb-1">{t('profile.teamEarnings')}</p>
                    <p className="text-3xl font-bold text-orange-600">{wallet.team_earnings} <span className="text-lg">EGP</span></p>
                    <p className="text-xs text-orange-600/50 mt-1">Team commission</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 overflow-hidden group hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="flex items-center gap-6 p-6 relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 p-1 group-hover:scale-110 transition-transform duration-300">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <Coins className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600/70 font-medium mb-1">{t('profile.totalPoints')}</p>
                    <p className="text-3xl font-bold text-blue-600">{wallet.total_points}</p>
                    <p className="text-xs text-blue-600/50 mt-1">Total points earned</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Recent Transactions */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  {t('transactions.title') || 'Recent Transactions'}
                </h2>
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-purple-600 p-1">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <div className="text-xl">📊</div>
                  </div>
                </div>
              </div>
              {transactions.length === 0 ? (
                <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
                  <CardContent className="pt-12 pb-12 relative text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 flex items-center justify-center">
                      <div className="text-3xl">📋</div>
                    </div>
                    <p className="text-xl text-muted-foreground font-medium">
                      {t('transactions.noResults') || 'No transactions found.'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Your transaction history will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
                  <div className="relative overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gradient-to-r from-primary/10 to-purple-500/10">
                        <TableRow>
                          <TableHead className="font-bold text-primary">{t('transactions.id') || 'ID'}</TableHead>
                          <TableHead className="font-bold text-primary">{t('transactions.type') || 'Type'}</TableHead>
                          <TableHead className="font-bold text-primary">{t('transactions.amount') || 'Amount'}</TableHead>
                          <TableHead className="font-bold text-primary">{t('transactions.status') || 'Status'}</TableHead>
                          <TableHead className="font-bold text-primary">{t('transactions.date') || 'Date'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx, index) => (
                          <TableRow key={tx.id} className="hover:bg-gradient-to-r hover:from-primary/5 hover:to-purple-500/5 transition-all duration-300">
                            <TableCell className="font-mono text-sm">{tx.id.slice(-6)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
                                {formatType(tx.type, t)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold text-green-600">{tx.amount} EGP</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`${
                                  tx.status === 'completed' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                  tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                                  'bg-red-500/10 text-red-600 border-red-500/20'
                                }`}
                              >
                                {formatStatus(tx.status, t)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 flex items-center justify-center">
              <div className="text-3xl">💳</div>
            </div>
            <p className="text-xl text-muted-foreground font-medium">
              {t('profile.noData') || 'No wallet data found.'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Please complete your profile to view wallet information
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 