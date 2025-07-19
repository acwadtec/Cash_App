import { useState, useEffect, useMemo } from 'react';
import { DollarSign, Check, X, Clock, AlertTriangle, Pencil, Trash, Plus, RefreshCw, FileText, FileSpreadsheet, FileDown, Users, Calendar, Settings, TrendingUp, Shield } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
  const [timeSlotFormAMPM, setTimeSlotFormAMPM] = useState({ startAMPM: 'AM', endAMPM: 'AM' });
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

  // Calculate stats
  const stats = useMemo(() => {
    const totalWithdrawals = withdrawals.length;
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
    const paidWithdrawals = withdrawals.filter(w => w.status === 'paid').length;
    const totalAmount = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
    const pendingAmount = withdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + (w.amount || 0), 0);

    return {
      totalWithdrawals,
      pendingWithdrawals,
      paidWithdrawals,
      totalAmount,
      pendingAmount
    };
  }, [withdrawals]);

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
    setPackageLimits(prev => {
      const now = new Date().toISOString();
      return {
        ...prev,
        [packageFormName]: {
          min: Number(packageFormMin),
          max: Number(packageFormMax),
          daily: Number(packageFormDaily),
          limit_activated_at: now
        }
      };
    });
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
      personal: 'personal_earnings',
      team: 'team_earnings',
      bonuses: 'bonuses',
      balance: 'balance',
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
    setTimeSlotFormAMPM({ startAMPM: 'AM', endAMPM: 'AM' });
    setShowTimeSlotDialog(true);
  };
  const openEditTimeSlot = (idx: number) => {
    const [day, start, end] = timeSlots[idx].split(':');
    // Convert 24-hour format to 12-hour format for display
    const startHour = parseInt(start);
    const endHour = parseInt(end);
    const startAMPM = startHour >= 12 ? 'PM' : 'AM';
    const endAMPM = endHour >= 12 ? 'PM' : 'AM';
    const start12Hour = startHour === 0 ? 12 : startHour > 12 ? startHour - 12 : startHour;
    const end12Hour = endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour;
    setEditingTimeSlotIdx(idx);
    setTimeSlotForm({ day, start: start12Hour.toString(), end: end12Hour.toString() });
    setTimeSlotFormAMPM({ startAMPM, endAMPM });
    setShowTimeSlotDialog(true);
  };
  const saveTimeSlot = () => {
    if (!timeSlotForm.day || !timeSlotForm.start || !timeSlotForm.end) return;
    
    // Convert 12-hour format to 24-hour format for storage
    let start24Hour = parseInt(timeSlotForm.start);
    let end24Hour = parseInt(timeSlotForm.end);
    
    if (timeSlotFormAMPM.startAMPM === 'PM' && start24Hour !== 12) start24Hour += 12;
    if (timeSlotFormAMPM.startAMPM === 'AM' && start24Hour === 12) start24Hour = 0;
    if (timeSlotFormAMPM.endAMPM === 'PM' && end24Hour !== 12) end24Hour += 12;
    if (timeSlotFormAMPM.endAMPM === 'AM' && end24Hour === 12) end24Hour = 0;
    
    if (end24Hour <= start24Hour) return; // Invalid time range
    
    let newSlots = [...timeSlots];
    const slotStr = `${timeSlotForm.day}:${start24Hour}:${end24Hour}`;
    if (editingTimeSlotIdx === null) {
      newSlots.push(slotStr);
    } else {
      newSlots[editingTimeSlotIdx] = slotStr;
    }
    setTimeSlots(newSlots);
    setShowTimeSlotDialog(false);
    setEditingTimeSlotIdx(null);
    setTimeSlotForm({ day: '', start: '', end: '' });
    setTimeSlotFormAMPM({ startAMPM: 'AM', endAMPM: 'AM' });
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
        daily: Number(packageForm.daily),
        limit_activated_at: new Date().toISOString()
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

  // Predefined messages for admin actions
  const payMessages = [
    'Payment sent successfully.',
    'Funds have been transferred to your account.',
    'Withdrawal processed. Check your account.',
    'Contact support if you do not receive payment within 24 hours.'
  ];
  const rejectMessages = [
    'Incorrect account details. Please update and try again.',
    'Withdrawal request rejected due to suspicious activity.',
    'Withdrawal rejected. Contact support for more information.',
    'Insufficient balance for withdrawal.'
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('admin.withdrawals.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage withdrawal requests, approve payments, and configure withdrawal settings
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] border-2 focus:border-primary">
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
            <Button onClick={() => fetchWithdrawals()} disabled={loadingWithdrawals} variant="outline" className="gap-2">
              <RefreshCw className={cn("h-4 w-4", loadingWithdrawals && "animate-spin")} />
              {loadingWithdrawals ? t('common.loading') : t('common.refresh')}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Requests</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalWithdrawals}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Pending</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.pendingWithdrawals}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Paid</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.paidWithdrawals}</p>
                </div>
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Amount</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">${stats.totalAmount.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Pending Amount</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">${stats.pendingAmount.toFixed(2)}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Card */}
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-primary" />
            {t('admin.withdrawals.settings')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="time-slots" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="time-slots" className="gap-2">
                <Clock className="h-4 w-4" />
                {t('admin.withdrawals.timeSlots')}
              </TabsTrigger>
              <TabsTrigger value="package-limits" className="gap-2">
                <Shield className="h-4 w-4" />
                {t('admin.withdrawals.packageLimits')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="time-slots">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold">{t('admin.withdrawals.timeSlotsList')}</span>
                <Button size="sm" variant="outline" onClick={openAddTimeSlot} className="gap-2">
                  <Plus className="w-4 h-4" />
                  {t('common.add')}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">{t('common.day')}</TableHead>
                      <TableHead className="font-semibold">{t('common.startHour')}</TableHead>
                      <TableHead className="font-semibold">{t('common.endHour')}</TableHead>
                      <TableHead className="font-semibold">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeSlots.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Clock className="h-8 w-8" />
                            {t('admin.withdrawals.noTimeSlots')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : timeSlots.map((slot, idx) => {
                      const [day, start, end] = slot.split(':');
                      // Convert 24-hour format to 12-hour format for display
                      const startHour = parseInt(start);
                      const endHour = parseInt(end);
                      const startAMPM = startHour >= 12 ? 'PM' : 'AM';
                      const endAMPM = endHour >= 12 ? 'PM' : 'AM';
                      const start12Hour = startHour === 0 ? 12 : startHour > 12 ? startHour - 12 : startHour;
                      const end12Hour = endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour;
                      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      return (
                        <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">{dayNames[parseInt(day)] || day}</TableCell>
                          <TableCell className="font-mono">{start12Hour} {startAMPM}</TableCell>
                          <TableCell className="font-mono">{end12Hour} {endAMPM}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => openEditTimeSlot(idx)} className="h-8 w-8 p-0">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => removeTimeSlot(idx)} className="h-8 w-8 p-0">
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleSaveTimeSlots} className="mt-4 gap-2">
                <Check className="h-4 w-4" />
                {t('common.save')}
              </Button>
            </TabsContent>
            <TabsContent value="package-limits">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold">{t('admin.withdrawals.packageLimitsList')}</span>
                <Button size="sm" variant="outline" onClick={openAddPackage} className="gap-2">
                  <Plus className="w-4 h-4" />
                  {t('common.add')}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">{t('common.packageName')}</TableHead>
                      <TableHead className="font-semibold">{t('common.min')}</TableHead>
                      <TableHead className="font-semibold">{t('common.max')}</TableHead>
                      <TableHead className="font-semibold">{t('common.daily')}</TableHead>
                      <TableHead className="font-semibold">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(packageLimits).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Shield className="h-8 w-8" />
                            {t('admin.withdrawals.noPackageLimits')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : Object.entries(packageLimits).map(([pkg, vals]: any) => (
                      <TableRow key={pkg} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">{pkg}</TableCell>
                        <TableCell className="font-mono">${vals.min}</TableCell>
                        <TableCell className="font-mono">${vals.max}</TableCell>
                        <TableCell className="font-mono">${vals.daily}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => openEditPackage(pkg, vals)} className="h-8 w-8 p-0">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => removePackage(pkg)} className="h-8 w-8 p-0">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleSavePackageLimits} className="mt-4 gap-2">
                <Check className="h-4 w-4" />
                {t('common.save')}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Withdrawal Requests Table */}
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-muted/50 to-muted/30">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {t('admin.withdrawals.requestsList')} ({withdrawals.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExportCSV} className="gap-2">
              <FileText className="h-4 w-4" />
              {t('common.exportCSV')}
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {t('common.exportExcel')}
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportPDF} className="gap-2">
              <FileDown className="h-4 w-4" />
              {t('common.exportPDF')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingWithdrawals ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin" />
                {t('common.loading')}
              </div>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('admin.withdrawals.noRequestsFound')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">{t('admin.withdrawals.user')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.withdrawals.amount')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.withdrawals.method')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.withdrawals.status')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.withdrawals.date')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.withdrawals.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{withdrawal.user_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          ${withdrawal.amount.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>{withdrawal.method}</TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      <TableCell className="font-mono">
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {withdrawal.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="gap-1 bg-green-600 hover:bg-green-700 text-white" 
                                onClick={() => { setSelectedWithdrawal(withdrawal); setShowPayModal(true); }}
                              >
                                <Check className="h-3 w-3" />
                                {t('admin.withdrawals.pay')}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => { setSelectedWithdrawal(withdrawal); setShowRejectModal(true); }}
                                className="gap-1"
                              >
                                <X className="h-3 w-3" />
                                {t('admin.withdrawals.reject')}
                              </Button>
                            </>
                          )}
                          {withdrawal.status === 'rejected' && withdrawal.rejection_reason && (
                            <Button size="sm" variant="outline" onClick={() => alert(withdrawal.rejection_reason)} className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {t('admin.withdrawals.viewReason')}
                            </Button>
                          )}
                          {withdrawal.status === 'paid' && withdrawal.proof_image_url && (
                            <a href={withdrawal.proof_image_url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="gap-1">
                                <FileText className="h-3 w-3" />
                                {t('admin.withdrawals.viewProof')}
                              </Button>
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Slot Dialog */}
      <Dialog open={showTimeSlotDialog} onOpenChange={setShowTimeSlotDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {editingTimeSlotIdx === null ? t('admin.withdrawals.addTimeSlot') : t('admin.withdrawals.editTimeSlot')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm dark:bg-yellow-950/50 dark:border-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Time slots must be within the same day and cannot cross midnight.<br />
              For an all-day slot, use <strong>12 AM to 11:59 PM</strong>.
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('common.day')}</Label>
              <Select value={timeSlotForm.day} onValueChange={value => setTimeSlotForm(f => ({ ...f, day: value }))}>
                <SelectTrigger className="border-2 focus:border-primary">
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('common.startHour')}</Label>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  min="1" 
                  max="12" 
                  value={timeSlotForm.start} 
                  onChange={e => setTimeSlotForm(f => ({ ...f, start: e.target.value }))} 
                  placeholder="Hour (1-12)" 
                  className="flex-1 border-2 focus:border-primary font-mono"
                />
                <Select value={timeSlotFormAMPM.startAMPM} onValueChange={value => setTimeSlotFormAMPM(f => ({ ...f, startAMPM: value }))}>
                  <SelectTrigger className="w-20 border-2 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('common.endHour')}</Label>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  min="1" 
                  max="12" 
                  value={timeSlotForm.end} 
                  onChange={e => setTimeSlotForm(f => ({ ...f, end: e.target.value }))} 
                  placeholder="Hour (1-12)" 
                  className="flex-1 border-2 focus:border-primary font-mono"
                />
                <Select value={timeSlotFormAMPM.endAMPM} onValueChange={value => setTimeSlotFormAMPM(f => ({ ...f, endAMPM: value }))}>
                  <SelectTrigger className="w-20 border-2 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={saveTimeSlot} className="w-full gap-2">
              <Check className="h-4 w-4" />
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Package Limit Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {editingPackageName === null ? t('admin.withdrawals.addPackageLimit') : t('admin.withdrawals.editPackageLimit')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('common.packageName')}</Label>
              <Input 
                value={packageForm.name} 
                onChange={e => setPackageForm(f => ({ ...f, name: e.target.value }))} 
                placeholder={t('common.packageName')} 
                className="border-2 focus:border-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('common.min')}</Label>
              <Input 
                type="number" 
                value={packageForm.min} 
                onChange={e => setPackageForm(f => ({ ...f, min: e.target.value }))} 
                placeholder={t('common.min')} 
                className="border-2 focus:border-primary font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('common.max')}</Label>
              <Input 
                type="number" 
                value={packageForm.max} 
                onChange={e => setPackageForm(f => ({ ...f, max: e.target.value }))} 
                placeholder={t('common.max')} 
                className="border-2 focus:border-primary font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('common.daily')}</Label>
              <Input 
                type="number" 
                value={packageForm.daily} 
                onChange={e => setPackageForm(f => ({ ...f, daily: e.target.value }))} 
                placeholder={t('common.daily')} 
                className="border-2 focus:border-primary font-mono"
              />
            </div>

            <Button onClick={savePackage} className="w-full gap-2">
              <Check className="h-4 w-4" />
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Modal */}
      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              {t('admin.withdrawals.payWithdrawal')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('admin.withdrawals.proofImage')}</Label>
              <Input 
                type="file" 
                accept="image/*" 
                onChange={e => setProofImage(e.target.files?.[0] || null)} 
                className="border-2 focus:border-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('admin.withdrawals.adminNote')}</Label>
              <Select value={adminNote} onValueChange={setAdminNote}>
                <SelectTrigger className="border-2 focus:border-primary">
                  <SelectValue placeholder="Select a response message" />
                </SelectTrigger>
                <SelectContent>
                  {payMessages.map((msg, idx) => (
                    <SelectItem key={idx} value={msg}>{msg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea 
                value={adminNote} 
                onChange={e => setAdminNote(e.target.value)} 
                placeholder="Custom message..." 
                className="border-2 focus:border-primary"
              />
            </div>

            <Button onClick={handlePay} className="w-full gap-2 bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4" />
              {t('admin.withdrawals.confirmPay')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              {t('admin.withdrawals.rejectWithdrawal')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('admin.withdrawals.rejectionReason')}</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger className="border-2 focus:border-primary">
                  <SelectValue placeholder="Select a response message" />
                </SelectTrigger>
                <SelectContent>
                  {rejectMessages.map((msg, idx) => (
                    <SelectItem key={idx} value={msg}>{msg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea 
                value={rejectionReason} 
                onChange={e => setRejectionReason(e.target.value)} 
                placeholder="Custom message..." 
                className="border-2 focus:border-primary"
              />
            </div>

            <Button onClick={handleReject} className="w-full gap-2" variant="destructive">
              <X className="h-4 w-4" />
              {t('admin.withdrawals.confirmReject')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 