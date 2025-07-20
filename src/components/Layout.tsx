import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { ChatButton } from './ChatButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocation } from 'react-router-dom';
import { NotificationBanner } from './NotificationBanner';
import { useEffect, useState } from 'react';
import { supabase, checkIfUserIsAdmin } from '@/lib/supabase';

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
        const isAdminUser = await checkIfUserIsAdmin(user.id);
        setIsAdmin(isAdminUser);
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
      {/* Show chat button for logged-in users (not on admin pages) */}
      {isLoggedIn && !isAdmin && <ChatButton />}
    </div>
  );
}