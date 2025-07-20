import { useState, useEffect } from 'react';
import { DollarSign, Download, Search, Filter, FileText, FileSpreadsheet, Eye, TrendingUp, Users, Calendar } from 'lucide-react';

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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { BadgeCheck, XCircle, Eye as EyeIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Services
import { supabase } from '@/lib/supabase';

interface Transaction {
  id: string;
  type: string;
  user_name: string;
  user_uid: string;
  amount: number;
  status: string;
  method: string;
  created_at: string;
  screenshot_url?: string;
  proof_image_url?: string;
  admin_note?: string;
  rejection_reason?: string;
}

export default function TransactionsPage() {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const transactionsPerPage = 15;
  const { isRTL } = useLanguage();
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');

  useEffect(() => { fetchTransactions(); }, [typeFilter, statusFilter]);

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      // Fetch deposit requests
      const { data: deposits } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false });
      // Fetch withdrawal requests
      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });
      // Get all unique user UIDs
      const allUserUids = new Set();
      (deposits || []).forEach(d => d.user_uid && allUserUids.add(d.user_uid));
      (withdrawals || []).forEach(w => w.user_uid && allUserUids.add(w.user_uid));
      // Fetch user info
      let userInfoMap: Record<string, any> = {};
      if (allUserUids.size > 0) {
        const { data: userInfoData } = await supabase
          .from('user_info')
          .select('user_uid, first_name, last_name, email')
          .in('user_uid', Array.from(allUserUids));
        (userInfoData || []).forEach(user => {
          userInfoMap[user.user_uid] = user;
        });
      }
      // Format transactions
      const depositTxns = (deposits || []).map(deposit => {
        const userInfo = userInfoMap[deposit.user_uid];
        const userName = userInfo ? `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || userInfo.email : (deposit.user_name || t('admin.transactions.unknownUser'));
        return {
          id: `deposit_${deposit.id}`,
          type: 'deposit',
          user_name: userName,
          user_uid: deposit.user_uid,
          amount: deposit.amount,
          status: deposit.status,
          method: deposit.target_number || t('admin.transactions.mobileTransfer'),
          created_at: deposit.created_at,
          screenshot_url: deposit.screenshot_url,
          admin_note: deposit.admin_note,
          rejection_reason: deposit.rejection_reason
        };
      });
      const withdrawalTxns = (withdrawals || []).map(withdrawal => {
        const userInfo = userInfoMap[withdrawal.user_uid];
        const userName = userInfo ? `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || userInfo.email : (withdrawal.user_name || t('admin.transactions.unknownUser'));
        return {
          id: `withdrawal_${withdrawal.id}`,
          type: 'withdrawal',
          user_name: userName,
          user_uid: withdrawal.user_uid,
          amount: withdrawal.amount,
          status: withdrawal.status,
          method: withdrawal.method,
          created_at: withdrawal.created_at,
          proof_image_url: withdrawal.proof_image_url,
          admin_note: withdrawal.admin_note,
          rejection_reason: withdrawal.rejection_reason
        };
      });
      const allTxns = [...depositTxns, ...withdrawalTxns].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTransactions(allTxns);
      setPage(1);
    } catch (e) {
      toast({ title: t('common.error'), description: t('admin.transactions.fetchError'), variant: 'destructive' });
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    const data = filteredTransactions.map(transaction => ({
      ID: transaction.id,
      User: transaction.user_name,
      Type: transaction.type,
      Amount: transaction.amount,
      Status: transaction.status,
      Method: transaction.method,
      Date: new Date(transaction.created_at).toLocaleDateString(),
    }));
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
  };
  const handleExportExcel = () => {
    const data = filteredTransactions.map(transaction => ({
      ID: transaction.id,
      User: transaction.user_name,
      Type: transaction.type,
      Amount: transaction.amount,
      Status: transaction.status,
      Method: transaction.method,
      Date: new Date(transaction.created_at).toLocaleDateString(),
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    XLSX.writeFile(workbook, `transactions_${new Date().toISOString()}.xlsx`);
  };
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(t('admin.transactions.transactionHistory'), 14, 16);
    const tableColumn = ['ID', 'User', 'Type', 'Amount', 'Status', 'Method', 'Date'];
    const tableRows = filteredTransactions.map(transaction => [
      transaction.id,
      transaction.user_name,
      transaction.type,
      transaction.amount,
      transaction.status,
      transaction.method,
      new Date(transaction.created_at).toLocaleDateString(),
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save(`transactions_${new Date().toISOString()}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">{t('Pending')}</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">{t('Completed')}</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{t('Failed')}</Badge>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{t('Deposit')}</Badge>;
      case 'withdrawal':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">{t('Withdrawal')}</Badge>;
      case 'referral':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">{t('Referral')}</Badge>;
      case 'bonus':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">{t('Bonus')}</Badge>;
      default:
        return null;
    }
  };

  const filteredTransactions = transactions.filter(txn => {
    if (typeFilter !== 'all' && txn.type !== typeFilter) return false;
    if (statusFilter !== 'all' && txn.status !== statusFilter) return false;
    if (searchTerm && !(
      txn.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.id.toLowerCase().includes(searchTerm.toLowerCase())
    )) return false;
    return true;
  });
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const paginatedTransactions = filteredTransactions.slice((page - 1) * transactionsPerPage, page * transactionsPerPage);

  // Calculate stats
  const totalAmount = filteredTransactions.reduce((sum, txn) => sum + txn.amount, 0);
  const depositCount = filteredTransactions.filter(txn => txn.type === 'deposit').length;
  const withdrawalCount = filteredTransactions.filter(txn => txn.type === 'withdrawal').length;
  const pendingCount = filteredTransactions.filter(txn => txn.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('admin.transactions') || 'Transactions'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage all financial transactions
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleExportCSV}
              className="bg-background/50 hover:bg-background/80"
            >
              <FileText className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleExportExcel}
              className="bg-background/50 hover:bg-background/80"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleExportPDF}
              className="bg-background/50 hover:bg-background/80"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Amount</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    ${totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Deposits</p>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {depositCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                  <Download className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Withdrawals</p>
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    {withdrawalCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/50">
                  <Calendar className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Pending</p>
                  <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                    {pendingCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Filter className="w-5 h-5 text-primary" />
              </div>
              {t('admin.filters') || 'Filters'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('admin.search') || 'Search'}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={t('admin.transactions.search') || 'Search transactions...'}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background/50 border-border/50 focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('admin.transactions.type') || 'Type'}</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder={t('admin.transactions.filterByType') || 'Filter by type'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.transactions.allTypes') || 'All Types'}</SelectItem>
                    <SelectItem value="deposit">{t('admin.transactions.deposit') || 'Deposit'}</SelectItem>
                    <SelectItem value="withdrawal">{t('admin.transactions.withdrawal') || 'Withdrawal'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('admin.transactions.status') || 'Status'}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder={t('admin.transactions.filterByStatus') || 'Filter by status'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.transactions.all') || 'All'}</SelectItem>
                    <SelectItem value="pending">{t('admin.transactions.pending') || 'Pending'}</SelectItem>
                    <SelectItem value="approved">{t('admin.transactions.approved') || 'Approved'}</SelectItem>
                    <SelectItem value="paid">{t('admin.transactions.paid') || 'Paid'}</SelectItem>
                    <SelectItem value="rejected">{t('admin.transactions.rejected') || 'Rejected'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              {t('admin.transactions.list') || 'Transaction History'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <span className="text-lg font-medium">{t('common.loading') || 'Loading...'}</span>
              </div>
            ) : paginatedTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <DollarSign className="w-12 h-12 opacity-50" />
                </div>
                <span className="text-lg font-medium mb-2">{t('admin.transactions.noTransactions') || 'No transactions found'}</span>
                <span className="text-sm text-center max-w-md">
                  No transactions match your current filter criteria
                </span>
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-semibold">{t('admin.transactions.date') || 'Date'}</TableHead>
                        <TableHead className="font-semibold">{t('admin.transactions.type') || 'Type'}</TableHead>
                        <TableHead className="font-semibold">{t('admin.transactions.user') || 'User'}</TableHead>
                        <TableHead className="font-semibold">{t('admin.transactions.amount') || 'Amount'}</TableHead>
                        <TableHead className="font-semibold">{t('admin.transactions.method') || 'Method'}</TableHead>
                        <TableHead className="font-semibold">{t('admin.transactions.status') || 'Status'}</TableHead>
                        <TableHead className="font-semibold">{t('admin.transactions.actions') || 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((txn) => (
                        <TableRow key={txn.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell>
                            <div className="text-sm font-medium">
                              {new Date(txn.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(txn.created_at).toLocaleTimeString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getTypeBadge(txn.type)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {txn.user_name}
                          </TableCell>
                          <TableCell className="font-mono">
                            <span className="font-bold text-green-600 dark:text-green-400">
                              ${Number(txn.amount).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {txn.method}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                txn.status === 'approved' || txn.status === 'paid' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : txn.status === 'rejected' 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }
                            >
                              {t(`admin.transactions.${txn.status}`) || txn.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {txn.status === 'paid' && txn.proof_image_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 p-0 h-auto"
                                >
                                  <a href={txn.proof_image_url} target="_blank" rel="noopener noreferrer">
                                    <EyeIcon className="w-4 h-4 mr-1" />
                                    {t('admin.transactions.viewProof') || 'View Proof'}
                                  </a>
                                </Button>
                              )}
                              {txn.status === 'approved' && txn.screenshot_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 p-0 h-auto"
                                >
                                  <a href={txn.screenshot_url} target="_blank" rel="noopener noreferrer">
                                    <EyeIcon className="w-4 h-4 mr-1" />
                                    {t('admin.transactions.viewScreenshot') || 'View Screenshot'}
                                  </a>
                                </Button>
                              )}
                              {(txn.admin_note || txn.rejection_reason) && (
                                <div className="text-xs text-muted-foreground">
                                  {txn.admin_note && (
                                    <div className="mb-1">
                                      <span className="font-medium">{t('admin.transactions.note') || 'Note'}:</span> {txn.admin_note}
                                    </div>
                                  )}
                                  {txn.rejection_reason && (
                                    <div>
                                      <span className="font-medium">{t('admin.transactions.reason') || 'Reason'}:</span> {txn.rejection_reason}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <Pagination>
                  <PaginationContent className={isRTL ? 'flex-row-reverse' : ''}>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPage(p => Math.max(p - 1, 1))} 
                        className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-muted/50'} 
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <PaginationItem key={i + 1}>
                        <PaginationLink 
                          onClick={() => setPage(i + 1)} 
                          className={page === i + 1 ? 'bg-primary text-white cursor-default' : 'cursor-pointer hover:bg-muted/50'} 
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPage(p => Math.min(p + 1, totalPages))} 
                        className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-muted/50'} 
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 