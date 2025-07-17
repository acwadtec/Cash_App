import { useState, useEffect } from 'react';
import { DollarSign, Download, Search, Filter } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Services
import { supabase } from '@/lib/supabase';

interface Transaction {
  id: string;
  user_id: string;
  user_name: string;
  type: 'deposit' | 'withdrawal' | 'referral' | 'bonus';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  description?: string;
}

export default function TransactionsPage() {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, statusFilter, dateFilter]);

  const fetchTransactions = async () => {
    try {
      setLoadingTransactions(true);
      let query = supabase
        .from('transactions')
        .select('*, users(name)')
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateFilter) {
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query.gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      setTransactions(data?.map(transaction => ({
        ...transaction,
        user_name: transaction.users.name
      })) || []);
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to fetch transactions'),
        variant: 'destructive',
      });
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = transactions.map(transaction => ({
        ID: transaction.id,
        User: transaction.user_name,
        Type: transaction.type,
        Amount: transaction.amount,
        Status: transaction.status,
        Date: new Date(transaction.created_at).toLocaleDateString(),
        Description: transaction.description || ''
      }));

      if (exportFormat === 'csv') {
        const csvContent = [
          Object.keys(data[0]).join(','),
          ...data.map(item => Object.values(item).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString()}.csv`;
        a.click();
      } else {
        // Implement PDF export if needed
        toast({
          title: t('Info'),
          description: t('PDF export not implemented yet'),
        });
      }

      setShowExportModal(false);
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to export transactions'),
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{t('Pending')}</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t('Completed')}</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{t('Failed')}</Badge>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{t('Deposit')}</Badge>;
      case 'withdrawal':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{t('Withdrawal')}</Badge>;
      case 'referral':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t('Referral')}</Badge>;
      case 'bonus':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{t('Bonus')}</Badge>;
      default:
        return null;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchTerm === '' || 
      transaction.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('Transactions')}</h2>
        <Button onClick={() => setShowExportModal(true)}>
          <Download className="mr-2 h-4 w-4" />
          {t('Export')}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t('Search transactions...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('Filter by type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Types')}</SelectItem>
            <SelectItem value="deposit">{t('Deposits')}</SelectItem>
            <SelectItem value="withdrawal">{t('Withdrawals')}</SelectItem>
            <SelectItem value="referral">{t('Referrals')}</SelectItem>
            <SelectItem value="bonus">{t('Bonuses')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('Filter by status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Statuses')}</SelectItem>
            <SelectItem value="pending">{t('Pending')}</SelectItem>
            <SelectItem value="completed">{t('Completed')}</SelectItem>
            <SelectItem value="failed">{t('Failed')}</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              {dateFilter ? new Date(dateFilter).toLocaleDateString() : t('Filter by date')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={dateFilter}
              onSelect={setDateFilter}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('Transactions List')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ID')}</TableHead>
                <TableHead>{t('User')}</TableHead>
                <TableHead>{t('Type')}</TableHead>
                <TableHead>{t('Amount')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead>{t('Date')}</TableHead>
                <TableHead>{t('Description')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingTransactions ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    {t('Loading...')}
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    {t('No transactions found')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono">{transaction.id}</TableCell>
                    <TableCell>{transaction.user_name}</TableCell>
                    <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">${transaction.amount.toLocaleString()}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-xs truncate" title={transaction.description}>
                      {transaction.description}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Export Transactions')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Export Format')}</Label>
              <Select value={exportFormat} onValueChange={(value: 'csv' | 'pdf') => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select format')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleExport}>
              {t('Export')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 