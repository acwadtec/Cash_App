import { useState, useEffect } from 'react';
import { DollarSign, Check, X, Clock, AlertTriangle, Pencil, Trash, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function WithdrawalRequestsPage() {
  const { t } = useLanguage();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  // New state for time slots and package limits
  const [timeSlots, setTimeSlots] = useState([]);
  const [packageLimits, setPackageLimits] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [showPackageLimits, setShowPackageLimits] = useState(false);
  // Dialog state for add/edit
  const [showTimeSlotDialog, setShowTimeSlotDialog] = useState(false);
  const [editingTimeSlotIdx, setEditingTimeSlotIdx] = useState<number | null>(null);
  const [timeSlotForm, setTimeSlotForm] = useState({ day: '', start: '', end: '' });
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [editingPackageName, setEditingPackageName] = useState<string | null>(null);
  const [packageForm, setPackageForm] = useState({ name: '', min: '', max: '', daily: '' });
  // Time slot form state
  const [newTimeSlotDay, setNewTimeSlotDay] = useState('');
  const [newTimeSlotStart, setNewTimeSlotStart] = useState('');
  const [newTimeSlotEnd, setNewTimeSlotEnd] = useState('');
  // Package limit form state
  const [packageFormName, setPackageFormName] = useState('');
  const [packageFormMin, setPackageFormMin] = useState('');
  const [packageFormMax, setPackageFormMax] = useState('');
  const [packageFormDaily, setPackageFormDaily] = useState('');
  const [packageEditIndex, setPackageEditIndex] = useState(null);

  useEffect(() => { fetchWithdrawals(); }, [statusFilter]);
  useEffect(() => { fetchSettings(); }, []);

  const fetchWithdrawals = async () => {
    setLoadingWithdrawals(true);
    const { data, error } = await supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      // Fetch user info for all withdrawals
      const userUids = data.map(w => w.user_uid).filter(Boolean);
      let userInfoMap = {};
      if (userUids.length > 0) {
        const { data: userInfoData } = await supabase
          .from('user_info')
          .select('user_uid, first_name, last_name, email')
          .in('user_uid', userUids);
        (userInfoData || []).forEach(user => {
          userInfoMap[user.user_uid] = user;
        });
      }
      const filtered = statusFilter === 'all' ? data : data.filter(w => w.status === statusFilter);
      setWithdrawals(filtered.map(w => ({
        ...w,
        user_name: userInfoMap[w.user_uid]
          ? `${userInfoMap[w.user_uid].first_name || ''} ${userInfoMap[w.user_uid].last_name || ''}`.trim() || userInfoMap[w.user_uid].email
          : (w.user_name || t('common.unknownUser')),
      })));
    } else {
      setWithdrawals([]);
    }
    setLoadingWithdrawals(false);
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    const { data } = await supabase.from('settings').select('*').eq('key', 'withdrawal_time_slots').single();
    setTimeSlots(data?.value || []);
    const { data: pkg } = await supabase.from('settings').select('*').eq('key', 'package_withdrawal_limits').single();
    setPackageLimits(pkg?.value || {});
    setSettingsLoading(false);
  };
  const handleSaveTimeSlots = async () => {
    await supabase.from('settings').upsert({ key: 'withdrawal_time_slots', value: timeSlots });
    fetchSettings();
  };
  const handleSavePackageLimits = async () => {
    await supabase.from('settings').upsert({ key: 'package_withdrawal_limits', value: packageLimits });
    fetchSettings();
  };
  const handleAddTimeSlot = () => {
    if (newTimeSlotDay && newTimeSlotStart && newTimeSlotEnd && Number(newTimeSlotEnd) > Number(newTimeSlotStart)) {
      setTimeSlots([...timeSlots, `${newTimeSlotDay}:${newTimeSlotStart}:${newTimeSlotEnd}`]);
      setNewTimeSlotDay(''); setNewTimeSlotStart(''); setNewTimeSlotEnd('');
    }
  };
  const handleRemoveTimeSlot = (idx) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== idx));
  };
  const handleAddOrUpdatePackageLimit = (e) => {
    e.preventDefault();
    if (!packageFormName || !packageFormMin || !packageFormMax || !packageFormDaily) return;
    setPackageLimits(prev => ({
      ...prev,
      [packageFormName]: {
        min: Number(packageFormMin),
        max: Number(packageFormMax),
        daily: Number(packageFormDaily)
      }
    }));
    setPackageFormName(''); setPackageFormMin(''); setPackageFormMax(''); setPackageFormDaily(''); setPackageEditIndex(null);
  };
  const handleEditPackageLimit = (pkg, vals, idx) => {
    setPackageFormName(pkg);
    setPackageFormMin(vals.min);
    setPackageFormMax(vals.max);
    setPackageFormDaily(vals.daily);
    setPackageEditIndex(idx);
  };
  const handleCancelEditPackageLimit = (e) => {
    e.preventDefault();
    setPackageFormName(''); setPackageFormMin(''); setPackageFormMax(''); setPackageFormDaily(''); setPackageEditIndex(null);
  };
  const handleRemovePackageLimit = (pkg) => {
    const newLimits = { ...packageLimits };
    delete newLimits[pkg];
    setPackageLimits(newLimits);
  };

  const handlePay = async () => {
    let imageUrl = '';
    if (proofImage) {
      const fileExt = proofImage.name.split('.').pop();
      const fileName = `${selectedWithdrawal.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('withdrawal-proofs').upload(fileName, proofImage);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('withdrawal-proofs').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      } else {
        toast({ title: t('common.error'), description: uploadError.message, variant: 'destructive' });
        return;
      }
    }
    if (selectedWithdrawal.status !== 'pending') {
      toast({ title: t('common.error'), description: t('admin.withdrawals.alreadyProcessed'), variant: 'destructive' });
      return;
    }
    const { error: updateError } = await supabase.from('withdrawal_requests').update({ status: 'paid', admin_note: adminNote, proof_image_url: imageUrl, updated_at: new Date().toISOString() }).eq('id', selectedWithdrawal.id);
    if (updateError) {
      toast({ title: t('common.error'), description: updateError.message, variant: 'destructive' });
      return;
    }
    const typeToField = {
      capital: 'balance',
      personal: 'personal_earnings',
      team: 'team_earnings',
      bonuses: 'bonuses',
    };
    const field = typeToField[selectedWithdrawal.type];
    if (field) {
      const { data: userInfo, error: userInfoError } = await supabase.from('user_info').select(field).eq('user_uid', selectedWithdrawal.user_uid).single();
      if (!userInfoError && userInfo && typeof userInfo[field] === 'number') {
        const newBalance = userInfo[field] - Number(selectedWithdrawal.amount);
        const { error: balanceError } = await supabase.from('user_info').update({ [field]: newBalance }).eq('user_uid', selectedWithdrawal.user_uid);
        if (balanceError) {
          toast({ title: t('common.error'), description: balanceError.message, variant: 'destructive' });
        } else {
          toast({ title: t('common.success'), description: t('admin.withdrawals.paidAndDeducted') });
        }
      } else {
        toast({ title: t('common.error'), description: t('admin.withdrawals.balanceFetchError'), variant: 'destructive' });
      }
    } else {
      toast({ title: t('common.error'), description: t('admin.withdrawals.unknownType'), variant: 'destructive' });
    }
    setShowPayModal(false);
    setAdminNote('');
    setProofImage(null);
    fetchWithdrawals();
  };

  const handleReject = async () => {
    await supabase.from('withdrawal_requests').update({ status: 'rejected', rejection_reason: rejectionReason, updated_at: new Date().toISOString() }).eq('id', selectedWithdrawal.id);
    setShowRejectModal(false);
    setRejectionReason('');
    fetchWithdrawals();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />{t('admin.withdrawals.pending')}</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Check className="w-3 h-3 mr-1" />{t('admin.withdrawals.approved')}</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><X className="w-3 h-3 mr-1" />{t('admin.withdrawals.rejected')}</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><DollarSign className="w-3 h-3 mr-1" />{t('admin.withdrawals.paid')}</Badge>;
      default:
        return null;
    }
  };

  // Handlers for new UI
  const openAddTimeSlot = () => {
    setEditingTimeSlotIdx(null);
    setTimeSlotForm({ day: '', start: '', end: '' });
    setShowTimeSlotDialog(true);
  };
  const openEditTimeSlot = (idx: number) => {
    const [day, start, end] = timeSlots[idx].split(':');
    setEditingTimeSlotIdx(idx);
    setTimeSlotForm({ day, start, end });
    setShowTimeSlotDialog(true);
  };
  const saveTimeSlot = () => {
    if (!timeSlotForm.day || !timeSlotForm.start || !timeSlotForm.end || Number(timeSlotForm.end) <= Number(timeSlotForm.start)) return;
    let newSlots = [...timeSlots];
    const slotStr = `${timeSlotForm.day}:${timeSlotForm.start}:${timeSlotForm.end}`;
    if (editingTimeSlotIdx === null) {
      newSlots.push(slotStr);
    } else {
      newSlots[editingTimeSlotIdx] = slotStr;
    }
    setTimeSlots(newSlots);
    setShowTimeSlotDialog(false);
    setEditingTimeSlotIdx(null);
    setTimeSlotForm({ day: '', start: '', end: '' });
  };
  const removeTimeSlot = (idx: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== idx));
  };
  const openAddPackage = () => {
    setEditingPackageName(null);
    setPackageForm({ name: '', min: '', max: '', daily: '' });
    setShowPackageDialog(true);
  };
  const openEditPackage = (pkg: string, vals: any) => {
    setEditingPackageName(pkg);
    setPackageForm({ name: pkg, min: vals.min, max: vals.max, daily: vals.daily });
    setShowPackageDialog(true);
  };
  const savePackage = () => {
    if (!packageForm.name || !packageForm.min || !packageForm.max || !packageForm.daily) return;
    setPackageLimits(prev => ({
      ...prev,
      [packageForm.name]: {
        min: Number(packageForm.min),
        max: Number(packageForm.max),
        daily: Number(packageForm.daily)
      }
    }));
    setShowPackageDialog(false);
    setEditingPackageName(null);
    setPackageForm({ name: '', min: '', max: '', daily: '' });
  };
  const removePackage = (pkg: string) => {
    const newLimits = { ...packageLimits };
    delete newLimits[pkg];
    setPackageLimits(newLimits);
  };

  // Export handlers
  const handleExportCSV = () => {
    const data = withdrawals.map(w => ({
      'User': w.user_name,
      'Amount': w.amount,
      'Method': w.method,
      'Status': w.status,
      'Date': new Date(w.created_at).toLocaleDateString(),
    }));
    if (data.length === 0) return toast({ title: t('common.error'), description: t('common.noDataToExport'), variant: 'destructive' });
    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(item => Object.values(item).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `withdrawals_${new Date().toISOString()}.csv`;
    a.click();
  };
  const handleExportExcel = () => {
    const data = withdrawals.map(w => ({
      'User': w.user_name,
      'Amount': w.amount,
      'Method': w.method,
      'Status': w.status,
      'Date': new Date(w.created_at).toLocaleDateString(),
    }));
    if (data.length === 0) return toast({ title: t('common.error'), description: t('common.noDataToExport'), variant: 'destructive' });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Withdrawals');
    XLSX.writeFile(workbook, `withdrawals_${new Date().toISOString()}.xlsx`);
  };
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.text('Withdrawal Requests', 14, 16);
      const tableColumn = ['User', 'Amount', 'Method', 'Status', 'Date'];
      const tableRows = withdrawals.map(w => [
        w.user_name,
        w.amount,
        w.method,
        w.status,
        new Date(w.created_at).toLocaleDateString(),
      ]);
      if (tableRows.length === 0) throw new Error(t('common.noDataToExport'));
      autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
      doc.save(`withdrawals_${new Date().toISOString()}.pdf`);
    } catch (err) {
      toast({ title: t('common.error'), description: t('common.exportError') + ' ' + (err.message || err), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('admin.withdrawals.title')}</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('admin.withdrawals.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.withdrawals.all')}</SelectItem>
            <SelectItem value="pending">{t('admin.withdrawals.pending')}</SelectItem>
            <SelectItem value="approved">{t('admin.withdrawals.approved')}</SelectItem>
            <SelectItem value="rejected">{t('admin.withdrawals.rejected')}</SelectItem>
            <SelectItem value="paid">{t('admin.withdrawals.paid')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('admin.withdrawals.settings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="time-slots" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="time-slots">{t('admin.withdrawals.timeSlots')}</TabsTrigger>
              <TabsTrigger value="package-limits">{t('admin.withdrawals.packageLimits')}</TabsTrigger>
            </TabsList>
            <TabsContent value="time-slots">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">{t('admin.withdrawals.timeSlotsList')}</span>
                <Button size="sm" variant="outline" onClick={openAddTimeSlot}><Plus className="w-4 h-4 mr-1" />{t('common.add')}</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.day')}</TableHead>
                    <TableHead>{t('common.startHour')}</TableHead>
                    <TableHead>{t('common.endHour')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeSlots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">{t('admin.withdrawals.noTimeSlots')}</TableCell>
                    </TableRow>
                  ) : timeSlots.map((slot, idx) => {
                    const [day, start, end] = slot.split(':');
                    return (
                      <TableRow key={idx}>
                        <TableCell>{day}</TableCell>
                        <TableCell>{start}</TableCell>
                        <TableCell>{end}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => openEditTimeSlot(idx)}><Pencil /></Button>
                          <Button size="icon" variant="destructive" onClick={() => removeTimeSlot(idx)}><Trash /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Button onClick={handleSaveTimeSlots} className="mt-2">{t('common.save')}</Button>
            </TabsContent>
            <TabsContent value="package-limits">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">{t('admin.withdrawals.packageLimitsList')}</span>
                <Button size="sm" variant="outline" onClick={openAddPackage}><Plus className="w-4 h-4 mr-1" />{t('common.add')}</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.packageName')}</TableHead>
                    <TableHead>{t('common.min')}</TableHead>
                    <TableHead>{t('common.max')}</TableHead>
                    <TableHead>{t('common.daily')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(packageLimits).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">{t('admin.withdrawals.noPackageLimits')}</TableCell>
                    </TableRow>
                  ) : Object.entries(packageLimits).map(([pkg, vals]: any) => (
                    <TableRow key={pkg}>
                      <TableCell>{pkg}</TableCell>
                      <TableCell>{vals.min}</TableCell>
                      <TableCell>{vals.max}</TableCell>
                      <TableCell>{vals.daily}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => openEditPackage(pkg, vals)}><Pencil /></Button>
                        <Button size="icon" variant="destructive" onClick={() => removePackage(pkg)}><Trash /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button onClick={handleSavePackageLimits} className="mt-2">{t('common.save')}</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      {/* Time Slot Dialog */}
      <Dialog open={showTimeSlotDialog} onOpenChange={setShowTimeSlotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTimeSlotIdx === null ? t('admin.withdrawals.addTimeSlot') : t('admin.withdrawals.editTimeSlot')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label>{t('common.day')}</Label>
            <Input value={timeSlotForm.day} onChange={e => setTimeSlotForm(f => ({ ...f, day: e.target.value }))} placeholder={t('common.day')} />
            <Label>{t('common.startHour')}</Label>
            <Input value={timeSlotForm.start} onChange={e => setTimeSlotForm(f => ({ ...f, start: e.target.value }))} placeholder={t('common.startHour')} />
            <Label>{t('common.endHour')}</Label>
            <Input value={timeSlotForm.end} onChange={e => setTimeSlotForm(f => ({ ...f, end: e.target.value }))} placeholder={t('common.endHour')} />
            <Button onClick={saveTimeSlot} className="mt-2 w-full">{t('common.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Package Limit Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPackageName === null ? t('admin.withdrawals.addPackageLimit') : t('admin.withdrawals.editPackageLimit')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label>{t('common.packageName')}</Label>
            <Input value={packageForm.name} onChange={e => setPackageForm(f => ({ ...f, name: e.target.value }))} placeholder={t('common.packageName')} />
            <Label>{t('common.min')}</Label>
            <Input type="number" value={packageForm.min} onChange={e => setPackageForm(f => ({ ...f, min: e.target.value }))} placeholder={t('common.min')} />
            <Label>{t('common.max')}</Label>
            <Input type="number" value={packageForm.max} onChange={e => setPackageForm(f => ({ ...f, max: e.target.value }))} placeholder={t('common.max')} />
            <Label>{t('common.daily')}</Label>
            <Input type="number" value={packageForm.daily} onChange={e => setPackageForm(f => ({ ...f, daily: e.target.value }))} placeholder={t('common.daily')} />
            <Button onClick={savePackage} className="mt-2 w-full">{t('common.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>{t('admin.withdrawals.requestsList')}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExportCSV}>{t('common.exportCSV')}</Button>
            <Button size="sm" variant="outline" onClick={handleExportExcel}>{t('common.exportExcel')}</Button>
            <Button size="sm" variant="outline" onClick={handleExportPDF}>{t('common.exportPDF')}</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.withdrawals.user')}</TableHead>
                <TableHead>{t('admin.withdrawals.amount')}</TableHead>
                <TableHead>{t('admin.withdrawals.method')}</TableHead>
                <TableHead>{t('admin.withdrawals.status')}</TableHead>
                <TableHead>{t('admin.withdrawals.date')}</TableHead>
                <TableHead>{t('admin.withdrawals.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingWithdrawals ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {t('admin.withdrawals.noRequestsFound')}
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>{withdrawal.user_name}</TableCell>
                    <TableCell><Badge variant="secondary">{withdrawal.amount.toLocaleString()}</Badge></TableCell>
                    <TableCell>{withdrawal.method}</TableCell>
                    <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                    <TableCell>{new Date(withdrawal.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {withdrawal.status === 'pending' && (
                          <>
                            <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setSelectedWithdrawal(withdrawal); setShowPayModal(true); }}>{t('admin.withdrawals.pay')}</Button>
                            <Button size="sm" variant="destructive" onClick={() => { setSelectedWithdrawal(withdrawal); setShowRejectModal(true); }}>{t('admin.withdrawals.reject')}</Button>
                          </>
                        )}
                        {withdrawal.status === 'rejected' && withdrawal.rejection_reason && (
                          <Button size="sm" variant="outline" onClick={() => alert(withdrawal.rejection_reason)}>{t('admin.withdrawals.viewReason')}</Button>
                        )}
                        {withdrawal.status === 'paid' && withdrawal.proof_image_url && (
                          <a href={withdrawal.proof_image_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline">{t('admin.withdrawals.viewProof')}</Button>
                          </a>
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
            <DialogTitle>{t('admin.withdrawals.payWithdrawal')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>{t('admin.withdrawals.proofImage')}</Label>
            <Input type="file" accept="image/*" onChange={e => setProofImage(e.target.files?.[0] || null)} />
            <Label>{t('admin.withdrawals.adminNote')}</Label>
            <Textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} />
            <Button onClick={handlePay} className="w-full mt-2">{t('admin.withdrawals.confirmPay')}</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.withdrawals.rejectWithdrawal')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>{t('admin.withdrawals.rejectionReason')}</Label>
            <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
            <Button onClick={handleReject} className="w-full mt-2" variant="destructive">{t('admin.withdrawals.confirmReject')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 