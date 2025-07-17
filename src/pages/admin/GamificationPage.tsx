import * as React from 'react';
import type { FC } from 'react';
import { Trophy, Award, Plus, Pencil, Trash, User } from 'lucide-react';

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

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Services
import { supabase } from '@/lib/supabase';

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

interface GamificationSettings {
  id?: string;
  points_multiplier_deposit: number;
  points_multiplier_referral: number;
  points_multiplier_withdrawal: number;
  badge_auto_award: boolean;
  level_auto_update: boolean;
  created_at?: string;
  updated_at?: string;
}

const GamificationPage: FC = () => {
  const { t } = useLanguage();
  const [badges, setBadges] = React.useState<Badge[]>([]);
  const [userBadges, setUserBadges] = React.useState<UserBadge[]>([]);
  const [levels, setLevels] = React.useState<Level[]>([]);
  const [settings, setSettings] = React.useState<GamificationSettings>({
    points_multiplier_deposit: 1,
    points_multiplier_referral: 1,
    points_multiplier_withdrawal: 1,
    badge_auto_award: true,
    level_auto_update: true
  });
  const [loadingBadges, setLoadingBadges] = React.useState(false);
  const [loadingUserBadges, setLoadingUserBadges] = React.useState(false);
  const [loadingLevels, setLoadingLevels] = React.useState(false);
  const [loadingSettings, setLoadingSettings] = React.useState(false);
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

  React.useEffect(() => {
    fetchBadges();
    fetchUserBadges();
    fetchLevels();
    fetchSettings();
  }, []);

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

  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      console.log('Fetching gamification settings...');
      
      const { data, error } = await supabase
        .from('gamification_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, create default settings
          const defaultSettings: Omit<GamificationSettings, 'id' | 'created_at' | 'updated_at'> = {
            points_multiplier_deposit: 1,
            points_multiplier_referral: 1,
            points_multiplier_withdrawal: 1,
            badge_auto_award: true,
            level_auto_update: true
          };

          const { data: newSettings, error: insertError } = await supabase
            .from('gamification_settings')
            .insert([defaultSettings])
            .select()
            .single();

          if (insertError) throw insertError;
          console.log('Created default settings:', newSettings);
          setSettings(newSettings);
        } else {
          throw error;
        }
      } else {
        console.log('Fetched settings:', data);
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching gamification settings:', error);
      toast({
        title: t('Error'),
        description: t('Failed to fetch gamification settings'),
        variant: 'destructive',
      });
    } finally {
      setLoadingSettings(false);
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

  const handleUpdateSettings = async () => {
    try {
      const { error } = await supabase
        .from('gamification_settings')
        .update({
          points_multiplier_deposit: settings.points_multiplier_deposit,
          points_multiplier_referral: settings.points_multiplier_referral,
          points_multiplier_withdrawal: settings.points_multiplier_withdrawal,
          badge_auto_award: settings.badge_auto_award,
          level_auto_update: settings.level_auto_update
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Settings updated successfully'),
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: t('Error'),
        description: t('Failed to update settings'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('Gamification')}</h2>
      </div>

      {/* User Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('User Badges')}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userBadges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        {t('No user badges found')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    userBadges.map((userBadge) => (
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
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {userBadge.badge?.name}
                            </span>
                          </div>
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {t('Settings')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSettings ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">{t('Points Multipliers')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t('Deposit')}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={settings.points_multiplier_deposit}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        points_multiplier_deposit: parseFloat(e.target.value) || 0
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Referral')}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={settings.points_multiplier_referral}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        points_multiplier_referral: parseFloat(e.target.value) || 0
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Withdrawal')}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={settings.points_multiplier_withdrawal}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        points_multiplier_withdrawal: parseFloat(e.target.value) || 0
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t('Auto Award Badges')}</Label>
                  <Switch
                    checked={settings.badge_auto_award}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      badge_auto_award: checked
                    }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t('Auto Update Levels')}</Label>
                  <Switch
                    checked={settings.level_auto_update}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      level_auto_update: checked
                    }))}
                  />
                </div>
              </div>

              <Button onClick={handleUpdateSettings} className="w-full">
                {t('Save Settings')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
} 