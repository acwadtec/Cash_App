import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun, Menu, X } from 'lucide-react';

export function Navigation() {
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/offers', label: t('nav.offers') },
    { href: '/profile', label: t('nav.profile') },
    { href: '/transactions', label: t('nav.transactions') },
    { href: '/deposit', label: t('nav.deposit') },
    { href: '/withdrawal', label: t('nav.withdrawal') },
  ];

  const isActive = (href: string) => location.pathname === href;
  const isHome = location.pathname === '/';
  const isLoggedIn = Boolean(localStorage.getItem('cash-logged-in'));
  const isAdmin = location.pathname.startsWith('/admin');
  const isManageOffers = location.pathname.startsWith('/manage-offers');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer select-none">
            <img
              src={theme === 'light' ? '/Light_mode.png' : '/Dark_mode.png'}
              alt="Cash Logo"
              className="w-28 h-auto"
              style={{ maxHeight: '40px' }}
            />
          </Link>

          {/* Desktop Navigation */}
          {!isHome && isLoggedIn && !isAdmin && !isManageOffers && (
            <div className="hidden md:flex items-center space-x-1 rtl:space-x-reverse">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-9 h-9 p-0"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>

            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="text-sm font-medium"
            >
              {t('language.switch')}
            </Button>

            {/* Logout Button */}
            {!isHome && isLoggedIn && !isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  localStorage.removeItem('cash-logged-in');
                  navigate('/');
                }}
                className="text-sm font-medium ml-2"
              >
                Logout
              </Button>
            )}

            {!isHome && isLoggedIn && isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  localStorage.removeItem('cash-logged-in');
                  navigate('/');
                }}
                className="text-sm font-medium ml-2"
              >
                Logout
              </Button>
            )}

            {/* Mobile Menu Button */}
            {!isHome && isLoggedIn && !isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden w-9 h-9 p-0"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {!isHome && isLoggedIn && !isAdmin && isMobileMenuOpen && !isManageOffers && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}