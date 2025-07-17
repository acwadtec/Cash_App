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
import { useNavigate } from 'react-router-dom';
import { X, Upload, Image as ImageIcon, Users as UsersIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

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
}

export default function ManageOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editOffer, setEditOffer] = useState<Offer | null>(null);
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    amount: '', 
    cost: '',
    daily_profit: '',
    monthly_profit: '',
    deadline: '' 
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [joinedUsers, setJoinedUsers] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  // Fetch offers from Supabase
  const fetchOffers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('offers').select('*');
    if (error) {
      console.error('Error fetching offers:', error);
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

  // Upload image to Supabase storage
  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `offer-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('offer-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('offer-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // Open dialog for create or edit
  const openDialog = (offer?: Offer) => {
    if (offer) {
      setEditOffer(offer);
      setForm({ 
        title: offer.title, 
        description: offer.description, 
        amount: offer.amount.toString(), 
        cost: offer.cost?.toString() || '',
        daily_profit: offer.daily_profit?.toString() || '',
        monthly_profit: offer.monthly_profit?.toString() || '',
        deadline: offer.deadline || '' 
      });
      setImagePreview(offer.image_url || '');
      setImageFile(null);
    } else {
      setEditOffer(null);
      setForm({ 
        title: '', 
        description: '', 
        amount: '', 
        cost: '',
        daily_profit: '',
        monthly_profit: '',
        deadline: '' 
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
        console.log('Uploading to bucket:', bucketName, 'path:', filePath);
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, imageFile, { upsert: true });
        console.log('Upload error:', uploadError);
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);
          console.log('Public URL:', urlData.publicUrl);
          imageUrl = urlData.publicUrl;
        }
      }
      const payload = {
        ...form,
        amount: Number(form.amount),
        cost: Number(form.cost) || 0,
        daily_profit: Number(form.daily_profit) || 0,
        monthly_profit: Number(form.monthly_profit) || 0,
        image_url: imageUrl,
        deadline: form.deadline || null
      };
      const { error } = await supabase.from('offers').update(payload).eq('id', editOffer.id);
      if (error) console.error('Error updating offer:', error);
      setUploading(false);
      setShowDialog(false);
      fetchOffers();
      return;
    }

    // Create logic (insert, then upload image, then update)
    // 1. Insert offer without image_url
    const { data: insertData, error: insertError } = await supabase.from('offers').insert([
      {
        ...form,
        amount: Number(form.amount),
        cost: Number(form.cost) || 0,
        daily_profit: Number(form.daily_profit) || 0,
        monthly_profit: Number(form.monthly_profit) || 0,
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
      console.log('Uploading to bucket:', bucketName, 'path:', filePath);
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, imageFile, { upsert: true });
      console.log('Upload error:', uploadError);
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        console.log('Public URL:', urlData.publicUrl);
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
    if (error) console.error('Error deleting offer:', error);
    fetchOffers();
  };

  // Delete all offers
  const handleDeleteAll = async () => {
    for (const offer of offers) {
      const { error } = await supabase.from('offers').delete().eq('id', offer.id);
      if (error) console.error('Error deleting offer:', error);
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
      // Get all user_ids who joined this offer
      const { data: joins, error: joinsError } = await supabase
        .from('offer_joins')
        .select('user_id')
        .eq('offer_id', offer.id);
      if (joinsError) throw joinsError;
      const userIds = joins?.map((j: any) => j.user_id) || [];
      if (userIds.length === 0) {
        setJoinedUsers([]);
        setUsersLoading(false);
        return;
      }
      // Fetch user info for these users
      const { data: users, error: usersError } = await supabase
        .from('user_info')
        .select('first_name, last_name, phone, user_uid')
        .in('user_uid', userIds);
      if (usersError) throw usersError;
      setJoinedUsers(users || []);
    } catch (err: any) {
      setUsersError(err.message || 'Error fetching users');
      setJoinedUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const sortedOffers = [...offers].sort((a, b) => {
    if (!!a.active === !!b.active) return 0;
    return a.active ? -1 : 1;
  });

  return (
    <div className={`min-h-screen py-20 bg-background text-foreground ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Offers List</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => openDialog()} className="bg-green-500 hover:bg-green-600 text-white font-bold">
                Create Offer
              </Button>
              <Button variant="destructive" onClick={handleDeleteAll} disabled={offers.length === 0} className="font-bold">
                Delete All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
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
                        const { error } = await supabase.from('offers').update({ active: checked }).eq('id', offer.id);
                        if (error) console.error('Error updating active status:', error);
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
                        >
                          <UsersIcon className="w-5 h-5 text-primary" />
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
              <form onSubmit={handleSubmit} className="bg-background rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-foreground border border-border">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">{editOffer ? t('admin.editOffer') : t('admin.createOffer')}</h2>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title" className="text-sm font-medium">{t('admin.title')} *</Label>
                      <Input 
                        id="title" 
                        name="title" 
                        value={form.title} 
                        onChange={handleChange} 
                        required 
                        className="mt-1"
                        placeholder={t('admin.title') + '...'}
                      />
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-sm font-medium">{t('admin.description')} *</Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        value={form.description} 
                        onChange={handleChange} 
                        required 
                        className="mt-1"
                        placeholder={t('admin.description') + '...'}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="amount" className="text-sm font-medium">{t('admin.reward')} *</Label>
                      <Input 
                        id="amount" 
                        name="amount" 
                        type="number" 
                        value={form.amount} 
                        onChange={handleChange} 
                        required 
                        className="mt-1"
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
                        className="mt-1"
                        placeholder={t('admin.cost') + '...'}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="daily_profit" className="text-sm font-medium">{t('admin.dailyProfit')}</Label>
                      <Input 
                        id="daily_profit" 
                        name="daily_profit" 
                        type="number" 
                        value={form.daily_profit} 
                        onChange={handleChange} 
                        className="mt-1"
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
                        className="mt-1"
                        placeholder={t('admin.monthlyProfit') + '...'}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <Label htmlFor="deadline" className="text-sm font-medium">{t('admin.deadline')}</Label>
                      <Input 
                        id="deadline" 
                        name="deadline" 
                        type="date" 
                        value={form.deadline} 
                        onChange={handleChange} 
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">{t('admin.image')}</Label>
                      <div className="mt-1">
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 dark:bg-muted/20 dark:hover:bg-muted/40 border-border">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              {imagePreview ? (
                                <div className="relative">
                                  <img 
                                    src={imagePreview} 
                                    alt="Preview" 
                                    className="max-h-24 max-w-full object-contain"
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
                </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowDialog(false)}
                    disabled={uploading}
                    className="transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95"
                  >
                    {t('admin.cancel')}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={uploading}
                    className="min-w-[100px] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 hover:shadow-lg active:scale-95"
                  >
                    {uploading ? t('admin.saving') : (editOffer ? t('admin.update') : t('admin.create'))}
                  </Button>
                </div>
              </form>
            </div>
          </Dialog>
        )}

        {/* Modal for joined users */}
        {showUsersModal && (
          <Dialog open={showUsersModal} onOpenChange={setShowUsersModal}>
            <DialogContent className={`w-full max-w-lg max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UsersIcon className="w-6 h-6 text-primary" />
                  {t('admin.joinedUsersFor').replace('{offer}', selectedOffer?.title || '')}
                </h2>
              </div>
              {usersLoading ? (
                <div className="py-8 flex justify-center items-center text-lg text-muted-foreground">{t('common.loading') || 'Loading...'}</div>
              ) : usersError ? (
                <div className="text-red-500 py-8 text-center">{usersError}</div>
              ) : joinedUsers.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">{t('admin.noUsersJoined') || 'No users have joined this offer yet.'}</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 mb-2">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('profile.name') || 'Name'}</th>
                      <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('profile.phone') || 'Mobile'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {joinedUsers.map((user) => (
                      <tr key={user.user_uid} className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <td className="text-left px-4 py-2">{`${user.first_name || ''} ${user.last_name || ''}`.trim()}</td>
                        <td className="text-left px-4 py-2">{user.phone || '-'}</td>
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