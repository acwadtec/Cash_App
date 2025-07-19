import { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Pencil, Trash, Image } from 'lucide-react';
import { format } from 'date-fns';

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
import { Switch } from '@/components/ui/switch';

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';

// Services
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  target: string;
  user_uid?: string;
  banner: boolean;
  scheduled_at?: string;
  sent_at?: string;
  image_url?: string;
  created_at: string;
}

interface NotificationForm {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  target: 'all' | 'user' | 'role';
  target_value: string;
  banner: boolean;
  scheduled_at: string;
  image_url: string;
}

export default function NotificationsPage() {
  const { t, isRTL } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    type: 'info',
    target: 'all',
    targetValue: '',
    banner: false,
    scheduledAt: '',
    imageFile: null,
    imageUrl: '',
    id: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const debouncedUserSearch = useDebounce(userSearch, 300);

  useEffect(() => { fetchNotifications(); }, []);
  useEffect(() => {
    if (notificationData.target === 'user' && debouncedUserSearch.length >= 2) {
      setUserSearchLoading(true);
      supabase
        .from('user_info')
        .select('user_uid, first_name, last_name, phone, email')
        .or(`first_name.ilike.%${debouncedUserSearch}%,last_name.ilike.%${debouncedUserSearch}%,phone.ilike.%${debouncedUserSearch}%,email.ilike.%${debouncedUserSearch}%`)
        .limit(10)
        .then(({ data }) => {
          setUserResults(data || []);
          setUserSearchLoading(false);
        });
    } else {
      setUserResults([]);
    }
  }, [debouncedUserSearch, notificationData.target]);

  const fetchNotifications = async () => {
      setLoadingNotifications(true);
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (!error) setNotifications(data || []);
      setLoadingNotifications(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNotificationData(prev => ({ ...prev, imageFile: file, imageUrl: URL.createObjectURL(file) }));
    }
  };
  const uploadImage = async (file: File) => {
    const filePath = `notifications/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('notification-images').upload(filePath, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('notification-images').getPublicUrl(filePath);
    return urlData.publicUrl;
  };
  const handleSendNotification = async () => {
    if (!notificationData.title || !notificationData.message) {
      toast({ title: t('common.error'), description: t('admin.notifications.required'), variant: 'destructive' });
      return;
    }
    let imageUrl = notificationData.imageUrl;
    if (notificationData.imageFile && !imageUrl.startsWith('http')) {
      imageUrl = await uploadImage(notificationData.imageFile);
    }
    const notif = {
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type,
      user_uid: notificationData.target === 'user' ? notificationData.targetValue : null,
      banner: notificationData.banner,
      scheduled_at: notificationData.scheduledAt ? new Date(notificationData.scheduledAt).toISOString() : null,
      sent_at: notificationData.scheduledAt ? null : new Date().toISOString(),
      image_url: imageUrl,
      target: notificationData.target,
    };
    if (editingId) {
      await supabase.from('notifications').update(notif).eq('id', editingId);
    } else {
      await supabase.from('notifications').insert([notif]);
    }
    setNotificationData({ title: '', message: '', type: 'info', target: 'all', targetValue: '', banner: false, scheduledAt: '', imageFile: null, imageUrl: '', id: null });
    setEditingId(null);
    fetchNotifications();
  };
  const handleEdit = (notif: any) => {
    setNotificationData({
      title: notif.title,
      message: notif.message,
      type: notif.type,
      target: notif.user_uid ? 'user' : 'all',
      targetValue: notif.user_uid || '',
      banner: notif.banner,
      scheduledAt: notif.scheduled_at ? format(new Date(notif.scheduled_at), 'yyyy-MM-dd\'T\'HH:mm') : '',
      imageFile: null,
      imageUrl: notif.image_url || '',
      id: notif.id,
    });
    setEditingId(notif.id);
  };
  const handleDelete = async (notif: any) => {
    if (notif.image_url) {
      const path = notif.image_url.split('/notification-images/')[1];
      await supabase.storage.from('notification-images').remove([path]);
    }
    await supabase.from('notifications').delete().eq('id', notif.id);
    fetchNotifications();
  };

  return (
    <div className="space-y-4 p-8">
      <Card className="shadow-card w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            {t('admin.notifications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 h-full w-full">
            {/* Notification Form */}
            <div className="space-y-5 bg-card rounded-xl p-6 border border-border shadow-glow h-full flex flex-col flex-1">
              <div className="space-y-2">
                <Label htmlFor="notificationTitle">{t('admin.notifications.title')}</Label>
                <Input
                  id="notificationTitle"
                  value={notificationData.title}
                  onChange={e => setNotificationData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t('admin.notifications.title')}
                  className="focus:ring-2 focus:ring-primary/60 transition-all bg-muted text-foreground border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notificationMessage">{t('admin.notifications.message')}</Label>
                <textarea
                  id="notificationMessage"
                  value={notificationData.message}
                  onChange={e => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={t('admin.notifications.message')}
                  className="flex h-32 w-full rounded-lg border border-border bg-muted px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none transition-all text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.notifications.type')}</Label>
                <select className="w-full border rounded-lg px-2 py-2 bg-muted text-foreground border-border focus:ring-2 focus:ring-primary/60 transition-all" value={notificationData.type} onChange={e => setNotificationData(prev => ({ ...prev, type: e.target.value }))}>
                  <option value="info">{t('admin.notifications.type.info')}</option>
                  <option value="offer">{t('admin.notifications.type.offer')}</option>
                  <option value="ad">{t('admin.notifications.type.ad')}</option>
                  <option value="warning">{t('admin.notifications.type.warning')}</option>
                  <option value="success">{t('admin.notifications.type.success')}</option>
                  <option value="error">{t('admin.notifications.type.error')}</option>
                </select>
            </div>
              <div className="space-y-2">
                <Label>{t('admin.notifications.target')}</Label>
                <select className="w-full border rounded-lg px-2 py-2 bg-muted text-foreground border-border focus:ring-2 focus:ring-primary/60 transition-all" value={notificationData.target} onChange={e => setNotificationData(prev => ({ ...prev, target: e.target.value, targetValue: '' }))}>
                  <option value="all">{t('admin.notifications.target.all')}</option>
                  <option value="user">{t('admin.notifications.target.user')}</option>
                </select>
                {notificationData.target === 'user' && (
                  <div className="relative">
                    <Input
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder={t('admin.notifications.searchUser')}
                      className="focus:ring-2 focus:ring-primary/60 transition-all bg-muted text-foreground border-border"
                    />
                    {userSearchLoading && <div className="absolute right-2 top-2 text-xs text-muted-foreground">{t('admin.notifications.loading')}</div>}
                    {userResults.length > 0 && (
                      <div className="absolute z-10 bg-card border border-border rounded shadow w-full mt-1 max-h-48 overflow-y-auto">
                        {userResults.map(user => (
                          <div
                            key={user.user_uid}
                            className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                            onClick={() => {
                              setNotificationData(prev => ({ ...prev, targetValue: user.user_uid }));
                              setUserSearch(`${user.first_name || ''} ${user.last_name || ''} (${user.phone || user.email})`);
                              setUserResults([]);
                            }}
                          >
                            <span className="font-medium">{user.first_name} {user.last_name}</span> <span className="text-muted-foreground">{user.phone || user.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="banner" checked={notificationData.banner} onChange={e => setNotificationData(prev => ({ ...prev, banner: e.target.checked }))} className="accent-primary w-4 h-4 rounded focus:ring-2 focus:ring-primary/60 transition-all" />
                <Label htmlFor="banner">{t('admin.notifications.banner')}</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">{t('admin.notifications.schedule')}</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={notificationData.scheduledAt}
                  onChange={e => setNotificationData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                  className="focus:ring-2 focus:ring-primary/60 transition-all bg-muted text-foreground border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.notifications.image')}</Label>
                <label className="block w-full cursor-pointer bg-muted border border-dashed border-primary/40 rounded-lg p-3 text-center hover:bg-primary/10 transition-all">
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                  <span className="text-sm text-primary-foreground">{t('common.chooseFile')}</span>
                </label>
                {notificationData.imageUrl && (
                  <img src={notificationData.imageUrl} alt="preview" className="max-w-[120px] max-h-[40px] object-contain mt-3 rounded-lg border border-border shadow truncate overflow-x-auto" />
                )}
              </div>
              <Button onClick={handleSendNotification} className="w-full shadow-glow text-lg py-3">
                {editingId ? t('common.save') : t('admin.notifications.send')}
              </Button>
            </div>
            {/* Divider for large screens */}
            <div className="hidden md:block h-full w-px bg-border mx-2" aria-hidden="true"></div>
            {/* Notification Preview */}
            <Card className="bg-accent/60 border border-border shadow-glow rounded-xl h-full flex flex-col flex-1">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">{t('common.view')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h5 className="font-bold text-primary-foreground text-xl">{notificationData.title || t('admin.notifications.title')}</h5>
                  <p className="text-base text-muted-foreground mt-1 min-h-[48px]">{notificationData.message || t('admin.notifications.message')}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    <span className="bg-muted px-2 py-1 rounded">{t('admin.notifications.type')}: {t(`admin.notifications.type.${notificationData.type}`)}</span>
                    <span className="bg-muted px-2 py-1 rounded">{t('admin.notifications.banner')}: {notificationData.banner ? t('common.success') : t('common.cancel')}</span>
                    {notificationData.scheduledAt && <span className="bg-muted px-2 py-1 rounded">{t('admin.notifications.scheduledAt')}: {notificationData.scheduledAt}</span>}
                  </div>
                  {notificationData.imageUrl && (
                    <img src={notificationData.imageUrl} alt="preview" className="max-w-[120px] max-h-[40px] object-contain mt-3 rounded-lg border border-border shadow truncate overflow-x-auto" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-8 w-full">
            <h4 className="font-semibold mb-4">{t('admin.notifications')}</h4>
            {loadingNotifications ? (
              <div>{t('common.loading')}</div>
            ) : notifications.length === 0 ? (
              <div>{t('admin.notifications.noNotifications')}</div>
            ) : (
              <Table className="bg-card border border-border rounded-xl shadow-glow">
                <TableHeader className="bg-muted">
                  <TableRow className="border-b border-border">
                    <TableHead className="text-foreground">{t('admin.notifications.title')}</TableHead>
                    <TableHead className="text-foreground">{t('admin.notifications.type')}</TableHead>
                    <TableHead className="text-foreground">{t('admin.notifications.target')}</TableHead>
                    <TableHead className="text-foreground">{t('admin.notifications.banner')}</TableHead>
                    <TableHead className="text-foreground">{t('admin.notifications.scheduledAt')}</TableHead>
                    <TableHead className="text-foreground">{t('admin.notifications.status')}</TableHead>
                    <TableHead className="text-foreground">{t('admin.notifications.image')}</TableHead>
                    <TableHead className="text-foreground">{t('admin.notifications.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-card">
                  {notifications.map((notif) => (
                    <TableRow key={notif.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="text-foreground">{notif.title}</TableCell>
                      <TableCell className="text-foreground">{t(`admin.notifications.type.${notif.type}`)}</TableCell>
                      <TableCell className="text-foreground">{notif.user_uid ? notif.user_uid : t('admin.notifications.target.all')}</TableCell>
                      <TableCell className="text-foreground">{notif.banner ? t('common.success') : t('common.cancel')}</TableCell>
                      <TableCell className="text-foreground">{notif.scheduled_at ? format(new Date(notif.scheduled_at), 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                      <TableCell className="text-foreground">{notif.sent_at ? t('admin.notifications.status.sent') : notif.scheduled_at ? t('admin.notifications.status.scheduled') : '-'}</TableCell>
                      <TableCell>
                        {notif.image_url && <img src={notif.image_url} alt="notif" className="max-w-[60px] max-h-[40px] object-contain rounded-lg border border-border shadow truncate overflow-x-auto" />}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="mr-2" onClick={() => handleEdit(notif)}>{t('common.edit')}</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(notif)}>{t('common.delete')}</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 