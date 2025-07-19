import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  deposit_number: string;
  proof_image?: string;
  admin_note?: string;
  rejection_reason?: string;
  created_at: string;
  user_number?: string;
  target_number?: string;
  screenshot_url?: string;
}

export default function DepositRequestsPage() {
  const { t } = useLanguage();
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const perPage = 10;

  // Fetch deposit requests (no user info join, just like AdminDashboard)
  const fetchDepositRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDepositRequests(data || []);
    } catch (error) {
      console.error('Error fetching deposit requests:', error);
      toast({
        title: t('common.error'),
        description: t('deposit.requests') + ' ' + (error as any)?.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepositRequests();
  }, []);

  // Approve deposit
  const handleApprove = async (req: DepositRequest) => {
    try {
      // First, update the deposit request status
      const { error: updateError } = await supabase
        .from('deposit_requests')
        .update({ status: 'approved' })
        .eq('id', req.id);
      
      if (updateError) throw updateError;

      // Then, add the deposit amount to the user's balance
      const userUid = req.user_id;
      const { data: userInfo, error: userError } = await supabase
        .from('user_info')
        .select('balance')
        .eq('user_uid', userUid)
        .single();

      if (userError) {
        console.error('Error fetching user info:', userError);
        toast({ 
          title: t('common.error'), 
          description: t('deposit.error.fetchBalanceFailed'), 
          variant: 'destructive' 
        });
        return;
      }

      const currentBalance = userInfo?.balance || 0;
      const newBalance = currentBalance + req.amount;

      const { error: balanceError } = await supabase
        .from('user_info')
        .update({ balance: newBalance })
        .eq('user_uid', userUid);

      if (balanceError) {
        console.error('Error updating user balance:', balanceError);
        toast({ 
          title: t('common.error'), 
          description: t('deposit.error.updateBalanceFailed'), 
          variant: 'destructive' 
        });
        return;
      }

      toast({ 
        title: t('common.success'), 
        description: t('deposit.success.approvedWithBalance').replace('{amount}', req.amount.toString()) 
      });
      fetchDepositRequests();
    } catch (error) {
      console.error('Error approving deposit:', error);
      toast({ 
        title: t('common.error'), 
        description: (error as any)?.message, 
        variant: 'destructive' 
      });
    }
  };

  // Reject deposit
  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deposit_requests')
        .update({ status: 'rejected' })
        .eq('id', id);
      if (error) throw error;
      toast({ title: t('common.success'), description: t('deposit.rejected') });
      fetchDepositRequests();
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      toast({ title: t('common.error'), description: (error as any)?.message, variant: 'destructive' });
    }
  };

  // Filtered and paginated data
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return depositRequests;
    return depositRequests.filter((r) => r.status === statusFilter);
  }, [depositRequests, statusFilter]);
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * perPage, page * perPage),
    [filtered, page]
  );

  // Reset to first page when filter changes
  useEffect(() => { setPage(1); }, [statusFilter]);

  // Export handlers
  const handleExportCSV = () => {
    const data = filtered.map(req => ({
      [t('deposit.amount')]: req.amount,
      [t('deposit.userNumber')]: req.user_number || req.user_id,
      [t('deposit.targetNumber')]: req.target_number || '-',
      [t('deposit.screenshot')]: req.screenshot_url ? req.screenshot_url : '-',
      [t('deposit.status')]: req.status,
      [t('common.date')]: new Date(req.created_at).toLocaleDateString(),
    }));
    if (data.length === 0) return toast({ title: t('common.error'), description: t('deposit.error.noDataExport'), variant: 'destructive' });
    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(item => Object.values(item).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deposit_requests_${new Date().toISOString()}.csv`;
    a.click();
  };
  const handleExportExcel = () => {
    const data = filtered.map(req => ({
      [t('deposit.amount')]: req.amount,
      [t('deposit.userNumber')]: req.user_number || req.user_id,
      [t('deposit.targetNumber')]: req.target_number || '-',
      [t('deposit.screenshot')]: req.screenshot_url ? req.screenshot_url : '-',
      [t('deposit.status')]: req.status,
      [t('common.date')]: new Date(req.created_at).toLocaleDateString(),
    }));
    if (data.length === 0) return toast({ title: t('common.error'), description: t('deposit.error.noDataExport'), variant: 'destructive' });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Deposit Requests');
    XLSX.writeFile(workbook, `deposit_requests_${new Date().toISOString()}.xlsx`);
  };
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.text(t('deposit.requests'), 14, 16);
      const tableColumn = [t('deposit.amount'), t('deposit.userNumber'), t('deposit.targetNumber'), t('deposit.screenshot'), t('deposit.status'), t('common.date')];
      const tableRows = filtered.map(req => [
        req.amount,
        req.user_number || req.user_id,
        req.target_number || '-',
        req.screenshot_url ? req.screenshot_url : '-',
        req.status,
        new Date(req.created_at).toLocaleDateString(),
      ]);
      if (tableRows.length === 0) throw new Error('No data to export');
      autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
      doc.save(`deposit_requests_${new Date().toISOString()}.pdf`);
    } catch (err) {
      toast({ title: t('common.error'), description: t('deposit.error.exportPDFFailed') + ': ' + (err.message || err), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-8">
      <Card className="shadow-card w-full bg-background border border-border dark:bg-muted/40 dark:border-muted-foreground/10 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            {t('deposit.requests') || 'Deposit Requests'}
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="outline" onClick={handleExportCSV}>{t('export.csv')}</Button>
              <Button size="sm" variant="outline" onClick={handleExportExcel}>{t('export.excel')}</Button>
              <Button size="sm" variant="outline" onClick={handleExportPDF}>{t('export.pdf')}</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 items-center mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('deposit.status.filter') || 'Filter by status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('deposit.status.all') || 'All'}</SelectItem>
                <SelectItem value="pending">{t('deposit.status.pending') || 'Pending'}</SelectItem>
                <SelectItem value="approved">{t('deposit.status.approved') || 'Approved'}</SelectItem>
                <SelectItem value="rejected">{t('deposit.status.rejected') || 'Rejected'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-lg font-medium">{t('common.loading') || 'Loading...'}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <ImageIcon className="w-10 h-10 opacity-30" />
              <span className="text-lg font-medium">{t('deposit.noRequests') || 'No deposit requests found'}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('deposit.amount') || 'Amount'}</TableHead>
                    <TableHead>{t('deposit.userNumber') || 'User Number'}</TableHead>
                    <TableHead>{t('deposit.targetNumber') || 'Target Number'}</TableHead>
                    <TableHead>{t('deposit.screenshot') || 'Screenshot'}</TableHead>
                    <TableHead>{t('deposit.status') || 'Status'}</TableHead>
                    <TableHead>{t('deposit.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.amount}</TableCell>
                      <TableCell>{req.user_number || req.user_id}</TableCell>
                      <TableCell>{req.target_number || '-'}</TableCell>
                      <TableCell>
                        {req.screenshot_url ? (
                          <a
                            href={req.screenshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {t('deposit.view') || 'View'}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {t(`deposit.status.${req.status}`) || req.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {req.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-success" onClick={() => handleApprove(req)}>
                              {t('admin.accept') || 'Accept'}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}>
                              {t('admin.reject') || 'Reject'}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {/* Pagination */}
          {totalPages > 1 && filtered.length > 0 && (
            <div className="flex justify-center mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                    >
                      {t('pagination.previous')}
                    </PaginationPrevious>
                  </PaginationItem>
                  {[...Array(totalPages)].map((_, idx) => (
                    <PaginationItem key={idx}>
                      <PaginationLink isActive={page === idx + 1} onClick={() => setPage(idx + 1)}>
                        {idx + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                    >
                      {t('pagination.next')}
                    </PaginationNext>
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