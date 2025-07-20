import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { optimizedQuery, clearCache, debounce, performanceMonitor } from '@/lib/performance';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Search, Filter, Edit, Save, X, Plus, Trash2, Trophy, Award, Users, Target, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Badge {
  id: string;
  name: string;
  description: string;
  type: string;
  requirement: number;
  active: boolean;
  created_at: string;
}

interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  points_earned: number;
  badge: Badge;
  user: {
    user_uid: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
}

interface Level {
  id: string;
  level: number;
  name: string;
  requirement: number;
  active: boolean;
}

const GamificationPage: React.FC = () => {
  const { t } = useLanguage();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [loadingUserBadges, setLoadingUserBadges] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showUserBadgeModal, setShowUserBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [selectedUserBadge, setSelectedUserBadge] = useState<UserBadge | null>(null);
  const [badgeForm, setBadgeForm] = useState({
    name: '',
    description: '',
    type: '',
    requirement: 0,
    active: true,
  });
  const [userBadgeForm, setUserBadgeForm] = useState({
    points_earned: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchTerm(term);
      setCurrentPage(1);
    }, 300),
    []
  );

  // Memoized filtered badges
  const filteredBadges = useMemo(() => {
    let filtered = badges;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(badge =>
        badge.name.toLowerCase().includes(searchLower) ||
        badge.description.toLowerCase().includes(searchLower) ||
        badge.type.toLowerCase().includes(searchLower)
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(badge => badge.type === filterType);
    }

    return filtered;
  }, [badges, searchTerm, filterType]);

  // Memoized paginated badges
  const paginatedBadges = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBadges.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBadges, currentPage, itemsPerPage]);

  // Memoized filtered user badges
  const filteredUserBadges = useMemo(() => {
    let filtered = userBadges;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(userBadge =>
        userBadge.user?.email.toLowerCase().includes(searchLower) ||
        userBadge.user?.first_name.toLowerCase().includes(searchLower) ||
        userBadge.user?.last_name.toLowerCase().includes(searchLower) ||
        userBadge.badge.name.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [userBadges, searchTerm]);

  // Memoized paginated user badges
  const paginatedUserBadges = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUserBadges.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUserBadges, currentPage, itemsPerPage]);

  // Optimized fetch badges
  const fetchBadges = useCallback(async () => {
    performanceMonitor.start('fetchBadges');
    setLoadingBadges(true);
    
    try {
      const { data, error } = await optimizedQuery(
        supabase,
        'badges',
        {},
        { ttl: 5 * 60 * 1000, select: '*' }
      );

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
      toast({
        title: t('common.error'),
        description: t('admin.error.fetchBadgesFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoadingBadges(false);
      performanceMonitor.end('fetchBadges');
    }
  }, [t]);

  // Optimized fetch user badges
  const fetchUserBadges = useCallback(async () => {
    performanceMonitor.start('fetchUserBadges');
    setLoadingUserBadges(true);
    
    try {
      // Fetch all user badges with badge info
      const { data: badges, error: badgeError } = await optimizedQuery(
        supabase,
        'user_badges',
        {},
        { ttl: 2 * 60 * 1000, select: '*, badge:badge_id(*)' }
      );
      
      if (badgeError) throw badgeError;

      // Fetch all user info
      const { data: users, error: userError } = await optimizedQuery(
        supabase,
        'user_info',
        {},
        { ttl: 2 * 60 * 1000, select: 'user_uid, email, first_name, last_name' }
      );
      
      if (userError) throw userError;

      // Merge user info into badges
      const userMap = Object.fromEntries((users || []).map(u => [u.user_uid, u]));
      const badgesWithUser = (badges || []).map(b => ({
        ...b,
        user: userMap[b.user_id] || null
      }));
      
      setUserBadges(badgesWithUser);
    } catch (error) {
      console.error('Error fetching user badges:', error);
      toast({
        title: t('common.error'),
        description: t('admin.error.fetchUserBadgesFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoadingUserBadges(false);
      performanceMonitor.end('fetchUserBadges');
    }
  }, [t]);

  // Optimized fetch levels
  const fetchLevels = useCallback(async () => {
    performanceMonitor.start('fetchLevels');
    setLoadingLevels(true);
    
    try {
      const { data, error } = await optimizedQuery(
        supabase,
        'levels',
        {},
        { ttl: 10 * 60 * 1000, select: '*' }
      );

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error('Error fetching levels:', error);
      toast({
        title: t('common.error'),
        description: t('admin.error.fetchLevelsFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoadingLevels(false);
      performanceMonitor.end('fetchLevels');
    }
  }, [t]);

  // Initial data fetch
  useEffect(() => {
    fetchBadges();
    fetchUserBadges();
    fetchLevels();
  }, [fetchBadges, fetchUserBadges, fetchLevels]);

  // Handle badge creation/update
  const handleBadgeSubmit = async () => {
    try {
      if (selectedBadge) {
        // Update existing badge
        const { error } = await supabase
          .from('badges')
          .update(badgeForm)
          .eq('id', selectedBadge.id);

        if (error) throw error;
        toast({ title: t('common.success'), description: t('admin.success.badgeUpdated') });
      } else {
        // Create new badge
        const { error } = await supabase
          .from('badges')
          .insert([badgeForm]);

        if (error) throw error;
        toast({ title: t('common.success'), description: t('admin.success.badgeCreated') });
      }

      setShowBadgeModal(false);
      setSelectedBadge(null);
      setBadgeForm({ name: '', description: '', type: '', requirement: 0, active: true });
      clearCache('badges');
      fetchBadges();
    } catch (error) {
      console.error('Error saving badge:', error);
      toast({
        title: t('common.error'),
        description: t('admin.error.saveBadgeFailed'),
        variant: 'destructive',
      });
    }
  };

  // Handle user badge update
  const handleUserBadgeSubmit = async () => {
    if (!selectedUserBadge) return;

    try {
      const { error } = await supabase
        .from('user_badges')
        .update({ points_earned: userBadgeForm.points_earned })
        .eq('id', selectedUserBadge.id);

      if (error) throw error;

      // Update local state
      setUserBadges(prev => prev.map(ub => 
        ub.id === selectedUserBadge.id 
          ? { ...ub, points_earned: userBadgeForm.points_earned }
          : ub
      ));

      toast({ title: t('common.success'), description: t('admin.success.userBadgeUpdated') });
      setShowUserBadgeModal(false);
      setSelectedUserBadge(null);
      setUserBadgeForm({ points_earned: 0 });
    } catch (error) {
      console.error('Error updating user badge:', error);
      toast({
        title: t('common.error'),
        description: t('admin.error.updateUserBadgeFailed'),
        variant: 'destructive',
      });
    }
  };

  // Handle badge deletion
  const handleDeleteBadge = async (badgeId: string) => {
    if (!confirm(t('admin.confirm.deleteBadge'))) return;

    try {
      const { error } = await supabase
        .from('badges')
        .delete()
        .eq('id', badgeId);

      if (error) throw error;

      toast({ title: t('common.success'), description: t('admin.success.badgeDeleted') });
      clearCache('badges');
      fetchBadges();
    } catch (error) {
      console.error('Error deleting badge:', error);
      toast({
        title: t('common.error'),
        description: t('admin.error.deleteBadgeFailed'),
        variant: 'destructive',
      });
    }
  };

  // Handle user badge deletion
  const handleDeleteUserBadge = async (userBadgeId: string) => {
    if (!confirm(t('admin.confirm.deleteUserBadge'))) return;

    try {
      const { error } = await supabase
        .from('user_badges')
        .delete()
        .eq('id', userBadgeId);

      if (error) throw error;

      // Update local state
      setUserBadges(prev => prev.filter(ub => ub.id !== userBadgeId));

      toast({ title: t('common.success'), description: t('admin.success.userBadgeDeleted') });
    } catch (error) {
      console.error('Error deleting user badge:', error);
      toast({
        title: t('common.error'),
        description: t('admin.error.deleteUserBadgeFailed'),
        variant: 'destructive',
      });
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle refresh
  const handleRefresh = () => {
    clearCache('badges');
    clearCache('user_badges');
    clearCache('levels');
    fetchBadges();
    fetchUserBadges();
    fetchLevels();
  };

  const getBadgeTypeColor = (type: string) => {
    switch (type) {
      case 'referral': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'deposit': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'withdrawal': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'profile': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('admin.gamification') || 'Gamification'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage badges, levels, and user achievements
            </p>
          </div>
          <Button 
            onClick={handleRefresh}
            variant="outline"
            className="bg-background/50 hover:bg-background/80"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.refresh') || 'Refresh'}
          </Button>
        </div>

        {/* Filters */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              {t('admin.filters') || 'Filters'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('admin.search') || 'Search'}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('admin.search.badges') || 'Search badges...'}
                    onChange={(e) => debouncedSearch(e.target.value)}
                    className="pl-10 bg-background/50 border-border/50 focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('admin.type') || 'Type'}</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.filters.allTypes') || 'All Types'}</SelectItem>
                    <SelectItem value="referral">{t('admin.badgeType.referral') || 'Referral'}</SelectItem>
                    <SelectItem value="deposit">{t('admin.badgeType.deposit') || 'Deposit'}</SelectItem>
                    <SelectItem value="withdrawal">{t('admin.badgeType.withdrawal') || 'Withdrawal'}</SelectItem>
                    <SelectItem value="profile">{t('admin.badgeType.profile') || 'Profile'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges Section */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              {t('admin.badges') || 'Badges'}
            </CardTitle>
            <Button 
              onClick={() => setShowBadgeModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.addBadge') || 'Add Badge'}
            </Button>
          </CardHeader>
          <CardContent>
            {loadingBadges ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <span className="text-lg font-medium">{t('common.loading') || 'Loading...'}</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedBadges.map((badge) => (
                    <Card key={badge.id} className="p-4 hover:shadow-lg transition-all duration-200 border-border/50 bg-background/30">
                      <div className="flex justify-between items-start mb-3">
                        <Badge className={getBadgeTypeColor(badge.type)}>
                          {badge.type}
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBadge(badge);
                              setBadgeForm({
                                name: badge.name,
                                description: badge.description,
                                type: badge.type,
                                requirement: badge.requirement,
                                active: badge.active,
                              });
                              setShowBadgeModal(true);
                            }}
                            className="bg-background/50 hover:bg-background/80"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteBadge(badge.id)}
                            className="shadow-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="font-semibold mb-2 text-foreground">{badge.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{badge.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Target className="w-3 h-3" />
                        Requirement: {badge.requirement}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {filteredBadges.length > itemsPerPage && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(currentPage - 1)}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-muted/50'}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.ceil(filteredBadges.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer hover:bg-muted/50"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(currentPage + 1)}
                          className={currentPage === Math.ceil(filteredBadges.length / itemsPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-muted/50'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Levels Section */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
              {t('admin.levels') || 'Levels'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLevels ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <span className="text-lg font-medium">{t('common.loading') || 'Loading...'}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {levels.map((level) => (
                  <Card key={level.id} className="p-4 hover:shadow-lg transition-all duration-200 border-border/50 bg-background/30">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant={level.active ? "default" : "secondary"}>
                        Level {level.level}
                      </Badge>
                    </div>
                    <h3 className="font-semibold mb-2 text-foreground">{level.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Target className="w-3 h-3" />
                      Requirement: {level.requirement}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Badges Section */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              {t('admin.userBadges') || 'User Badges'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUserBadges ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <span className="text-lg font-medium">{t('common.loading') || 'Loading...'}</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30">
                        <tr className="border-b border-border/50">
                          <th className="text-left p-4 font-semibold">{t('admin.user') || 'User'}</th>
                          <th className="text-left p-4 font-semibold">{t('admin.badge') || 'Badge'}</th>
                          <th className="text-left p-4 font-semibold">{t('admin.type') || 'Type'}</th>
                          <th className="text-left p-4 font-semibold">{t('admin.pointsEarned') || 'Points Earned'}</th>
                          <th className="text-left p-4 font-semibold">{t('admin.earnedAt') || 'Earned At'}</th>
                          <th className="text-left p-4 font-semibold">{t('admin.actions') || 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedUserBadges.map((userBadge) => (
                          <tr key={userBadge.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="p-4">
                              {userBadge.user ? (
                                <div>
                                  <div className="font-medium text-foreground">
                                    {userBadge.user.first_name} {userBadge.user.last_name}
                                  </div>
                                  <div className="text-sm text-muted-foreground font-mono">
                                    {userBadge.user.email}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Unknown User</span>
                              )}
                            </td>
                            <td className="p-4 font-medium">{userBadge.badge.name}</td>
                            <td className="p-4">
                              <Badge className={getBadgeTypeColor(userBadge.badge.type)} variant="outline">
                                {userBadge.badge.type}
                              </Badge>
                            </td>
                            <td className="p-4 font-mono">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {userBadge.points_earned || 0}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {new Date(userBadge.earned_at).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUserBadge(userBadge);
                                    setUserBadgeForm({ points_earned: userBadge.points_earned || 0 });
                                    setShowUserBadgeModal(true);
                                  }}
                                  className="bg-background/50 hover:bg-background/80"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteUserBadge(userBadge.id)}
                                  className="shadow-sm"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {filteredUserBadges.length > itemsPerPage && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(currentPage - 1)}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-muted/50'}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.ceil(filteredUserBadges.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer hover:bg-muted/50"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(currentPage + 1)}
                          className={currentPage === Math.ceil(filteredUserBadges.length / itemsPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-muted/50'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Badge Modal */}
        <Dialog open={showBadgeModal} onOpenChange={setShowBadgeModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                {selectedBadge ? t('admin.editBadge') : t('admin.addBadge')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t('admin.badgeName') || 'Badge Name'}</Label>
                <Input
                  value={badgeForm.name}
                  onChange={(e) => setBadgeForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 bg-background/50 border-border/50"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">{t('admin.badgeDescription') || 'Description'}</Label>
                <Input
                  value={badgeForm.description}
                  onChange={(e) => setBadgeForm(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 bg-background/50 border-border/50"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">{t('admin.badgeType') || 'Type'}</Label>
                <Select value={badgeForm.type} onValueChange={(value) => setBadgeForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="mt-1 bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referral">{t('admin.badgeType.referral') || 'Referral'}</SelectItem>
                    <SelectItem value="deposit">{t('admin.badgeType.deposit') || 'Deposit'}</SelectItem>
                    <SelectItem value="withdrawal">{t('admin.badgeType.withdrawal') || 'Withdrawal'}</SelectItem>
                    <SelectItem value="profile">{t('admin.badgeType.profile') || 'Profile'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">{t('admin.badgeRequirement') || 'Requirement'}</Label>
                <Input
                  type="number"
                  value={badgeForm.requirement}
                  onChange={(e) => setBadgeForm(prev => ({ ...prev, requirement: parseInt(e.target.value) || 0 }))}
                  className="mt-1 bg-background/50 border-border/50"
                  min="0"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBadgeModal(false)}>
                  {t('admin.cancel') || 'Cancel'}
                </Button>
                <Button 
                  onClick={handleBadgeSubmit}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {selectedBadge ? t('admin.update') : t('admin.create')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Badge Modal */}
        <Dialog open={showUserBadgeModal} onOpenChange={setShowUserBadgeModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                {t('admin.editUserBadge') || 'Edit User Badge'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t('admin.pointsEarned') || 'Points Earned'}</Label>
                <Input
                  type="number"
                  value={userBadgeForm.points_earned}
                  onChange={(e) => setUserBadgeForm(prev => ({ ...prev, points_earned: parseInt(e.target.value) || 0 }))}
                  className="mt-1 bg-background/50 border-border/50"
                  min="0"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowUserBadgeModal(false)}>
                  {t('admin.cancel') || 'Cancel'}
                </Button>
                <Button 
                  onClick={handleUserBadgeSubmit}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {t('admin.update') || 'Update'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default GamificationPage; 