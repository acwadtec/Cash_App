import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { X, Upload, Users as UsersIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface InvestmentCertificate {
  id: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  invested_amount: number;
  profit_rate: number;
  profit_duration_months: number;
  next_profit_date: string;
  join_limit?: number;
  user_join_limit?: number;
  image_url?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function ManageInvestmentCertificatesPage() {
  const [certificates, setCertificates] = useState<InvestmentCertificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editCert, setEditCert] = useState<InvestmentCertificate | null>(null);
  const [form, setForm] = useState({
    title_en: '',
    title_ar: '',
    description_en: '',
    description_ar: '',
    invested_amount: '',
    profit_rate: '',
    profit_duration_months: '6',
    next_profit_date: '',
    join_limit: '',
    user_join_limit: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const { t, isRTL } = useLanguage();
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [joinedUsers, setJoinedUsers] = useState<any[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<InvestmentCertificate | null>(null);
  const { toast } = useToast();

  // Fetch certificates from Supabase
  const fetchCertificates = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('investment_certificates').select('*');
    setCertificates(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  // Handle form input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Open dialog for create or edit
  const openDialog = (cert?: InvestmentCertificate) => {
    if (cert) {
      setEditCert(cert);
      setForm({
        title_en: cert.title_en || '',
        title_ar: cert.title_ar || '',
        description_en: cert.description_en || '',
        description_ar: cert.description_ar || '',
        invested_amount: cert.invested_amount?.toString() || '',
        profit_rate: cert.profit_rate?.toString() || '',
        profit_duration_months: cert.profit_duration_months?.toString() || '6',
        next_profit_date: cert.next_profit_date || '',
        join_limit: cert.join_limit?.toString() || '',
        user_join_limit: cert.user_join_limit?.toString() || '1',
      });
      setImagePreview(cert.image_url || '');
      setImageFile(null);
    } else {
      setEditCert(null);
      setForm({
        title_en: '',
        title_ar: '',
        description_en: '',
        description_ar: '',
        invested_amount: '',
        profit_rate: '',
        profit_duration_months: '6',
        next_profit_date: '',
        join_limit: '',
        user_join_limit: '1',
      });
      setImagePreview('');
      setImageFile(null);
    }
    setShowDialog(true);
  };

  // Create or update certificate
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.title_en || !form.title_ar || !form.description_en || !form.description_ar || !form.invested_amount || !form.profit_rate) {
      console.error('Missing required fields');
      toast({ title: t('common.error'), description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    
    setUploading(true);
    if (editCert) {
      let imageUrl = editCert.image_url || '';
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `image.${fileExt}`;
        const filePath = `investment_certificates/${editCert.id}/${fileName}`;
        const bucketName = 'investment-certificate-images';
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, imageFile, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);
          imageUrl = urlData.publicUrl;
        }
      }
      const payload = {
        ...form,
        invested_amount: Number(form.invested_amount),
        profit_rate: Number(form.profit_rate),
        profit_duration_months: Number(form.profit_duration_months),
        join_limit: form.join_limit !== '' ? Number(form.join_limit) : null,
        user_join_limit: form.user_join_limit !== '' ? Number(form.user_join_limit) : 1,
        image_url: imageUrl,
        next_profit_date: form.next_profit_date || null,
      };
      const { error } = await supabase.from('investment_certificates').update(payload).eq('id', editCert.id);
      if (error) {
        console.error('Error updating certificate:', error);
        toast({ title: t('common.error'), description: error.message || 'Failed to update certificate', variant: 'destructive' });
      } else {
        toast({ title: t('common.success'), description: 'Certificate updated successfully' });
      }
      setUploading(false);
      setShowDialog(false);
      fetchCertificates();
      return;
    }
    // Create logic (insert, then upload image, then update)
    const { data: insertData, error: insertError } = await supabase.from('investment_certificates').insert([
      {
        ...form,
        invested_amount: Number(form.invested_amount),
        profit_rate: Number(form.profit_rate),
        profit_duration_months: Number(form.profit_duration_months),
        join_limit: form.join_limit !== '' ? Number(form.join_limit) : null,
        user_join_limit: form.user_join_limit !== '' ? Number(form.user_join_limit) : 1,
        next_profit_date: form.next_profit_date || null,
        image_url: null,
        active: true
      }
    ]).select().single();
    if (insertError || !insertData) {
      console.error('Error creating certificate:', insertError);
      toast({ title: t('common.error'), description: insertError?.message || 'Failed to create certificate', variant: 'destructive' });
      setUploading(false);
      setShowDialog(false);
      return;
    }
    let imageUrl = '';
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `image.${fileExt}`;
      const filePath = `investment_certificates/${insertData.id}/${fileName}`;
      const bucketName = 'investment-certificate-images';
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, imageFile, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      } else {
        console.error('Error uploading image:', uploadError);
      }
    }
    if (imageUrl) {
      const { error: updateError } = await supabase.from('investment_certificates').update({ image_url: imageUrl }).eq('id', insertData.id);
      if (updateError) {
        console.error('Error updating image URL:', updateError);
      }
    }
    setUploading(false);
    setShowDialog(false);
    fetchCertificates();
    // Show success message
    toast({ title: t('common.success'), description: 'Certificate created successfully' });
    console.log('Certificate created successfully:', insertData);
  };

  // Delete certificate
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('investment_certificates').delete().eq('id', id);
    if (error) {
      console.error('Error deleting certificate:', error);
      toast({ title: t('common.error'), description: error.message || 'Failed to delete certificate', variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: 'Certificate deleted successfully' });
    }
    fetchCertificates();
  };

  // Delete all certificates
  const handleDeleteAll = async () => {
    for (const cert of certificates) {
      await supabase.from('investment_certificates').delete().eq('id', cert.id);
    }
    fetchCertificates();
  };

  // Function to fetch users who joined a specific certificate
  const fetchJoinedUsers = async (cert: InvestmentCertificate) => {
    setUsersLoading(true);
    setUsersError(null);
    setSelectedCertificate(cert);
    setShowUsersModal(true);
    try {
      const { data: joins } = await supabase
        .from('investment_certificate_joins')
        .select('user_id, status, invested_amount, join_date, next_profit_date, id')
        .eq('certificate_id', cert.id);
      if (!joins || joins.length === 0) {
        setJoinedUsers([]);
        setUsersLoading(false);
        return;
      }
      const userIds = joins.map((j: any) => j.user_id);
      const { data: users } = await supabase
        .from('user_info')
        .select('first_name, last_name, phone, user_uid')
        .in('user_uid', userIds);
      const usersWithStatus = users.map((user: any) => {
        const join = joins.find((j: any) => j.user_id === user.user_uid);
        return { ...user, ...join };
      });
      setJoinedUsers(usersWithStatus || []);
    } catch (err: any) {
      setUsersError(err.message || 'Error fetching users');
      setJoinedUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };
  // Approve/reject handlers
  const handleApprove = async (joinId: string) => {
    if (!selectedCertificate) return;
    const now = new Date();
    const nextProfitDate = new Date(now.setMonth(now.getMonth() + (selectedCertificate.profit_duration_months || 6))).toISOString();
    await supabase.from('investment_certificate_joins')
      .update({ status: 'approved', next_profit_date: nextProfitDate })
      .eq('id', joinId);
    fetchJoinedUsers(selectedCertificate);
  };
  const handleReject = async (joinId: string) => {
    if (!selectedCertificate) return;
    await supabase.from('investment_certificate_joins')
      .update({ status: 'rejected' })
      .eq('id', joinId);
    fetchJoinedUsers(selectedCertificate);
  };

  return (
    <div className={`min-h-screen py-20 bg-background text-foreground ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('admin.investmentCertificates') || 'Investment Certificates'}</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => openDialog()} className="bg-green-500 hover:bg-green-600 text-white font-bold">
                {t('admin.createCertificate') || 'Create Certificate'}
              </Button>
              <Button variant="destructive" onClick={handleDeleteAll} disabled={certificates.length === 0} className="font-bold">
                {t('admin.deleteAll')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>{t('common.loading')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('offers.image')}</th>
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('offers.title')}</th>
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('offers.description')}</th>
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('investment.investmentAmount') || 'Investment Amount'}</th>
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('investment.profitRate') || 'Profit Rate'}</th>
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('investment.profitDuration') || 'Profit Duration'}</th>
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('investment.nextProfitDate') || 'Next Profit Date'}</th>
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('admin.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map(cert => (
                      <tr key={cert.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <td className="text-left px-4 py-2">
                          <img
                            src={cert.image_url || '/placeholder.svg'}
                            alt={cert.title_en}
                            className="w-12 h-12 object-contain rounded-md bg-white dark:bg-gray-800 p-1 border border-border"
                            onError={e => e.currentTarget.src = '/placeholder.svg'}
                          />
                        </td>
                        <td className="text-left px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{cert.title_en}</td>
                        <td className="text-left px-4 py-2 max-w-xs truncate text-gray-700 dark:text-gray-300" title={cert.description_en}>{cert.description_en}</td>
                        <td className="text-left px-4 py-2">{cert.invested_amount} EGP</td>
                        <td className="text-left px-4 py-2">{cert.profit_rate}%</td>
                        <td className="text-left px-4 py-2">{cert.profit_duration_months || 6} {t('investment.months') || 'months'}</td>
                        <td className="text-left px-4 py-2">{cert.next_profit_date ? new Date(cert.next_profit_date).toLocaleDateString() : '-'}</td>
                        <td className="text-left px-4 py-2">
                          <Button size="icon" variant="ghost" onClick={() => fetchJoinedUsers(cert)} aria-label={t('admin.showJoinedUsers') || 'Show Joined Users'}>
                            <UsersIcon className="w-5 h-5 text-primary" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openDialog(cert)} className="mr-2">{t('common.edit')}</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(cert.id)}>{t('common.delete')}</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Dialog for create/edit */}
        {showDialog && (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 dark:bg-black/70 z-50 p-4">
              <form onSubmit={handleSubmit} className="bg-background rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-foreground border border-border">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">{editCert ? t('admin.editCertificate') || 'Edit Certificate' : t('admin.createCertificate') || 'Create Certificate'}</h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDialog(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="title_en" className="text-sm font-medium">Title (EN) *</Label>
                    <Input id="title_en" name="title_en" value={form.title_en} onChange={handleChange} required className="mt-1" placeholder="Title in English..." />
                    <Label htmlFor="description_en" className="text-sm font-medium mt-2">Description (EN) *</Label>
                    <Textarea id="description_en" name="description_en" value={form.description_en} onChange={handleChange} required className="mt-1" placeholder="Description in English..." rows={3} />
                  </div>
                  <div>
                    <Label htmlFor="title_ar" className="text-sm font-medium">العنوان (AR) *</Label>
                    <Input id="title_ar" name="title_ar" value={form.title_ar} onChange={handleChange} required className="mt-1" placeholder="العنوان بالعربية..." dir="rtl" />
                    <Label htmlFor="description_ar" className="text-sm font-medium mt-2">الوصف (AR) *</Label>
                    <Textarea id="description_ar" name="description_ar" value={form.description_ar} onChange={handleChange} required className="mt-1" placeholder="الوصف بالعربية..." rows={3} dir="rtl" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="invested_amount" className="text-sm font-medium">{t('investment.investmentAmount') || 'Investment Amount'} *</Label>
                      <Input id="invested_amount" name="invested_amount" type="number" value={form.invested_amount} onChange={handleChange} required className="mt-1" placeholder="Investment Amount..." min="1" step="0.01" />
                    </div>
                    <div>
                      <Label htmlFor="profit_rate" className="text-sm font-medium">{t('investment.profitRate') || 'Profit Rate'} *</Label>
                      <Input id="profit_rate" name="profit_rate" type="number" value={form.profit_rate} onChange={handleChange} required className="mt-1" placeholder="Profit Rate..." min="0" step="0.01" />
                    </div>
                    <div>
                      <Label htmlFor="profit_duration_months" className="text-sm font-medium">{t('investment.profitDuration') || 'Profit Duration'} *</Label>
                      <Select onValueChange={(value) => setForm({ ...form, profit_duration_months: value })} value={form.profit_duration_months} required>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('investment.profitDurationPlaceholder') || 'Select profit duration'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 {t('investment.months') || 'months'}</SelectItem>
                          <SelectItem value="6">6 {t('investment.months') || 'months'}</SelectItem>
                          <SelectItem value="9">9 {t('investment.months') || 'months'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="next_profit_date" className="text-sm font-medium">{t('investment.nextProfitDate') || 'Next Profit Date'}</Label>
                      <Input id="next_profit_date" name="next_profit_date" type="date" value={form.next_profit_date} onChange={handleChange} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="join_limit" className="text-sm font-medium">{t('admin.numberOfSlots')}</Label>
                      <Input id="join_limit" name="join_limit" type="number" value={form.join_limit} onChange={handleChange} className="mt-1" placeholder={t('admin.numberOfSlotsPlaceholder')} min="0" step="1" />
                    </div>
                    <div>
                      <Label htmlFor="user_join_limit" className="text-sm font-medium">{t('admin.maxJoinsPerUser')}</Label>
                      <Input id="user_join_limit" name="user_join_limit" type="number" value={form.user_join_limit} onChange={handleChange} className="mt-1" placeholder={t('admin.maxJoinsPerUserPlaceholder')} min="1" step="1" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{t('admin.image')}</Label>
                      <div className="mt-1">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 dark:bg-muted/20 dark:hover:bg-muted/40 border-border">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {imagePreview ? (
                              <div className="relative">
                                <img src={imagePreview} alt="Preview" className="max-h-24 max-w-full object-contain bg-white dark:bg-gray-800 rounded" />
                                <Button type="button" variant="destructive" size="sm" className="absolute -top-2 -right-2 h-6 w-6 p-0" onClick={() => { setImagePreview(''); setImageFile(null); }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">{t('admin.uploadPrompt')}</span></p>
                                <p className="text-xs text-muted-foreground">{t('admin.supportedFormats')}</p>
                              </>
                            )}
                          </div>
                          <input id="image" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={uploading} className="transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95">{t('admin.cancel')}</Button>
                  <Button type="submit" disabled={uploading} className="min-w-[100px] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95">{uploading ? t('admin.saving') : (editCert ? t('admin.update') : t('admin.create'))}</Button>
                </div>
              </form>
            </div>
          </Dialog>
        )}
        {showUsersModal && (
          <Dialog open={showUsersModal} onOpenChange={setShowUsersModal}>
            <DialogContent className={`w-full max-w-lg max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UsersIcon className="w-6 h-6 text-primary" />
                  {t('admin.joinedUsersFor').replace('{offer}', selectedCertificate?.title_en || '')}
                </h2>
              </div>
              {usersLoading ? (
                <div className="py-8 flex justify-center items-center text-lg text-muted-foreground">{t('common.loading')}</div>
              ) : usersError ? (
                <div className="text-red-500 py-8 text-center">{usersError}</div>
              ) : joinedUsers.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">{t('admin.noUsersJoined')}</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 mb-2">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('profile.name')}</th>
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('profile.phone')}</th>
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('investment.investedAmount') || 'Invested Amount'}</th>
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('investment.joinDate') || 'Join Date'}</th>
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('admin.status')}</th>
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('admin.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {joinedUsers.map((user) => (
                      <tr key={user.user_uid} className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <td className="text-left px-4 py-2">{`${user.first_name || ''} ${user.last_name || ''}`.trim()}</td>
                        <td className="text-left px-4 py-2">{user.phone || '-'}</td>
                        <td className="text-left px-4 py-2">{user.invested_amount} EGP</td>
                        <td className="text-left px-4 py-2">{user.join_date ? new Date(user.join_date).toLocaleDateString() : '-'}</td>
                        <td className="text-left px-4 py-2 capitalize">{user.status}</td>
                        <td className="text-left px-4 py-2">
                          {user.status === 'pending' && (
                            <>
                              <Button size="sm" className="bg-success mr-2" onClick={() => handleApprove(user.id)}>{t('admin.approve')}</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleReject(user.id)}>{t('admin.reject')}</Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
} 