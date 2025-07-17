import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Users, Package, Gift, DollarSign, BarChart3, Bell, Phone, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigation } from './Navigation';

export function AdminLayout() {
  const { t, isRTL } = useLanguage();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const adminNavItems = [
    { href: '/admin/analytics', label: t('admin.analytics'), icon: BarChart3 },
    { href: '/admin/users', label: t('admin.users'), icon: Users },
    { href: '/admin/offers', label: t('admin.offers'), icon: Package },
    { href: '/admin/referrals', label: t('admin.referrals'), icon: Gift },
    { href: '/admin/withdrawals', label: t('admin.withdrawals.title'), icon: DollarSign },
    { href: '/admin/transactions', label: t('admin.transactions'), icon: BarChart3 },
    { href: '/admin/notifications', label: t('admin.notifications'), icon: Bell },
    { href: '/admin/deposit-numbers', label: t('admin.depositNumbers'), icon: Phone },
    { href: '/admin/deposit-requests', label: t('admin.depositRequests'), icon: DollarSign },
    { href: '/admin/support', label: t('admin.support'), icon: Phone },
    { href: '/admin/gamification', label: t('admin.gamification'), icon: Trophy },
  ];

  return (
    <div className={`flex h-screen bg-background ${isRTL ? 'flex-row-reverse' : ''}`}>
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navigation />
      </div>
      {/* Sidebar */}
      <aside
        className={`transition-all duration-200 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shadow-lg pt-16 ${sidebarOpen ? 'w-64' : 'w-16'} flex flex-col h-full fixed z-40 ${isRTL ? 'right-0' : 'left-0'}`}
        aria-label="Admin sidebar"
      >
        <div className="flex items-center justify-between p-4">
          {sidebarOpen && <h1 className="text-xl font-bold text-primary">{t('Admin Dashboard')}</h1>}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
          </Button>
        </div>
        <nav className="mt-2 flex-1">
          {adminNavItems.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`group flex items-center gap-3 px-4 py-2 my-1 rounded-lg transition-colors font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                  ${active ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'}
                  ${sidebarOpen ? '' : 'justify-center'}
                `}
                title={!sidebarOpen ? item.label : undefined}
                tabIndex={0}
              >
                <item.icon className={`w-5 h-5 transition-colors ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
      {/* Main content */}
      <main className={`flex-1 overflow-auto pt-16 transition-all duration-200 ${isRTL ? 'mr-16' : 'ml-16'}`} style={isRTL ? { marginRight: sidebarOpen ? 256 : 64 } : { marginLeft: sidebarOpen ? 256 : 64 }}>
        <Outlet />
      </main>
    </div>
  );
} 