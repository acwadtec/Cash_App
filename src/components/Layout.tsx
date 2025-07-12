import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { ChatButton } from './ChatButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocation } from 'react-router-dom';

export function Layout() {
  const { isRTL } = useLanguage();
  const location = useLocation();
  const isLoggedIn = Boolean(localStorage.getItem('cash-logged-in'));
  const isHome = location.pathname === '/';
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`}>
      <Navigation />
      <main className="pt-16">
        <Outlet />
      </main>
      {/* Show chat button for logged-in users (not on home page or admin pages) */}
      {isLoggedIn && !isHome && !isAdmin && <ChatButton />}
    </div>
  );
}