import * as React from 'react';
import { Trophy, Award, Plus, Pencil, Trash, User, Search, Filter } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Services
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

interface Badge {
  id: string;
  name: string;
  description: string;
  type: 'achievement' | 'level' | 'special';
  requirement: number;
  points_awarded: number;
  is_active: boolean;
  created_at: string;
}

interface UserInfo {
  user_uid: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  points_earned: number;
  earned_at: string;
  created_at: string;
  updated_at: string;
  badge: Badge;
  user: UserInfo | null;
}

interface Level {
  id: string;
  level: number;
  name: string;
  description: string;
  requirement: number;
  benefits: string;
  created_at: string;
}

// Remove all state and logic related to settings
// Remove the Settings Card section from the JSX
// Do not render or reference settings, fetchSettings, handleUpdateSettings, or related UI
// Only keep the User Badges and other relevant sections

const GamificationPage: FC = () => {
  const { t } = useLanguage();
  const [badges, setBadges] = React.useState<Badge[]>([]);
  const [userBadges, setUserBadges] = React.useState<UserBadge[]>([]);
  const [levels, setLevels] = React.useState<Level[]>([]);
  const [loadingBadges, setLoadingBadges] = React.useState(false);
  const [loadingUserBadges, setLoadingUserBadges] = React.useState(false);
  const [loadingLevels, setLoadingLevels] = React.useState(false);
  const [showBadgeModal, setShowBadgeModal] = React.useState(false);
  const [showLevelModal, setShowLevelModal] = React.useState(false);
  const [selectedBadge, setSelectedBadge] = React.useState<Badge | null>(null);
  const [selectedLevel, setSelectedLevel] = React.useState<Level | null>(null);
  const [badgeForm, setBadgeForm] = React.useState<Omit<Badge, 'id' | 'created_at'>>({
    name: '',
    description: '',
    type: 'achievement',
    requirement: 1,
    points_awarded: 0,
    is_active: true
  });
  const [levelForm, setLevelForm] = React.useState({
    level: 1,
    name: '',
    description: '',
    requirement: 100,
    benefits: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showEditBadgeModal, setShowEditBadgeModal] = useState(false);
  const [selectedUserBadge, setSelectedUserBadge] = useState<UserBadge | null>(null);
  const [editForm, setEditForm] = useState({
    points_earned: 0
  });
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  React.useEffect(() => {
    fetchBadges();
    fetchUserBadges();
    fetchLevels();
  }, []);

  React.useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType]);

  const fetchBadges = async () => {
    try {
      setLoadingBadges(true);
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to fetch badges'),
        variant: 'destructive',
      });
    } finally {
      setLoadingBadges(false);
    }
  };

  const fetchUserBadges = async () => {
    try {
      setLoadingUserBadges(true);
      
      // Fetch all user badges
      const { data: badges, error: badgeError } = await supabase
        .from('user_badges')
        .select('*, badge:badge_id(*)')
        .order('earned_at', { ascending: false });
      if (badgeError) throw badgeError;

      // Fetch all user info
      const { data: users, error: userError } = await supabase
        .from('user_info')
        .select('user_uid, email, first_name, last_name');
      if (userError) throw userError;

      // Merge user info into badges
      const userMap = Object.fromEntries((users || []).map(u => [u.user_uid, u]));
      const badgesWithUser = (badges || []).map(b => ({
        ...b,
        user: userMap[b.user_id] || null
      }));
      
      console.log('Fetched and merged user badges:', badgesWithUser);
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
    }
  };

  const fetchLevels = async () => {
    try {
      setLoadingLevels(true);
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('level', { ascending: true });

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to fetch levels'),
        variant: 'destructive',
      });
    } finally {
      setLoadingLevels(false);
    }
  };

  const handleAddBadge = async () => {
    try {
      const { error } = await supabase
        .from('badges')
        .insert([badgeForm]);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Badge added successfully'),
      });
      setShowBadgeModal(false);
      setBadgeForm({
        name: '',
        description: '',
        type: 'achievement',
        requirement: 1,
        points_awarded: 0,
        is_active: true
      });
      fetchBadges();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to add badge'),
        variant: 'destructive',
      });
    }
  };

  const handleEditBadge = async () => {
    if (!selectedBadge) return;

    try {
      const { error } = await supabase
        .from('badges')
        .update(badgeForm)
        .eq('id', selectedBadge.id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Badge updated successfully'),
      });
      setShowBadgeModal(false);
      setSelectedBadge(null);
      setBadgeForm({
        name: '',
        description: '',
        type: 'achievement',
        requirement: 1,
        points_awarded: 0,
        is_active: true
      });
      fetchBadges();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to update badge'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBadge = async (id: string) => {
    if (!window.confirm(t('Are you sure you want to delete this badge?'))) return;

    try {
      const { error } = await supabase
        .from('badges')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Badge deleted successfully'),
      });
      fetchBadges();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to delete badge'),
        variant: 'destructive',
      });
    }
  };

  const handleAddLevel = async () => {
    try {
      const { error } = await supabase
        .from('levels')
        .insert([levelForm]);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Level added successfully'),
      });
      setShowLevelModal(false);
      setLevelForm({
        level: 1,
        name: '',
        description: '',
        requirement: 100,
        benefits: ''
      });
      fetchLevels();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to add level'),
        variant: 'destructive',
      });
    }
  };

  const handleEditLevel = async () => {
    if (!selectedLevel) return;

    try {
      const { error } = await supabase
        .from('levels')
        .update(levelForm)
        .eq('id', selectedLevel.id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Level updated successfully'),
      });
      setShowLevelModal(false);
      setSelectedLevel(null);
      setLevelForm({
        level: 1,
        name: '',
        description: '',
        requirement: 100,
        benefits: ''
      });
      fetchLevels();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to update level'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLevel = async (id: string) => {
    if (!window.confirm(t('Are you sure you want to delete this level?'))) return;

    try {
      const { error } = await supabase
        .from('levels')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Level deleted successfully'),
      });
      fetchLevels();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to delete level'),
        variant: 'destructive',
      });
    }
  };

  const filteredUserBadges = userBadges.filter(userBadge => {
    const matchesSearch = searchTerm === '' || 
      userBadge.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userBadge.badge?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || userBadge.badge?.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredUserBadges.length / itemsPerPage);
  const paginatedUserBadges = filteredUserBadges.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEditUserBadge = async () => {
    if (!selectedUserBadge) return;

    try {
      const { error } = await supabase
        .from('user_badges')
        .update({
          points_earned: editForm.points_earned
        })
        .eq('id', selectedUserBadge.id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('User badge updated successfully'),
      });

      setShowEditBadgeModal(false);
      fetchUserBadges();
    } catch (error) {
      console.error('Error updating user badge:', error);
      toast({
        title: t('Error'),
        description: t('Failed to update user badge'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUserBadge = async (id: string) => {
    if (!window.confirm(t('Are you sure you want to delete this badge?'))) return;

    try {
      const { error } = await supabase
        .from('user_badges')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('User badge deleted successfully'),
      });

      fetchUserBadges();
    } catch (error) {
      console.error('Error deleting user badge:', error);
      toast({
        title: t('Error'),
        description: t('Failed to delete user badge'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('Gamification')}</h2>
      </div>

      {/* Badges Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('Badges')}</CardTitle>
            <Button onClick={() => setShowBadgeModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('Add Badge')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Name')}</TableHead>
                <TableHead>{t('Type')}</TableHead>
                <TableHead>{t('Points')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead>{t('Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingBadges ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    {t('Loading...')}
                  </TableCell>
                </TableRow>
              ) : badges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    {t('No badges found')}
                  </TableCell>
                </TableRow>
              ) : (
                badges.map((badge) => (
                  <TableRow key={badge.id}>
                    <TableCell>{badge.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {badge.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{badge.points_awarded}</TableCell>
                    <TableCell>
                      <Badge variant={badge.is_active ? 'default' : 'secondary'}>
                        {badge.is_active ? t('Active') : t('Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                              points_awarded: badge.points_awarded,
                              is_active: badge.is_active
                            });
                            setShowBadgeModal(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteBadge(badge.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Levels Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('Levels')}</CardTitle>
            <Button onClick={() => setShowLevelModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('Add Level')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Level')}</TableHead>
                <TableHead>{t('Name')}</TableHead>
                <TableHead>{t('Requirement')}</TableHead>
                <TableHead>{t('Benefits')}</TableHead>
                <TableHead>{t('Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingLevels ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    {t('Loading...')}
                  </TableCell>
                </TableRow>
              ) : levels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    {t('No levels found')}
                  </TableCell>
                </TableRow>
              ) : (
                levels.map((level) => (
                  <TableRow key={level.id}>
                    <TableCell>{level.level}</TableCell>
                    <TableCell>{level.name}</TableCell>
                    <TableCell>{level.requirement} points</TableCell>
                    <TableCell className="max-w-xs truncate" title={level.benefits}>
                      {level.benefits}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLevel(level);
                            setLevelForm({
                              level: level.level,
                              name: level.name,
                              description: level.description,
                              requirement: level.requirement,
                              benefits: level.benefits
                            });
                            setShowLevelModal(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteLevel(level.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('User Badges')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('Search by user email or badge name...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Filter by type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Types')}</SelectItem>
                  <SelectItem value="achievement">{t('Achievement')}</SelectItem>
                  <SelectItem value="profile">{t('Profile')}</SelectItem>
                  <SelectItem value="verification">{t('Verification')}</SelectItem>
                  <SelectItem value="deposit">{t('Deposit')}</SelectItem>
                  <SelectItem value="withdrawal">{t('Withdrawal')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingUserBadges ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('User')}</TableHead>
                    <TableHead>{t('Badge')}</TableHead>
                    <TableHead>{t('Type')}</TableHead>
                    <TableHead>{t('Points Earned')}</TableHead>
                    <TableHead>{t('Earned At')}</TableHead>
                    <TableHead>{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUserBadges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        {t('No user badges found')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUserBadges.map((userBadge) => (
                      <TableRow key={userBadge.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {userBadge.user ? 
                                `${userBadge.user.first_name} ${userBadge.user.last_name}` : 
                                'Unknown User'}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {userBadge.user?.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {userBadge.badge?.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {userBadge.badge?.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{userBadge.points_earned}</TableCell>
                        <TableCell>
                          {userBadge.earned_at
                            ? new Date(userBadge.earned_at).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUserBadge(userBadge);
                                setEditForm({ points_earned: userBadge.points_earned });
                                setShowEditBadgeModal(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUserBadge(userBadge.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Badge Modal */}
      <Dialog open={showBadgeModal} onOpenChange={(open) => {
        if (!open) {
          setShowBadgeModal(false);
          setSelectedBadge(null);
          setBadgeForm({
            name: '',
            description: '',
            type: 'achievement',
            requirement: 1,
            points_awarded: 0,
            is_active: true
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedBadge ? t('Edit Badge') : t('Add New Badge')}
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
              <Textarea
                value={badgeForm.description}
                onChange={(e) => setBadgeForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('Type')}</Label>
              <Select
                value={badgeForm.type}
                onValueChange={(value: 'achievement' | 'level' | 'special') => 
                  setBadgeForm(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('Select type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="achievement">{t('Achievement')}</SelectItem>
                  <SelectItem value="level">{t('Level')}</SelectItem>
                  <SelectItem value="special">{t('Special')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('Requirement')}</Label>
              <Input
                type="number"
                value={badgeForm.requirement}
                onChange={(e) => setBadgeForm(prev => ({ ...prev, requirement: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>{t('Points Awarded')}</Label>
              <Input
                type="number"
                value={badgeForm.points_awarded}
                onChange={(e) => setBadgeForm(prev => ({ ...prev, points_awarded: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={badgeForm.is_active}
                onCheckedChange={(checked) => setBadgeForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>{t('Active')}</Label>
            </div>
            <Button
              onClick={selectedBadge ? handleEditBadge : handleAddBadge}
              disabled={!badgeForm.name || !badgeForm.description}
            >
              {selectedBadge ? t('Update Badge') : t('Add Badge')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Level Modal */}
      <Dialog open={showLevelModal} onOpenChange={(open) => {
        if (!open) {
          setShowLevelModal(false);
          setSelectedLevel(null);
          setLevelForm({
            level: 1,
            name: '',
            description: '',
            requirement: 100,
            benefits: ''
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedLevel ? t('Edit Level') : t('Add New Level')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Level')}</Label>
              <Input
                type="number"
                value={levelForm.level}
                onChange={(e) => setLevelForm(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <Label>{t('Name')}</Label>
              <Input
                value={levelForm.name}
                onChange={(e) => setLevelForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('Description')}</Label>
              <Textarea
                value={levelForm.description}
                onChange={(e) => setLevelForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('Points Required')}</Label>
              <Input
                type="number"
                value={levelForm.requirement}
                onChange={(e) => setLevelForm(prev => ({ ...prev, requirement: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>{t('Benefits')}</Label>
              <Textarea
                value={levelForm.benefits}
                onChange={(e) => setLevelForm(prev => ({ ...prev, benefits: e.target.value }))}
              />
            </div>
            <Button
              onClick={selectedLevel ? handleEditLevel : handleAddLevel}
              disabled={!levelForm.name || !levelForm.description}
            >
              {selectedLevel ? t('Update Level') : t('Add Level')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Badge Modal */}
      <Dialog open={showEditBadgeModal} onOpenChange={setShowEditBadgeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Edit User Badge')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('User')}</Label>
              <div className="mt-1.5 text-sm">
                {selectedUserBadge?.user?.email}
              </div>
            </div>
            <div>
              <Label>{t('Badge')}</Label>
              <div className="mt-1.5 text-sm">
                {selectedUserBadge?.badge?.name}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Points Earned')}</Label>
              <Input
                type="number"
                min="0"
                value={editForm.points_earned}
                onChange={(e) => setEditForm(prev => ({
                  ...prev,
                  points_earned: parseInt(e.target.value) || 0
                }))}
              />
            </div>
            <Button onClick={handleEditUserBadge} className="w-full">
              {t('Save Changes')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                aria-disabled={currentPage === 1}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i + 1}>
                <PaginationLink
                  isActive={currentPage === i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                aria-disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
} 

export default GamificationPage; 