import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { ChatButton } from './ChatButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocation } from 'react-router-dom';
import { NotificationBanner } from './NotificationBanner';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function Layout() {
  const { isRTL } = useLanguage();
  const location = useLocation();
  const isLoggedIn = Boolean(localStorage.getItem('cash-logged-in'));
  const isHome = location.pathname === '/';
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) {
        const { data: userInfo } = await supabase
          .from('user_info')
          .select('role')
          .eq('user_uid', user.id)
          .single();
        setIsAdmin(userInfo?.role === 'admin');
      }
    };
    checkAdmin();
  }, []);

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Only show NotificationBanner for non-admins */}
      {!isAdmin && <NotificationBanner />}
      <Navigation />
      <main className="pt-16">
        <Outlet />
      </main>
      {/* Show chat button for logged-in users (not on home page or admin pages) */}
      {isLoggedIn && !isHome && !isAdmin && <ChatButton />}
    </div>
  );
}