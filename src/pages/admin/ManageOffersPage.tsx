import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import OffersTable from '@/components/OffersTable';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { X, Upload, Users as UsersIcon, Plus, Trash2, RefreshCw, TrendingUp, Calendar, Target, DollarSign } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Offer {
  id: string;
  title: string;
  description: string;
  amount: number;
  cost: number;
  daily_profit: number;
  monthly_profit: number;
  image_url?: string;
  active: boolean;
  deadline?: string;
  join_limit?: number;
  user_join_limit?: number;
  title_en?: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;
}

export default function ManageOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editOffer, setEditOffer] = useState<Offer | null>(null);
  const [activeLang, setActiveLang] = useState<'en' | 'ar'>('en');
  const [form, setForm] = useState({
    title_en: '',
    title_ar: '',
    description_en: '',
    description_ar: '',
    amount: '',
    cost: '',
    daily_profit: '',
    monthly_profit: '',
    deadline: '',
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
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  // Calculate stats
  const stats = React.useMemo(() => {
    const totalOffers = offers.length;
    const activeOffers = offers.filter(offer => offer.active).length;
    const totalAmount = offers.reduce((sum, offer) => sum + (offer.amount || 0), 0);
    const totalCost = offers.reduce((sum, offer) => sum + (offer.cost || 0), 0);

    return {
      totalOffers,
      activeOffers,
      totalAmount,
      totalCost
    };
  }, [offers]);

  // Fetch offers from Supabase
  const fetchOffers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('offers').select('*');
    if (error) {
      setOffers([]);
    } else {
      setOffers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOffers();
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
  const openDialog = (offer?: Offer) => {
    if (offer) {
      setEditOffer(offer);
      setForm({
        title_en: offer.title_en || '',
        title_ar: offer.title_ar || '',
        description_en: offer.description_en || '',
        description_ar: offer.description_ar || '',
        amount: offer.amount?.toString() || '',
        cost: offer.cost?.toString() || '',
        daily_profit: offer.daily_profit?.toString() || '',
        monthly_profit: offer.monthly_profit?.toString() || '',
        deadline: offer.deadline || '',
        join_limit: offer.join_limit?.toString() || '',
        user_join_limit: offer.user_join_limit?.toString() || '1',
      });
      setImagePreview(offer.image_url || '');
      setImageFile(null);
    } else {
      setEditOffer(null);
      setForm({
        title_en: '',
        title_ar: '',
        description_en: '',
        description_ar: '',
        amount: '',
        cost: '',
        daily_profit: '',
        monthly_profit: '',
        deadline: '',
        join_limit: '',
        user_join_limit: '1',
      });
      setImagePreview('');
      setImageFile(null);
    }
    setShowDialog(true);
  };

  // Create or update offer
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    if (editOffer) {
      // Update logic (with image upload if needed)
      let imageUrl = editOffer.image_url || '';
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `image.${fileExt}`;
        const filePath = `offers/${editOffer.id}/${fileName}`;
        const bucketName = 'offer-images';
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
        amount: Number(form.amount),
        cost: Number(form.cost) || 0,
        daily_profit: Number(form.daily_profit) || 0,
        monthly_profit: Number(form.monthly_profit) || 0,
        join_limit: form.join_limit !== '' ? Number(form.join_limit) : null,
        user_join_limit: form.user_join_limit !== '' ? Number(form.user_join_limit) : 1,
        image_url: imageUrl,
        deadline: form.deadline || null
      };
      const { error } = await supabase.from('offers').update(payload).eq('id', editOffer.id);
      setUploading(false);
      setShowDialog(false);
      fetchOffers();
      return;
    }

    // Create logic (insert, then upload image, then update)
    const { data: insertData, error: insertError } = await supabase.from('offers').insert([
      {
        ...form,
        amount: Number(form.amount),
        cost: Number(form.cost) || 0,
        daily_profit: Number(form.daily_profit) || 0,
        monthly_profit: Number(form.monthly_profit) || 0,
        join_limit: form.join_limit !== '' ? Number(form.join_limit) : null,
        user_join_limit: form.user_join_limit !== '' ? Number(form.user_join_limit) : 1,
        deadline: form.deadline || null,
        image_url: null
      }
    ]).select().single();
    if (insertError || !insertData) {
      setUploading(false);
      setShowDialog(false);
      return;
    }
    let imageUrl = '';
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `image.${fileExt}`;
      const filePath = `offers/${insertData.id}/${fileName}`;
      const bucketName = 'offer-images';
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
    if (imageUrl) {
      await supabase.from('offers').update({ image_url: imageUrl }).eq('id', insertData.id);
    }
    setUploading(false);
    setShowDialog(false);
    fetchOffers();
  };

  // Delete offer
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('offers').delete().eq('id', id);
    fetchOffers();
  };

  // Delete all offers
  const handleDeleteAll = async () => {
    for (const offer of offers) {
      await supabase.from('offers').delete().eq('id', offer.id);
    }
    fetchOffers();
  };

  // Function to fetch users who joined a specific offer
  const fetchJoinedUsers = async (offer: Offer) => {
    setUsersLoading(true);
    setUsersError(null);
    setSelectedOffer(offer);
    setShowUsersModal(true);
    try {
      // Fetch user_id and status for each join
      const { data: joins } = await supabase
        .from('offer_joins')
        .select('user_id, status')
        .eq('offer_id', offer.id);
      if (!joins || joins.length === 0) {
        setJoinedUsers([]);
        setUsersLoading(false);
        return;
      }
      const userIds = joins.map((j: any) => j.user_id);
      // Fetch user info for these users
      const { data: users } = await supabase
        .from('user_info')
        .select('first_name, last_name, phone, user_uid')
        .in('user_uid', userIds);
      // Merge status into user info
      const usersWithStatus = users.map((user: any) => {
        const join = joins.find((j: any) => j.user_id === user.user_uid);
        return { ...user, status: join?.status || 'pending' };
      });
      setJoinedUsers(usersWithStatus || []);
    } catch (err: any) {
      setUsersError(err.message || 'Error fetching users');
      setJoinedUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // Add approve/reject handlers
  const handleApprove = async (userId: string) => {
    if (!selectedOffer) return;
    const now = new Date().toISOString();
    await supabase.from('offer_joins')
      .update({ status: 'approved', approved_at: now, last_profit_at: now })
      .eq('user_id', userId)
      .eq('offer_id', selectedOffer.id);
    fetchJoinedUsers(selectedOffer);
  };
  const handleReject = async (userId: string) => {
    if (!selectedOffer) return;
    await supabase.from('offer_joins')
      .update({ status: 'rejected' })
      .eq('user_id', userId)
      .eq('offer_id', selectedOffer.id);
    fetchJoinedUsers(selectedOffer);
  };

  const sortedOffers = [...offers].sort((a, b) => {
    if (!!a.active === !!b.active) return 0;
    return a.active ? -1 : 1;
  });

  return (
    <div className={`min-h-screen py-20 bg-background text-foreground ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {t('admin.offers')}
              </h1>
              <p className="text-muted-foreground mt-1">
                Create, manage, and monitor offers and their performance
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => openDialog()} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-4 w-4" />
                {t('admin.createOffer')}
              </Button>
              <Button variant="destructive" onClick={handleDeleteAll} disabled={offers.length === 0} className="gap-2">
                <Trash2 className="h-4 w-4" />
                {t('admin.deleteAll')}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Offers</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalOffers}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Active Offers</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.activeOffers}</p>
                  </div>
                  <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
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
                  <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Total Cost</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">${stats.totalCost.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Offers Table */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-muted/50 to-muted/30">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t('admin.offers')} ({offers.length})
            </CardTitle>
            <Button onClick={() => fetchOffers()} disabled={loading} variant="outline" className="gap-2">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              {loading ? t('common.loading') : t('common.refresh')}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  {t('common.loading')}
                </div>
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('admin.noOffersFound')}</p>
              </div>
            ) : (
              <OffersTable
                offers={sortedOffers}
                onEdit={openDialog}
                onDelete={handleDelete}
                showActions
                renderExtra={(offer) => (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!offer.active}
                      onCheckedChange={async (checked) => {
                        setOffers((prev) => prev.map((o) => o.id === offer.id ? { ...o, active: checked } : o));
                        await supabase.from('offers').update({ active: checked }).eq('id', offer.id);
                      }}
                      className="ml-2"
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => fetchJoinedUsers(offer as Offer)}
                          aria-label={t('admin.showJoinedUsers') || 'Show Joined Users'}
                          className="h-8 w-8 hover:bg-muted"
                        >
                          <UsersIcon className="w-4 h-4 text-primary" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('admin.showJoinedUsers')}</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Dialog for create/edit */}
        {showDialog && (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 dark:bg-black/70 z-50 p-4">
              <form onSubmit={handleSubmit} className="bg-background rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto text-foreground border border-border">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      {editOffer ? t('admin.editOffer') : t('admin.createOffer')}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      {editOffer ? 'Update offer details and settings' : 'Create a new offer for users'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDialog(false)}
                    className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Language Tabs */}
                <Tabs value={activeLang} onValueChange={(value) => setActiveLang(value as 'en' | 'ar')} className="mb-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="en" className="gap-2">
                      <span className="text-sm">🇺🇸</span>
                      English
                    </TabsTrigger>
                    <TabsTrigger value="ar" className="gap-2">
                      <span className="text-sm">🇸🇦</span>
                      العربية
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="en" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title_en" className="text-sm font-medium">Title (English) *</Label>
                        <Input 
                          id="title_en" 
                          name="title_en" 
                          value={form.title_en} 
                          onChange={handleChange} 
                          required 
                          className="mt-1 border-2 focus:border-primary" 
                          placeholder="Enter offer title in English..." 
                        />
                      </div>
                      <div>
                        <Label htmlFor="description_en" className="text-sm font-medium">Description (English) *</Label>
                        <Textarea 
                          id="description_en" 
                          name="description_en" 
                          value={form.description_en} 
                          onChange={handleChange} 
                          required 
                          className="mt-1 border-2 focus:border-primary" 
                          placeholder="Enter offer description in English..." 
                          rows={4} 
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="ar" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title_ar" className="text-sm font-medium">العنوان (العربية) *</Label>
                        <Input 
                          id="title_ar" 
                          name="title_ar" 
                          value={form.title_ar} 
                          onChange={handleChange} 
                          required 
                          className="mt-1 border-2 focus:border-primary" 
                          placeholder="أدخل عنوان العرض بالعربية..." 
                          dir="rtl" 
                        />
                      </div>
                      <div>
                        <Label htmlFor="description_ar" className="text-sm font-medium">الوصف (العربية) *</Label>
                        <Textarea 
                          id="description_ar" 
                          name="description_ar" 
                          value={form.description_ar} 
                          onChange={handleChange} 
                          required 
                          className="mt-1 border-2 focus:border-primary" 
                          placeholder="أدخل وصف العرض بالعربية..." 
                          rows={4} 
                          dir="rtl" 
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Financial Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Card className="border-2 border-dashed border-muted-foreground/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Financial Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="amount" className="text-sm font-medium">{t('admin.reward')} *</Label>
                        <Input 
                          id="amount" 
                          name="amount" 
                          type="number" 
                          value={form.amount} 
                          onChange={handleChange} 
                          required 
                          className="mt-1 border-2 focus:border-primary font-mono"
                          placeholder={t('admin.reward') + '...'}
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <Label htmlFor="cost" className="text-sm font-medium">{t('admin.cost')}</Label>
                        <Input 
                          id="cost" 
                          name="cost" 
                          type="number" 
                          value={form.cost} 
                          onChange={handleChange} 
                          className="mt-1 border-2 focus:border-primary font-mono"
                          placeholder={t('admin.cost') + '...'}
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <Label htmlFor="daily_profit" className="text-sm font-medium">{t('admin.dailyProfit')}</Label>
                        <Input 
                          id="daily_profit" 
                          name="daily_profit" 
                          type="number" 
                          value={form.daily_profit} 
                          onChange={handleChange} 
                          className="mt-1 border-2 focus:border-primary font-mono"
                          placeholder={t('admin.dailyProfit') + '...'}
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <Label htmlFor="monthly_profit" className="text-sm font-medium">{t('admin.monthlyProfit')}</Label>
                        <Input 
                          id="monthly_profit" 
                          name="monthly_profit" 
                          type="number" 
                          value={form.monthly_profit} 
                          onChange={handleChange} 
                          className="mt-1 border-2 focus:border-primary font-mono"
                          placeholder={t('admin.monthlyProfit') + '...'}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-dashed border-muted-foreground/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Settings & Limits
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="deadline" className="text-sm font-medium">{t('admin.deadline')}</Label>
                        <Input 
                          id="deadline" 
                          name="deadline" 
                          type="date" 
                          value={form.deadline} 
                          onChange={handleChange} 
                          className="mt-1 border-2 focus:border-primary"
                        />
                      </div>

                      <div>
                        <Label htmlFor="join_limit" className="text-sm font-medium">{t('admin.numberOfSlots')}</Label>
                        <Input 
                          id="join_limit" 
                          name="join_limit" 
                          type="number" 
                          value={form.join_limit} 
                          onChange={handleChange} 
                          className="mt-1 border-2 focus:border-primary font-mono"
                          placeholder={t('admin.numberOfSlotsPlaceholder')}
                          min="0"
                          step="1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="user_join_limit" className="text-sm font-medium">{t('admin.maxJoinsPerUser')}</Label>
                        <Input 
                          id="user_join_limit" 
                          name="user_join_limit" 
                          type="number" 
                          value={form.user_join_limit}
                          onChange={handleChange}
                          className="mt-1 border-2 focus:border-primary font-mono"
                          placeholder={t('admin.maxJoinsPerUserPlaceholder')}
                          min="1"
                          step="1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium">{t('admin.image')}</Label>
                        <div className="mt-1">
                          <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 dark:bg-muted/20 dark:hover:bg-muted/40 border-border transition-colors">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {imagePreview ? (
                                  <div className="relative">
                                    <img 
                                      src={imagePreview} 
                                      alt="Preview" 
                                      className="max-h-24 max-w-full object-contain rounded"
                                    />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                      onClick={() => {
                                        setImagePreview('');
                                        setImageFile(null);
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                    <p className="mb-2 text-sm text-muted-foreground">
                                      <span className="font-semibold">{t('admin.uploadPrompt')}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">{t('admin.supportedFormats')}</p>
                                  </>
                                )}
                              </div>
                              <input 
                                id="image" 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleImageChange}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowDialog(false)}
                    disabled={uploading}
                    className="gap-2 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95"
                  >
                    <X className="h-4 w-4" />
                    {t('admin.cancel')}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={uploading}
                    className="gap-2 min-w-[100px] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        {t('admin.saving')}
                      </>
                    ) : (
                      <>
                        {editOffer ? t('admin.update') : t('admin.create')}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Dialog>
        )}

        {/* Modal for joined users */}
        {showUsersModal && (
          <Dialog open={showUsersModal} onOpenChange={setShowUsersModal}>
            <DialogContent className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <UsersIcon className="w-6 h-6 text-primary" />
                    {t('admin.joinedUsersFor').replace('{offer}', selectedOffer?.title || '')}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Manage user applications and approval status
                  </p>
                </div>
              </div>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    {t('common.loading')}
                  </div>
                </div>
              ) : usersError ? (
                <div className="text-red-500 py-8 text-center">{usersError}</div>
              ) : joinedUsers.length === 0 ? (
                <div className="text-center py-8">
                  <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('admin.noUsersJoined')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-semibold">{t('profile.name')}</th>
                          <th className="text-left p-3 font-semibold">{t('profile.phone')}</th>
                          <th className="text-left p-3 font-semibold">{t('admin.status')}</th>
                          <th className="text-left p-3 font-semibold">{t('admin.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {joinedUsers.map((user) => (
                          <tr key={user.user_uid} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-medium">
                              {`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'}
                            </td>
                            <td className="p-3 font-mono">{user.phone || '-'}</td>
                            <td className="p-3">
                              <Badge 
                                variant={user.status === 'approved' ? 'default' : user.status === 'rejected' ? 'destructive' : 'secondary'}
                                className={cn(
                                  user.status === 'approved' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
                                  user.status === 'rejected' && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
                                  user.status === 'pending' && "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
                                )}
                              >
                                {user.status}
                              </Badge>
                            </td>
                            <td className="p-3">
                              {user.status === 'pending' && (
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    className="gap-1 bg-green-600 text-white hover:bg-green-700" 
                                    onClick={() => handleApprove(user.user_uid)}
                                  >
                                    <UsersIcon className="h-3 w-3" />
                                    {t('admin.approve')}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive" 
                                    onClick={() => handleReject(user.user_uid)}
                                    className="gap-1"
                                  >
                                    <X className="h-3 w-3" />
                                    {t('admin.reject')}
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
} 