import { useState, useEffect } from 'react';
import { Trophy, Award, Plus, Pencil, Trash } from 'lucide-react';

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
  points_multiplier: {
    deposit: number;
    referral: number;
    withdrawal: number;
  };
  badge_auto_award: boolean;
  level_auto_update: boolean;
}

export default function GamificationPage() {
  const { t } = useLanguage();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [settings, setSettings] = useState<GamificationSettings>({
    points_multiplier: {
      deposit: 1,
      referral: 1,
      withdrawal: 1
    },
    badge_auto_award: true,
    level_auto_update: true
  });
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [badgeForm, setBadgeForm] = useState({
    name: '',
    description: '',
    type: 'achievement' as const,
    requirement: 1,
    points_awarded: 0,
    is_active: true
  });
  const [levelForm, setLevelForm] = useState({
    level: 1,
    name: '',
    description: '',
    requirement: 100,
    benefits: ''
  });

  useEffect(() => {
    fetchBadges();
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
      const { data, error } = await supabase
        .from('gamification_settings')
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        setSettings(data);
      }
    } catch (error) {
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
        .upsert([settings]);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Settings updated successfully'),
      });
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to update settings'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('Gamification')}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Settings')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>{t('Points Multipliers')}</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div>
                    <Label>{t('Deposit')}</Label>
                    <Input
                      type="number"
                      value={settings.points_multiplier.deposit}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        points_multiplier: {
                          ...prev.points_multiplier,
                          deposit: parseFloat(e.target.value) || 0
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>{t('Referral')}</Label>
                    <Input
                      type="number"
                      value={settings.points_multiplier.referral}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        points_multiplier: {
                          ...prev.points_multiplier,
                          referral: parseFloat(e.target.value) || 0
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>{t('Withdrawal')}</Label>
                    <Input
                      type="number"
                      value={settings.points_multiplier.withdrawal}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        points_multiplier: {
                          ...prev.points_multiplier,
                          withdrawal: parseFloat(e.target.value) || 0
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.badge_auto_award}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    badge_auto_award: checked
                  }))}
                />
                <Label>{t('Auto Award Badges')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.level_auto_update}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    level_auto_update: checked
                  }))}
                />
                <Label>{t('Auto Update Levels')}</Label>
              </div>
              <Button onClick={handleUpdateSettings}>{t('Save Settings')}</Button>
            </div>
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
      </div>

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