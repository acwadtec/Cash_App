
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Transactions() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock transactions data
  const transactions = [
    {
      id: 'TXN001',
      type: 'withdrawal',
      amount: 500,
      status: 'completed',
      date: '2024-07-01',
      description: t('language.switch') === 'English' ? 'سحب أرباح شخصية' : 'Personal earnings withdrawal',
      method: t('language.switch') === 'English' ? 'بنك' : 'Bank',
    },
    {
      id: 'TXN002',
      type: 'bonus',
      amount: 50,
      status: 'completed',
      date: '2024-06-30',
      description: t('language.switch') === 'English' ? 'مكافأة إحالة صديق' : 'Friend referral bonus',
      method: t('language.switch') === 'English' ? 'محفظة' : 'Wallet',
    },
    {
      id: 'TXN003',
      type: 'earning',
      amount: 200,
      status: 'pending',
      date: '2024-06-29',
      description: t('language.switch') === 'English' ? 'أرباح فريق' : 'Team earnings',
      method: t('language.switch') === 'English' ? 'محفظة' : 'Wallet',
    },
    {
      id: 'TXN004',
      type: 'withdrawal',
      amount: 300,
      status: 'rejected',
      date: '2024-06-28',
      description: t('language.switch') === 'English' ? 'سحب مكافآت' : 'Bonus withdrawal',
      method: t('language.switch') === 'English' ? 'بنك' : 'Bank',
    },
    {
      id: 'TXN005',
      type: 'deposit',
      amount: 1000,
      status: 'completed',
      date: '2024-06-25',
      description: t('language.switch') === 'English' ? 'إيداع رأس مال' : 'Capital deposit',
      method: t('language.switch') === 'English' ? 'تحويل بنكي' : 'Bank transfer',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesFilter = filter === 'all' || transaction.type === filter;
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">{t('transactions.title')}</h1>
            <p className="text-xl text-muted-foreground">
              {t('transactions.subtitle')}
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-6 shadow-card">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder={t('transactions.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12"
                  />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="md:w-48 h-12">
                    <SelectValue placeholder={t('transactions.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('transactions.all')}</SelectItem>
                    <SelectItem value="withdrawal">{t('transactions.withdrawal')}</SelectItem>
                    <SelectItem value="deposit">{t('transactions.deposit')}</SelectItem>
                    <SelectItem value="bonus">{t('transactions.bonus')}</SelectItem>
                    <SelectItem value="earning">{t('transactions.earning')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <Card key={transaction.id} className="shadow-card hover:shadow-glow transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline">{t(`transactions.${transaction.type}`)}</Badge>
                        <Badge className={getStatusColor(transaction.status)}>
                          {t(`transactions.${transaction.status}`)}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{transaction.description}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('transactions.id')} {transaction.id} • {transaction.method}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        transaction.type === 'withdrawal' || transaction.type === 'expense' 
                          ? 'text-destructive' 
                          : 'text-success'
                      }`}>
                        {transaction.type === 'withdrawal' ? '-' : '+'}${transaction.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.date}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTransactions.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="pt-8 text-center">
                <p className="text-muted-foreground text-lg">{t('transactions.noResults')}</p>
              </CardContent>
            </Card>
          )}

          {/* Summary Card */}
          <Card className="mt-8 gradient-card shadow-glow">
            <CardHeader>
              <CardTitle className="text-center">{t('transactions.summary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-success mb-2">
                    ${transactions.filter(t => t.type !== 'withdrawal').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('transactions.totalIncome')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-destructive mb-2">
                    ${transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('transactions.totalWithdrawals')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-2">
                    {transactions.filter(t => t.status === 'pending').length}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('transactions.pendingCount')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
