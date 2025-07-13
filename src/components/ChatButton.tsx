import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { ChatSupport } from './ChatSupport';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

export function ChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { t } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUserId(userData?.user?.id || null);
    };
    getUser();
  }, []);

  const fetchUnread = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', userId)
      .eq('sender', 'admin')
      .eq('is_read', false);
    if (!error && data) {
      setUnreadCount(data.length > 0 ? 1 : 0);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleOpenChat = () => {
    setIsChatOpen(true);
    setIsMinimized(false);
    setUnreadCount(0); // Optionally reset unread count when opening chat
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  const handleMinimizeChat = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isChatOpen && (
        <Button
          onClick={handleOpenChat}
          className="fixed bottom-4 right-4 w-14 h-14 rounded-full shadow-glow bg-primary hover:bg-primary/90 z-40"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white rounded-full text-xs px-2 py-0.5" style={{fontSize: 12, minWidth: 20, textAlign: 'center'}}>
              {unreadCount}
            </span>
          )}
        </Button>
      )}

      {/* Chat Support Component */}
      <ChatSupport
        isOpen={isChatOpen}
        onClose={handleCloseChat}
        onMinimize={handleMinimizeChat}
        isMinimized={isMinimized}
      />
    </>
  );
} 