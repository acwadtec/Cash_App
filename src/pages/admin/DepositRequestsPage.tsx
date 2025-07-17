import { useState, useEffect } from 'react';
import { DollarSign, Check, X, Clock } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Services
import { supabase } from '@/lib/supabase';

interface DepositRequest {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  deposit_number: string;
  proof_image: string;
  created_at: string;
  admin_note?: string;
  rejection_reason?: string;
}

export default function DepositRequestsPage() {
  const { t } = useLanguage();
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DepositRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchDepositRequests();
  }, [statusFilter]);

  const fetchDepositRequests = async () => {
    try {
      setLoadingRequests(true);
      let query = supabase
        .from('deposit_requests')
        .select('*, users(name)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setDepositRequests(data?.map(request => ({
        ...request,
        user_name: request.users.name
      })) || []);
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to fetch deposit requests'),
        variant: 'destructive',
      });
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApprove = async (request: DepositRequest) => {
    try {
      const { error } = await supabase
        .from('deposit_requests')
        .update({
          status: 'approved',
          admin_note: adminNote
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Deposit request approved'),
      });
      fetchDepositRequests();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to approve deposit request'),
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) return;

    try {
      const { error } = await supabase
        .from('deposit_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Deposit request rejected'),
      });
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchDepositRequests();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to reject deposit request'),
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          {t('Pending')}
        </Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Check className="w-3 h-3 mr-1" />
          {t('Approved')}
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <X className="w-3 h-3 mr-1" />
          {t('Rejected')}
        </Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('Deposit Requests')}</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('Filter by status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All')}</SelectItem>
            <SelectItem value="pending">{t('Pending')}</SelectItem>
            <SelectItem value="approved">{t('Approved')}</SelectItem>
            <SelectItem value="rejected">{t('Rejected')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('Requests List')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('User')}</TableHead>
                <TableHead>{t('Amount')}</TableHead>
                <TableHead>{t('Deposit Number')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead>{t('Date')}</TableHead>
                <TableHead>{t('Proof')}</TableHead>
                <TableHead>{t('Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingRequests ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    {t('Loading...')}
                  </TableCell>
                </TableRow>
              ) : depositRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    {t('No deposit requests found')}
                  </TableCell>
                </TableRow>
              ) : (
                depositRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.user_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">${request.amount.toLocaleString()}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{request.deposit_number}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {request.proof_image && (
                        <a
                          href={request.proof_image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-600"
                        >
                          {t('View Proof')}
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request)}
                            >
                              {t('Approve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectModal(true);
                              }}
                            >
                              {t('Reject')}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Reject Deposit Request')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Rejection Reason')}</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('Enter reason for rejection')}
              />
            </div>
            <Button onClick={handleReject} variant="destructive" disabled={!rejectionReason}>
              {t('Confirm Rejection')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 