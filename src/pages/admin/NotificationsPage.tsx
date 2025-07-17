import { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Pencil, Trash, Image } from 'lucide-react';

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

// Services
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  target: 'all' | 'user' | 'role';
  target_value?: string;
  banner: boolean;
  scheduled_at?: string;
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
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notificationForm, setNotificationForm] = useState<NotificationForm>({
    title: '',
    message: '',
    type: 'info',
    target: 'all',
    target_value: '',
    banner: false,
    scheduled_at: '',
    image_url: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to fetch notifications'),
        variant: 'destructive',
      });
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setNotificationForm(prev => ({
        ...prev,
        image_url: URL.createObjectURL(file)
      }));
    }
  };

  const uploadImage = async (file: File) => {
    const filePath = `notifications/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('notification-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('notification-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleAddNotification = async () => {
    try {
      let imageUrl = notificationForm.image_url;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { error } = await supabase
        .from('notifications')
        .insert([{
          ...notificationForm,
          image_url: imageUrl
        }]);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Notification added successfully'),
      });
      setShowAddModal(false);
      setNotificationForm({
        title: '',
        message: '',
        type: 'info',
        target: 'all',
        target_value: '',
        banner: false,
        scheduled_at: '',
        image_url: ''
      });
      setImageFile(null);
      fetchNotifications();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to add notification'),
        variant: 'destructive',
      });
    }
  };

  const handleEditNotification = async () => {
    if (!selectedNotification) return;

    try {
      let imageUrl = notificationForm.image_url;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { error } = await supabase
        .from('notifications')
        .update({
          ...notificationForm,
          image_url: imageUrl
        })
        .eq('id', selectedNotification.id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Notification updated successfully'),
      });
      setShowEditModal(false);
      setSelectedNotification(null);
      setNotificationForm({
        title: '',
        message: '',
        type: 'info',
        target: 'all',
        target_value: '',
        banner: false,
        scheduled_at: '',
        image_url: ''
      });
      setImageFile(null);
      fetchNotifications();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to update notification'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!window.confirm(t('Are you sure you want to delete this notification?'))) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Notification deleted successfully'),
      });
      fetchNotifications();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to delete notification'),
        variant: 'destructive',
      });
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'info':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">{t('Info')}</Badge>;
      case 'success':
        return <Badge className="bg-green-50 text-green-700 border-green-200">{t('Success')}</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">{t('Warning')}</Badge>;
      case 'error':
        return <Badge className="bg-red-50 text-red-700 border-red-200">{t('Error')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('Notifications')}</h2>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('Add Notification')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('Notifications List')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Title')}</TableHead>
                <TableHead>{t('Type')}</TableHead>
                <TableHead>{t('Target')}</TableHead>
                <TableHead>{t('Banner')}</TableHead>
                <TableHead>{t('Scheduled')}</TableHead>
                <TableHead>{t('Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingNotifications ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {t('Loading...')}
                  </TableCell>
                </TableRow>
              ) : notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {t('No notifications found')}
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell>{notification.title}</TableCell>
                    <TableCell>{getTypeBadge(notification.type)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {notification.target === 'all' ? t('All Users') : 
                         notification.target === 'user' ? t('Specific User') : t('Role')}
                        {notification.target_value && `: ${notification.target_value}`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={notification.banner ? 'default' : 'outline'}>
                        {notification.banner ? t('Yes') : t('No')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {notification.scheduled_at ? 
                        new Date(notification.scheduled_at).toLocaleDateString() : 
                        t('Not scheduled')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedNotification(notification);
                            setNotificationForm({
                              title: notification.title,
                              message: notification.message,
                              type: notification.type,
                              target: notification.target,
                              target_value: notification.target_value || '',
                              banner: notification.banner,
                              scheduled_at: notification.scheduled_at || '',
                              image_url: notification.image_url || ''
                            });
                            setShowEditModal(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteNotification(notification.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Notification Modal */}
      <Dialog open={showAddModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedNotification(null);
          setNotificationForm({
            title: '',
            message: '',
            type: 'info',
            target: 'all',
            target_value: '',
            banner: false,
            scheduled_at: '',
            image_url: ''
          });
          setImageFile(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {showAddModal ? t('Add New Notification') : t('Edit Notification')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Title')}</Label>
              <Input
                value={notificationForm.title}
                onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('Message')}</Label>
              <Textarea
                value={notificationForm.message}
                onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('Type')}</Label>
              <Select
                value={notificationForm.type}
                onValueChange={(value: 'info' | 'success' | 'warning' | 'error') => 
                  setNotificationForm(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('Select type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">{t('Info')}</SelectItem>
                  <SelectItem value="success">{t('Success')}</SelectItem>
                  <SelectItem value="warning">{t('Warning')}</SelectItem>
                  <SelectItem value="error">{t('Error')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('Target')}</Label>
              <Select
                value={notificationForm.target}
                onValueChange={(value: 'all' | 'user' | 'role') => 
                  setNotificationForm(prev => ({ ...prev, target: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('Select target')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Users')}</SelectItem>
                  <SelectItem value="user">{t('Specific User')}</SelectItem>
                  <SelectItem value="role">{t('Role')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {notificationForm.target !== 'all' && (
              <div>
                <Label>{t('Target Value')}</Label>
                <Input
                  value={notificationForm.target_value}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, target_value: e.target.value }))}
                  placeholder={notificationForm.target === 'user' ? t('User ID') : t('Role name')}
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Switch
                checked={notificationForm.banner}
                onCheckedChange={(checked) => 
                  setNotificationForm(prev => ({ ...prev, banner: checked }))
                }
              />
              <Label>{t('Show as Banner')}</Label>
            </div>
            <div>
              <Label>{t('Schedule')}</Label>
              <Input
                type="datetime-local"
                value={notificationForm.scheduled_at}
                onChange={(e) => setNotificationForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('Image')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="h-4 w-4 mr-2" />
                  {t('Choose Image')}
                </Button>
                {notificationForm.image_url && (
                  <img
                    src={notificationForm.image_url}
                    alt="Preview"
                    className="h-10 w-10 object-cover rounded"
                  />
                )}
              </div>
            </div>
            <Button
              onClick={showAddModal ? handleAddNotification : handleEditNotification}
              disabled={!notificationForm.title || !notificationForm.message}
            >
              {showAddModal ? t('Add Notification') : t('Update Notification')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 