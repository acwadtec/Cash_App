import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function NotificationInbox() {
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && 
          bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative">
      <button 
        ref={bellRef} 
        onClick={() => { setOpen(!open); if (!open) markAllRead(); }} 
        className="relative text-foreground hover:text-primary transition-all duration-200 p-2 rounded-lg hover:bg-primary/10 hover:scale-105 active:scale-95"
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-1.5 min-w-[18px] h-[18px] flex items-center justify-center font-bold shadow-lg animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div ref={dropdownRef} className={`absolute mt-3 w-80 sm:w-96 bg-card/95 backdrop-blur-md border border-border/50 rounded-xl shadow-2xl z-50 max-h-[400px] overflow-y-auto animate-slide-down ${isRTL ? 'left-0' : 'right-0'}`}>
          <div className="p-4 border-b border-border/50 font-bold text-foreground bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-xl">
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'}`}>
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>
          {notifications.length === 0 ? (
            <div className="p-8 text-muted-foreground text-center">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs opacity-70 mt-1">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notif, index) => (
              <div 
                key={notif.id} 
                className={`p-4 border-b border-border/30 last:border-b-0 flex items-start gap-3 hover:bg-primary/5 transition-all duration-200 cursor-pointer group animate-stagger-in ${isRTL ? 'flex-row-reverse' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground mb-2 line-clamp-2 text-sm group-hover:text-primary transition-colors">
                    {notif.title}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </div>
                  <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
                    <div className="text-xs text-muted-foreground/60">
                      {notif.created_at ? new Date(notif.created_at).toLocaleDateString() : ''}
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
                {notif.read && (
                  <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0 opacity-70" />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
} 