import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export function Layout() {
  const { isRTL } = useLanguage();

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`}>
      <Navigation />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}