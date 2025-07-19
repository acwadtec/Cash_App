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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { BadgeCheck, XCircle, Eye } from 'lucide-react';
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

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('admin.transactions')}</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportCSV}>{t('export.csv')}</Button>
          <Button size="sm" variant="outline" onClick={handleExportExcel}>{t('export.excel')}</Button>
          <Button size="sm" variant="outline" onClick={handleExportPDF}>{t('export.pdf')}</Button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t('admin.transactions.search')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('admin.transactions.filterByType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.transactions.allTypes')}</SelectItem>
            <SelectItem value="deposit">{t('admin.transactions.deposit')}</SelectItem>
            <SelectItem value="withdrawal">{t('admin.transactions.withdrawal')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('admin.transactions.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.transactions.all')}</SelectItem>
            <SelectItem value="pending">{t('admin.transactions.pending')}</SelectItem>
            <SelectItem value="approved">{t('admin.transactions.approved')}</SelectItem>
            <SelectItem value="paid">{t('admin.transactions.paid')}</SelectItem>
            <SelectItem value="rejected">{t('admin.transactions.rejected')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.transactions.list')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.transactions.date')}</TableHead>
                <TableHead>{t('admin.transactions.type')}</TableHead>
                <TableHead>{t('admin.transactions.user')}</TableHead>
                <TableHead>{t('admin.transactions.amount')}</TableHead>
                <TableHead>{t('admin.transactions.method')}</TableHead>
                <TableHead>{t('admin.transactions.status')}</TableHead>
                <TableHead>{t('admin.transactions.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingTransactions ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    {t('admin.transactions.noTransactions')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>
                      {new Date(txn.created_at).toLocaleDateString()}<br />
                      <span className="text-xs text-muted-foreground">{new Date(txn.created_at).toLocaleTimeString()}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={txn.type === 'deposit' ? 'default' : 'secondary'}>
                        {txn.type === 'deposit' ? t('admin.transactions.deposit') : t('admin.transactions.withdrawal')}
                      </Badge>
                    </TableCell>
                    <TableCell>{txn.user_name}</TableCell>
                    <TableCell className="font-bold">${Number(txn.amount).toLocaleString()}</TableCell>
                    <TableCell>{txn.method}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={txn.status === 'approved' || txn.status === 'paid' ? 'default' : txn.status === 'rejected' ? 'destructive' : 'secondary'}
                      >
                        {t(`admin.transactions.${txn.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {txn.status === 'paid' && txn.proof_image_url && (
                        <a href={txn.proof_image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                          <Eye className="w-4 h-4" /> {t('admin.transactions.viewProof')}
                        </a>
                      )}
                      {txn.status === 'approved' && txn.screenshot_url && (
                        <a href={txn.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                          <Eye className="w-4 h-4" /> {t('admin.transactions.viewScreenshot')}
                        </a>
                      )}
                      {(txn.admin_note || txn.rejection_reason) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {txn.admin_note && <div>{t('admin.transactions.note')}: {txn.admin_note}</div>}
                          {txn.rejection_reason && <div>{t('admin.transactions.reason')}: {txn.rejection_reason}</div>}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <Pagination>
                <PaginationContent className={isRTL ? 'flex-row-reverse' : ''}>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setPage(p => Math.max(p - 1, 1))} className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}>{t('pagination.previous')}</PaginationPrevious>
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <PaginationItem key={i + 1}>
                      <PaginationLink onClick={() => setPage(i + 1)} className={page === i + 1 ? 'bg-primary text-white cursor-default' : 'cursor-pointer'}>{i + 1}</PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext onClick={() => setPage(p => Math.min(p + 1, totalPages))} className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}>{t('pagination.next')}</PaginationNext>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 