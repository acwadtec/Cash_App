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
import { Loader2, Image as ImageIcon, Download, FileText, FileSpreadsheet, Eye, CheckCircle, XCircle } from 'lucide-react';
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('deposit.requests') || 'Deposit Requests'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Review and manage user deposit requests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              {filtered.length} Requests
            </Badge>
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ImageIcon className="w-5 h-5 text-primary" />
                </div>
                {t('deposit.requests') || 'Deposit Requests'}
              </CardTitle>
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
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Filter:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-background/50 border-border/50">
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
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <span className="text-lg font-medium">{t('common.loading') || 'Loading...'}</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <ImageIcon className="w-12 h-12 opacity-50" />
                </div>
                <span className="text-lg font-medium mb-2">{t('deposit.noRequests') || 'No deposit requests found'}</span>
                <span className="text-sm text-center max-w-md">
                  No deposit requests match your current filter criteria
                </span>
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-semibold">Amount</TableHead>
                        <TableHead className="font-semibold">User Number</TableHead>
                        <TableHead className="font-semibold">Target Number</TableHead>
                        <TableHead className="font-semibold">Screenshot</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((req) => (
                        <TableRow key={req.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-medium">
                            ${req.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {req.user_number || req.user_id}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {req.target_number || '-'}
                          </TableCell>
                          <TableCell>
                            {req.screenshot_url ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                              >
                                <a
                                  href={req.screenshot_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </a>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(req.status)}
                          </TableCell>
                          <TableCell>
                            {req.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleApprove(req)}
                                  className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Accept
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  onClick={() => handleReject(req.id)}
                                  className="shadow-sm"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && filtered.length > 0 && (
              <div className="flex justify-center pt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-muted/50'}
                      />
                    </PaginationItem>
                    {[...Array(totalPages)].map((_, idx) => (
                      <PaginationItem key={idx}>
                        <PaginationLink 
                          isActive={page === idx + 1} 
                          onClick={() => setPage(idx + 1)}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          {idx + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
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