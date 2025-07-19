import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun, Menu, X, Settings, Home, Users, Package, Gift, DollarSign, BarChart3, Bell, Phone, Trophy, Wallet } from 'lucide-react';
import { NotificationInbox } from './NotificationInbox';
import { supabase, checkIfUserIsAdmin } from '@/lib/supabase';
import DarkLogo from '/Dark_mode.png';
import LightLogo from '/Light_mode.png';

export function Navigation() {
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isLoggedIn = Boolean(localStorage.getItem('cash-logged-in'));
  const isAdmin = location.pathname.startsWith('/admin') || location.pathname.startsWith('/manage-offers');
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
          .select('first_name, last_name, email, profile_photo_url, wallet')
          .eq('user_uid', user.id)
          .single();
        setUserInfo(userInfoData);
      }
    };
    if (isLoggedIn) checkAdmin();
  }, [isLoggedIn]);

  const navItems = [
    { href: '/offers', label: t('nav.offers') },
    { href: '/investment-certificates', label: t('nav.investmentCertificates') || 'Investment Certificates' },
    { href: '/my-offers', label: 'My Offers' },
    { href: '/profile', label: t('nav.profile') },
    { href: '/wallet', label: t('profile.wallet'), icon: <Wallet /> },
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
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center h-16">
          {/* Logo - Positioned based on language */}
          <Link to="/" className={`flex items-center h-12 flex-shrink-0 ${isRTL ? 'order-last' : 'order-first'}`}>
            <img
              src={theme === 'dark' ? DarkLogo : LightLogo}
              alt="Cash App Logo"
              className="h-8 md:h-10 w-auto"
              style={{ maxWidth: 'min(120px, 25vw)' }}
            />
          </Link>

          {/* Navigation Links and Actions - Hidden on Mobile */}
          <div className="flex-1 hidden md:flex items-center justify-center mx-4">
            {isLoggedIn && !isAdmin && (
              <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      isActive(item.href) ? 'text-primary' : 'text-muted-foreground'
                    } flex items-center`}
                  >
                    {item.icon && <span className="mr-1">{item.icon}</span>}
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Actions (Theme, Language, Profile, etc.) */}
          <div className={`flex items-center gap-2 md:gap-3 flex-shrink-0 ${isRTL ? 'order-first' : 'order-last'}`}>
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden w-10 h-10 p-0 border border-border hover:bg-muted/50 transition-all duration-200"
              style={{ display: 'flex !important' }}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
            {/* Admin Switch View Button - Hidden on Mobile */}
            {isAdminUser && (
              <Button
                onClick={handleSwitchView}
                variant="default"
                size="sm"
                className="hidden md:flex text-xs font-bold border-2 border-primary bg-primary text-white hover:bg-primary/90 ml-2"
                style={{ minWidth: 120 }}
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
              className="w-9 h-9 p-0 hover:bg-muted/50 transition-all duration-200 rounded-lg"
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
              className="w-9 h-9 p-0 text-xs font-medium hover:bg-muted/50 transition-all duration-200 rounded-lg"
            >
              {language === 'en' ? t('language.arabic') : t('language.english')}
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
                <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:flex">
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

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <>
            {/* Mobile Menu Overlay */}
            <div className="md:hidden fixed inset-0 bg-black/20 z-40" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="md:hidden py-4 border-t bg-background/95 backdrop-blur shadow-lg relative z-50" style={{ display: 'block !important', minHeight: '180px' }}>
            {isLoggedIn && !isAdmin && (
              <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`block px-3 py-3 text-base font-medium transition-colors hover:bg-muted/50 rounded-lg mx-2 border border-transparent hover:border-border ${
                      isActive(item.href) ? 'text-primary bg-primary/10 border-primary/20' : 'text-foreground'
                    } flex items-center`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.icon && <span className="mr-2">{item.icon}</span>}
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
                className="w-full mt-3 mx-2"
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

            <div className={`flex flex-col space-y-3 px-4 py-3 border-t mt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {/* Theme and Language Controls */}
              <div className={`flex items-center ${isRTL ? 'justify-end' : 'justify-between'}`}>
                <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTheme}
                    className="w-10 h-10 p-0"
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                    className="w-10 h-10 p-0 text-sm font-medium"
                  >
                    {language === 'en' ? t('language.arabic') : t('language.english')}
                  </Button>
                </div>
              </div>

              {/* User Actions */}
              {isLoggedIn ? (
                <div className={`flex items-center ${isRTL ? 'justify-end' : 'justify-between'}`}>
                  <Link to="/profile" className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`} onClick={() => setIsMobileMenuOpen(false)}>
                    <Avatar className="w-10 h-10">
                      {getProfilePhotoUrl() ? (
                        <img 
                          src={getProfilePhotoUrl()!} 
                          alt="Profile" 
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <AvatarFallback className="text-sm">
                          {getAvatarFallback()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-sm font-medium">
                      {userInfo?.first_name ? `${userInfo.first_name} ${userInfo.last_name || ''}` : 'Profile'}
                    </span>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    {t('nav.logout')}
                  </Button>
                </div>
              ) : (
                <div className={`flex flex-col space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <Button asChild variant="ghost" size="sm" className={`w-full ${isRTL ? 'justify-end' : 'justify-start'}`}>
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.login')}</Link>
                  </Button>
                  <Button asChild size="sm" className={`w-full ${isRTL ? 'justify-end' : 'justify-start'}`}>
                    <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.register')}</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
          </>
        )}
      </div>
    </nav>
  );
}