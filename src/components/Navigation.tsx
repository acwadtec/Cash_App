import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun, Menu, X, Settings, Home } from 'lucide-react';
import { NotificationInbox } from './NotificationInbox';
import { supabase, checkIfUserIsAdmin } from '@/lib/supabase';
import DarkLogo from '@/../public/Dark_mode.png';
import LightLogo from '@/../public/Light_mode.png';

export function Navigation() {
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isLoggedIn = Boolean(localStorage.getItem('cash-logged-in'));
  const isAdmin = location.pathname.startsWith('/admin');
  const isManageOffers = location.pathname.startsWith('/manage-offers');
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) {
        const isAdmin = await checkIfUserIsAdmin(user.id);
        setIsAdminUser(isAdmin);
        
        // Fetch user info for profile photo
        const { data: userInfoData } = await supabase
          .from('user_info')
          .select('first_name, last_name, email, profile_photo_url')
          .eq('user_uid', user.id)
          .single();
        setUserInfo(userInfoData);
      }
    };
    if (isLoggedIn) checkAdmin();
  }, [isLoggedIn]);

  const navItems = [
    { href: '/offers', label: t('nav.offers') },
    { href: '/profile', label: t('nav.profile') },
    { href: '/transactions', label: t('nav.transactions') },
    { href: '/deposit', label: t('nav.deposit') },
    { href: '/withdrawal', label: t('nav.withdrawal') },
    { href: '/help', label: t('nav.help') },
    { href: '/referral-network', label: t('nav.team') },
  ];

  const isActive = (href: string) => location.pathname === href;
  const isHome = location.pathname === '/';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('cash-logged-in');
    navigate('/');
  };

  const handleSwitchView = () => {
    if (isAdmin) {
      // If currently in admin dashboard, go to website
      navigate('/');
    } else {
      // If currently in website, go to admin dashboard
      navigate('/admin');
    }
  };

  const getProfilePhotoUrl = () => {
    if (userInfo?.profile_photo_url) {
      return supabase.storage.from('user-photos').getPublicUrl(userInfo.profile_photo_url).data.publicUrl;
    }
    return null;
  };

  const getAvatarFallback = () => {
    return userInfo?.first_name?.slice(0, 1).toUpperCase() || 
           userInfo?.last_name?.slice(0, 1).toUpperCase() || 
           userInfo?.email?.slice(0, 2).toUpperCase() ||
           'U';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center h-12 flex-shrink-0 mr-4">
            <img
              src={theme === 'dark' ? DarkLogo : LightLogo}
              alt="Cash App Logo"
              className="h-10 w-auto"
              style={{ maxWidth: 160 }}
            />
          </Link>

          {/* Navigation Links and Actions */}
          <div className="flex-1 flex items-center justify-center">
            {isLoggedIn && !isAdmin && (
              <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      isActive(item.href) ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Actions (Theme, Language, Profile, etc.) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Admin Switch View Button */}
            {isAdminUser && (
              <Button
                onClick={handleSwitchView}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {isAdmin ? (
                  <>
                    <Home className="h-4 w-4 mr-2" />
                    {t('nav.website') || 'Website'}
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    {t('nav.dashboard') || 'Dashboard'}
                  </>
                )}
              </Button>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-9 h-9 p-0"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="w-9 h-9 p-0 text-xs font-medium"
            >
              {language === 'en' ? 'عربي' : 'EN'}
            </Button>

            {/* Notifications */}
            {isLoggedIn && !isAdmin && <NotificationInbox />}

            {/* User Actions */}
            {isLoggedIn ? (
              <div className="flex items-center space-x-2">
                {/* User Profile Photo */}
                <Link to="/profile">
                  <Avatar className="w-8 h-8">
                    {getProfilePhotoUrl() ? (
                      <img 
                        src={getProfilePhotoUrl()!} 
                        alt="Profile" 
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <AvatarFallback className="text-xs">
                        {getAvatarFallback()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  {t('nav.logout')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">{t('nav.login')}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">{t('nav.register')}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation remains unchanged */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            {isLoggedIn && !isAdmin && (
              <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                    className={`block px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${
                      isActive(item.href) ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              </div>
            )}

            {/* Admin Switch View Button */}
            {isAdminUser && (
              <Button
                onClick={() => {
                  handleSwitchView();
                  setIsMobileMenuOpen(false);
                }}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
                {isAdmin ? (
                  <>
                    <Home className="h-4 w-4 mr-2" />
                    {t('nav.website') || 'Website'}
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    {t('nav.dashboard') || 'Dashboard'}
                  </>
                )}
              </Button>
            )}

            <div className="flex items-center justify-between px-4 py-2 border-t mt-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="w-9 h-9 p-0"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                  className="w-9 h-9 p-0 text-xs font-medium"
                >
                  {language === 'en' ? 'عربي' : 'EN'}
                </Button>
              </div>

              {isLoggedIn ? (
                <div className="flex items-center space-x-2">
                  {/* Mobile User Profile Photo */}
                  <Link to="/profile">
                    <Avatar className="w-8 h-8">
                      {getProfilePhotoUrl() ? (
                        <img 
                          src={getProfilePhotoUrl()!} 
                          alt="Profile" 
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <AvatarFallback className="text-xs">
                          {getAvatarFallback()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    {t('nav.logout')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/login">{t('nav.login')}</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/register">{t('nav.register')}</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}