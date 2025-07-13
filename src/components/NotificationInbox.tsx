import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, CheckCircle } from 'lucide-react';

export function NotificationInbox() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUserId(userData?.user?.id || null);
    };
    getUser();
  }, []);

  const fetchNotifications = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_uid.is.null,user_uid.eq.${userId}`)
      .lte('scheduled_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  const markAllRead = async () => {
    if (!userId) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
      fetchNotifications();
    }
  };

  // Expose bell position for NotificationBanner
  useEffect(() => {
    function sendBellPos() {
      if (bellRef.current) {
        const rect = bellRef.current.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        window.dispatchEvent(new CustomEvent('bell-pos', { detail: { x, y } }));
      }
    }
    sendBellPos();
    window.addEventListener('resize', sendBellPos);
    return () => window.removeEventListener('resize', sendBellPos);
  }, []);

  return (
    <div className="relative">
      <button 
        ref={bellRef} 
        onClick={() => { setOpen(!open); if (!open) markAllRead(); }} 
        className="relative text-foreground hover:text-primary transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-1 min-w-[18px] h-[18px] flex items-center justify-center font-medium">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto animate-fade-in">
          <div className="p-4 border-b border-border font-bold text-foreground bg-muted/50">
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-muted-foreground text-center">
              No notifications
            </div>
          ) : (
            notifications.map((notif) => (
              <div key={notif.id} className="p-4 border-b border-border last:border-b-0 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground mb-1 line-clamp-2">
                    {notif.title}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2 line-clamp-3">
                    {notif.message}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {notif.created_at ? new Date(notif.created_at).toLocaleString() : ''}
                  </div>
                </div>
                {notif.read && (
                  <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
} 