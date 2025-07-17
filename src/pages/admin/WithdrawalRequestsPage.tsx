import { useState, useEffect } from 'react';
import { DollarSign, Check, X, Clock, AlertTriangle } from 'lucide-react';

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

interface WithdrawalRequest {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  payment_method: string;
  account_details: string;
  created_at: string;
  admin_note?: string;
  rejection_reason?: string;
  proof_image?: string;
}

export default function WithdrawalRequestsPage() {
  const { t } = useLanguage();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchWithdrawals();
  }, [statusFilter]);

  const fetchWithdrawals = async () => {
    try {
      setLoadingWithdrawals(true);
      let query = supabase
        .from('withdrawal_requests')
        .select('*, users(name)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setWithdrawals(data?.map(withdrawal => ({
        ...withdrawal,
        user_name: withdrawal.users.name
      })) || []);
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to fetch withdrawal requests'),
        variant: 'destructive',
      });
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  const handlePay = async () => {
    if (!selectedWithdrawal || !proofImage) return;

    try {
      // Upload proof image
      const filePath = `withdrawal-proofs/${Date.now()}-${proofImage.name}`;
      const { error: uploadError } = await supabase.storage
        .from('withdrawal-proofs')
        .upload(filePath, proofImage);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('withdrawal-proofs')
        .getPublicUrl(filePath);

      // Update withdrawal request
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'paid',
          admin_note: adminNote,
          proof_image: urlData.publicUrl,
          paid_at: new Date().toISOString()
        })
        .eq('id', selectedWithdrawal.id);

      if (updateError) throw updateError;

      toast({
        title: t('Success'),
        description: t('Withdrawal request marked as paid'),
      });

      setShowPayModal(false);
      setSelectedWithdrawal(null);
      setAdminNote('');
      setProofImage(null);
      fetchWithdrawals();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to process payment'),
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectionReason) return;

    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason
        })
        .eq('id', selectedWithdrawal.id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Withdrawal request rejected'),
      });

      setShowRejectModal(false);
      setSelectedWithdrawal(null);
      setRejectionReason('');
      fetchWithdrawals();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to reject withdrawal request'),
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
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Check className="w-3 h-3 mr-1" />
          {t('Approved')}
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <X className="w-3 h-3 mr-1" />
          {t('Rejected')}
        </Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <DollarSign className="w-3 h-3 mr-1" />
          {t('Paid')}
        </Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('Withdrawal Requests')}</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('Filter by status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All')}</SelectItem>
            <SelectItem value="pending">{t('Pending')}</SelectItem>
            <SelectItem value="approved">{t('Approved')}</SelectItem>
            <SelectItem value="rejected">{t('Rejected')}</SelectItem>
            <SelectItem value="paid">{t('Paid')}</SelectItem>
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
                <TableHead>{t('Payment Method')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead>{t('Date')}</TableHead>
                <TableHead>{t('Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingWithdrawals ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {t('Loading...')}
                  </TableCell>
                </TableRow>
              ) : withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {t('No withdrawal requests found')}
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>{withdrawal.user_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">${withdrawal.amount.toLocaleString()}</Badge>
                    </TableCell>
                    <TableCell>{withdrawal.payment_method}</TableCell>
                    <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                    <TableCell>{new Date(withdrawal.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {withdrawal.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedWithdrawal(withdrawal);
                                setShowPayModal(true);
                              }}
                            >
                              {t('Pay')}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedWithdrawal(withdrawal);
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

      {/* Pay Modal */}
      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Process Payment')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Admin Note')}</Label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={t('Enter payment details or notes')}
              />
            </div>
            <div>
              <Label>{t('Payment Proof')}</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setProofImage(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={handlePay} disabled={!proofImage}>
              {t('Confirm Payment')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Reject Withdrawal')}</DialogTitle>
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