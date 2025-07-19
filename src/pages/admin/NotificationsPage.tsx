import { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Pencil, Trash, Image, Send, Eye, Calendar, Users, Target, RefreshCw } from 'lucide-react';
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

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'offer': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'ad': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusBadge = (notif: Notification) => {
    if (notif.sent_at) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Sent</Badge>;
    } else if (notif.scheduled_at) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Scheduled</Badge>;
    } else {
      return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('admin.notifications') || 'Notifications'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage user notifications and announcements
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              {notifications.length} Notifications
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Form */}
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                {editingId ? t('common.edit') : t('admin.notifications.create')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="notificationTitle" className="text-sm font-medium">
                  {t('admin.notifications.title') || 'Title'}
                </Label>
                <Input
                  id="notificationTitle"
                  value={notificationData.title}
                  onChange={e => setNotificationData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter notification title..."
                  className="bg-background/50 border-border/50 focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notificationMessage" className="text-sm font-medium">
                  {t('admin.notifications.message') || 'Message'}
                </Label>
                <Textarea
                  id="notificationMessage"
                  value={notificationData.message}
                  onChange={e => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter notification message..."
                  className="min-h-[120px] bg-background/50 border-border/50 focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('admin.notifications.type') || 'Type'}
                  </Label>
                  <Select value={notificationData.type} onValueChange={(value) => setNotificationData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">{t('admin.notifications.type.info') || 'Info'}</SelectItem>
                      <SelectItem value="offer">{t('admin.notifications.type.offer') || 'Offer'}</SelectItem>
                      <SelectItem value="ad">{t('admin.notifications.type.ad') || 'Advertisement'}</SelectItem>
                      <SelectItem value="warning">{t('admin.notifications.type.warning') || 'Warning'}</SelectItem>
                      <SelectItem value="success">{t('admin.notifications.type.success') || 'Success'}</SelectItem>
                      <SelectItem value="error">{t('admin.notifications.type.error') || 'Error'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('admin.notifications.target') || 'Target'}
                  </Label>
                  <Select value={notificationData.target} onValueChange={(value) => setNotificationData(prev => ({ ...prev, target: value, targetValue: '' }))}>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin.notifications.target.all') || 'All Users'}</SelectItem>
                      <SelectItem value="user">{t('admin.notifications.target.user') || 'Specific User'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {notificationData.target === 'user' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('admin.notifications.searchUser') || 'Search User'}
                  </Label>
                  <div className="relative">
                    <Input
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search by name, phone, or email..."
                      className="bg-background/50 border-border/50 focus:ring-2 focus:ring-primary/30"
                    />
                    {userSearchLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      </div>
                    )}
                    {userResults.length > 0 && (
                      <div className="absolute z-10 bg-background border border-border rounded-lg shadow-lg w-full mt-1 max-h-48 overflow-y-auto">
                        {userResults.map(user => (
                          <div
                            key={user.user_uid}
                            className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border/50 last:border-b-0"
                            onClick={() => {
                              setNotificationData(prev => ({ ...prev, targetValue: user.user_uid }));
                              setUserSearch(`${user.first_name || ''} ${user.last_name || ''} (${user.phone || user.email})`);
                              setUserResults([]);
                            }}
                          >
                            <div className="font-medium">{user.first_name} {user.last_name}</div>
                            <div className="text-xs text-muted-foreground">{user.phone || user.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="banner"
                  checked={notificationData.banner}
                  onCheckedChange={(checked) => setNotificationData(prev => ({ ...prev, banner: checked }))}
                />
                <Label htmlFor="banner" className="text-sm font-medium">
                  {t('admin.notifications.banner') || 'Show as Banner'}
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledAt" className="text-sm font-medium">
                  {t('admin.notifications.schedule') || 'Schedule (Optional)'}
                </Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={notificationData.scheduledAt}
                  onChange={e => setNotificationData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                  className="bg-background/50 border-border/50 focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('admin.notifications.image') || 'Image (Optional)'}
                </Label>
                <div className="border-2 border-dashed border-border/50 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {t('common.chooseFile') || 'Click to upload image'}
                    </p>
                  </div>
                </div>
                {notificationData.imageUrl && (
                  <div className="mt-2">
                    <img
                      src={notificationData.imageUrl}
                      alt="preview"
                      className="max-w-[120px] max-h-[60px] object-contain rounded-lg border border-border/50"
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={handleSendNotification}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Send className="w-4 h-4 mr-2" />
                {editingId ? t('common.save') : t('admin.notifications.send')}
              </Button>
            </CardContent>
          </Card>

          {/* Notification Preview */}
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                {t('common.preview') || 'Preview'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-background/30 rounded-lg border border-border/50">
                <h3 className="font-bold text-lg mb-2">
                  {notificationData.title || t('admin.notifications.title')}
                </h3>
                <p className="text-muted-foreground mb-3">
                  {notificationData.message || t('admin.notifications.message')}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className={getNotificationTypeColor(notificationData.type)}>
                    {t(`admin.notifications.type.${notificationData.type}`) || notificationData.type}
                  </Badge>
                  <Badge variant={notificationData.banner ? "default" : "secondary"}>
                    {notificationData.banner ? 'Banner' : 'Normal'}
                  </Badge>
                  {notificationData.target === 'user' && (
                    <Badge variant="outline">
                      <Users className="w-3 h-3 mr-1" />
                      Specific User
                    </Badge>
                  )}
                </div>

                {notificationData.scheduledAt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Scheduled: {new Date(notificationData.scheduledAt).toLocaleString()}
                  </div>
                )}

                {notificationData.imageUrl && (
                  <div className="mt-3">
                    <img
                      src={notificationData.imageUrl}
                      alt="preview"
                      className="max-w-[120px] max-h-[60px] object-contain rounded-lg border border-border/50"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              {t('admin.notifications.history') || 'Notification History'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingNotifications ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <span className="text-lg font-medium">{t('common.loading') || 'Loading...'}</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <Bell className="w-12 h-12 opacity-50" />
                </div>
                <span className="text-lg font-medium mb-2">{t('admin.notifications.noNotifications') || 'No notifications found'}</span>
                <span className="text-sm text-center max-w-md">
                  Create your first notification to start communicating with users
                </span>
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-semibold">Title</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">Target</TableHead>
                        <TableHead className="font-semibold">Banner</TableHead>
                        <TableHead className="font-semibold">Scheduled</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Image</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.map((notif) => (
                        <TableRow key={notif.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {notif.title}
                          </TableCell>
                          <TableCell>
                            <Badge className={getNotificationTypeColor(notif.type)}>
                              {t(`admin.notifications.type.${notif.type}`) || notif.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {notif.user_uid ? (
                              <Badge variant="outline">
                                <Users className="w-3 h-3 mr-1" />
                                Specific User
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Target className="w-3 h-3 mr-1" />
                                All Users
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={notif.banner ? "default" : "secondary"}>
                              {notif.banner ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {notif.scheduled_at ? format(new Date(notif.scheduled_at), 'MMM dd, HH:mm') : '-'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(notif)}
                          </TableCell>
                          <TableCell>
                            {notif.image_url && (
                              <img
                                src={notif.image_url}
                                alt="notification"
                                className="w-12 h-8 object-cover rounded border border-border/50"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(notif)}
                                className="bg-background/50 hover:bg-background/80"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(notif)}
                                className="shadow-sm"
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 