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
import { Search, Filter, Edit, Save, X, Plus, Trash2 } from 'lucide-react';
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
        title: t('Error'),
        description: t('Failed to fetch badges'),
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
        title: t('Error'),
        description: t('Failed to fetch user badges'),
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
        title: t('Error'),
        description: t('Failed to fetch levels'),
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
        toast({ title: t('Success'), description: t('Badge updated successfully') });
      } else {
        // Create new badge
        const { error } = await supabase
          .from('badges')
          .insert([badgeForm]);

        if (error) throw error;
        toast({ title: t('Success'), description: t('Badge created successfully') });
      }

      setShowBadgeModal(false);
      setSelectedBadge(null);
      setBadgeForm({ name: '', description: '', type: '', requirement: 0, active: true });
      clearCache('badges');
      fetchBadges();
    } catch (error) {
      console.error('Error saving badge:', error);
      toast({
        title: t('Error'),
        description: t('Failed to save badge'),
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

      toast({ title: t('Success'), description: t('User badge updated successfully') });
      setShowUserBadgeModal(false);
      setSelectedUserBadge(null);
      setUserBadgeForm({ points_earned: 0 });
    } catch (error) {
      console.error('Error updating user badge:', error);
      toast({
        title: t('Error'),
        description: t('Failed to update user badge'),
        variant: 'destructive',
      });
    }
  };

  // Handle badge deletion
  const handleDeleteBadge = async (badgeId: string) => {
    if (!confirm(t('Are you sure you want to delete this badge?'))) return;

    try {
      const { error } = await supabase
        .from('badges')
        .delete()
        .eq('id', badgeId);

      if (error) throw error;

      toast({ title: t('Success'), description: t('Badge deleted successfully') });
      clearCache('badges');
      fetchBadges();
    } catch (error) {
      console.error('Error deleting badge:', error);
      toast({
        title: t('Error'),
        description: t('Failed to delete badge'),
        variant: 'destructive',
      });
    }
  };

  // Handle user badge deletion
  const handleDeleteUserBadge = async (userBadgeId: string) => {
    if (!confirm(t('Are you sure you want to delete this user badge?'))) return;

    try {
      const { error } = await supabase
        .from('user_badges')
        .delete()
        .eq('id', userBadgeId);

      if (error) throw error;

      // Update local state
      setUserBadges(prev => prev.filter(ub => ub.id !== userBadgeId));

      toast({ title: t('Success'), description: t('User badge deleted successfully') });
    } catch (error) {
      console.error('Error deleting user badge:', error);
      toast({
        title: t('Error'),
        description: t('Failed to delete user badge'),
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('Gamification')}</h1>
        <Button onClick={handleRefresh}>
          {t('Refresh')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('Filters')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('Search badges...')}
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('Type')}</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Types')}</SelectItem>
                  <SelectItem value="referral">{t('Referral')}</SelectItem>
                  <SelectItem value="deposit">{t('Deposit')}</SelectItem>
                  <SelectItem value="withdrawal">{t('Withdrawal')}</SelectItem>
                  <SelectItem value="profile">{t('Profile')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('Badges')}</CardTitle>
          <Button onClick={() => setShowBadgeModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('Add Badge')}
          </Button>
        </CardHeader>
        <CardContent>
          {loadingBadges ? (
            <div className="text-center py-8">{t('Loading...')}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedBadges.map((badge) => (
                  <Card key={badge.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant={badge.active ? "default" : "secondary"}>
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
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteBadge(badge.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold mb-1">{badge.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{badge.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Requirement: {badge.requirement}
                    </p>
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
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.ceil(filteredBadges.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(currentPage + 1)}
                        className={currentPage === Math.ceil(filteredBadges.length / itemsPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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
      <Card>
        <CardHeader>
          <CardTitle>{t('Levels')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLevels ? (
            <div className="text-center py-8">{t('Loading...')}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {levels.map((level) => (
                <Card key={level.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={level.active ? "default" : "secondary"}>
                      Level {level.level}
                    </Badge>
                  </div>
                  <h3 className="font-semibold mb-1">{level.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Requirement: {level.requirement}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('User Badges')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUserBadges ? (
            <div className="text-center py-8">{t('Loading...')}</div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">{t('User')}</th>
                      <th className="text-left p-2">{t('Badge')}</th>
                      <th className="text-left p-2">{t('Type')}</th>
                      <th className="text-left p-2">{t('Points Earned')}</th>
                      <th className="text-left p-2">{t('Earned At')}</th>
                      <th className="text-left p-2">{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUserBadges.map((userBadge) => (
                      <tr key={userBadge.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          {userBadge.user ? (
                            <div>
                              <div className="font-medium">
                                {userBadge.user.first_name} {userBadge.user.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {userBadge.user.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unknown User</span>
                          )}
                        </td>
                        <td className="p-2">{userBadge.badge.name}</td>
                        <td className="p-2">
                          <Badge variant="outline">{userBadge.badge.type}</Badge>
                        </td>
                        <td className="p-2">{userBadge.points_earned || 0}</td>
                        <td className="p-2">
                          {new Date(userBadge.earned_at).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUserBadge(userBadge);
                                setUserBadgeForm({ points_earned: userBadge.points_earned || 0 });
                                setShowUserBadgeModal(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUserBadge(userBadge.id)}
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

              {/* Pagination */}
              {filteredUserBadges.length > itemsPerPage && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(currentPage - 1)}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.ceil(filteredUserBadges.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(currentPage + 1)}
                        className={currentPage === Math.ceil(filteredUserBadges.length / itemsPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedBadge ? t('Edit Badge') : t('Add Badge')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Name')}</Label>
              <Input
                value={badgeForm.name}
                onChange={(e) => setBadgeForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('Description')}</Label>
              <Input
                value={badgeForm.description}
                onChange={(e) => setBadgeForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('Type')}</Label>
              <Select value={badgeForm.type} onValueChange={(value) => setBadgeForm(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referral">{t('Referral')}</SelectItem>
                  <SelectItem value="deposit">{t('Deposit')}</SelectItem>
                  <SelectItem value="withdrawal">{t('Withdrawal')}</SelectItem>
                  <SelectItem value="profile">{t('Profile')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('Requirement')}</Label>
              <Input
                type="number"
                value={badgeForm.requirement}
                onChange={(e) => setBadgeForm(prev => ({ ...prev, requirement: parseInt(e.target.value) }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBadgeModal(false)}>
                {t('Cancel')}
              </Button>
              <Button onClick={handleBadgeSubmit}>
                {selectedBadge ? t('Update') : t('Create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Badge Modal */}
      <Dialog open={showUserBadgeModal} onOpenChange={setShowUserBadgeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Edit User Badge')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Points Earned')}</Label>
              <Input
                type="number"
                value={userBadgeForm.points_earned}
                onChange={(e) => setUserBadgeForm(prev => ({ ...prev, points_earned: parseInt(e.target.value) }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUserBadgeModal(false)}>
                {t('Cancel')}
              </Button>
              <Button onClick={handleUserBadgeSubmit}>
                {t('Update')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GamificationPage; 