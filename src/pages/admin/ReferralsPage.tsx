import { useState, useEffect } from 'react';
import { Gift, Settings, Users, Trophy, Star, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export default function ReferralsPage() {
  const { t } = useLanguage();
  const [referralSettings, setReferralSettings] = useState({
    level1Points: 100,
    level2Points: 50,
    level3Points: 25
  });
  const [topReferrers, setTopReferrers] = useState([]);
  const [loadingReferrers, setLoadingReferrers] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    level1Points: 100,
    level2Points: 50,
    level3Points: 25
  });

  useEffect(() => {
    loadReferralSettings();
    fetchTopReferrers();
  }, []);

  const fetchTopReferrers = async () => {
    setLoadingReferrers(true);
    try {
      const { data, error } = await supabase
        .from('user_info')
        .select('first_name, last_name, email, referral_count, total_referral_points')
        .not('referral_count', 'is', null)
        .order('total_referral_points', { ascending: false })
        .limit(10);
      if (error) {
        toast({ title: t('common.error'), description: t('admin.failedToFetchReferrers'), variant: 'destructive' });
        setTopReferrers([]);
      } else {
        setTopReferrers(data || []);
      }
    } catch (error) {
      toast({ title: t('common.error'), description: t('admin.failedToFetchReferrers'), variant: 'destructive' });
      setTopReferrers([]);
    } finally {
      setLoadingReferrers(false);
    }
  };

  const loadReferralSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (error) {
        setReferralSettings({ level1Points: 100, level2Points: 50, level3Points: 25 });
        setSettingsForm({ level1Points: 100, level2Points: 50, level3Points: 25 });
      } else if (data) {
        setReferralSettings({
          level1Points: data.level1_points || 100,
          level2Points: data.level2_points || 50,
          level3Points: data.level3_points || 25
        });
        setSettingsForm({
          level1Points: data.level1_points || 100,
          level2Points: data.level2_points || 50,
          level3Points: data.level3_points || 25
        });
      }
    } catch (error) {
      setReferralSettings({ level1Points: 100, level2Points: 50, level3Points: 25 });
      setSettingsForm({ level1Points: 100, level2Points: 50, level3Points: 25 });
    }
  };

  const handleUpdateSettings = async () => {
    const { error } = await supabase
      .from('referral_settings')
      .upsert([{
        id: 1,
        level1_points: settingsForm.level1Points,
        level2_points: settingsForm.level2Points,
        level3_points: settingsForm.level3Points,
        updated_at: new Date().toISOString()
      }]);
    if (error) {
      toast({ title: t('common.error'), description: t('admin.failedToUpdateReferralSettings'), variant: 'destructive' });
    } else {
      setReferralSettings(settingsForm);
      setShowSettingsModal(false);
      toast({ title: t('common.success'), description: t('admin.referralSettingsUpdated') });
    }
  };

  const handleRefresh = () => {
    fetchTopReferrers();
    loadReferralSettings();
  };

  // Calculate total referrals and points
  const totalReferrals = topReferrers.reduce((sum, referrer) => sum + (referrer.referral_count || 0), 0);
  const totalPoints = topReferrers.reduce((sum, referrer) => sum + (referrer.total_referral_points || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('admin.referrals') || 'Referrals'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage referral system and track top referrers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="bg-background/50 hover:bg-background/80"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('common.refresh') || 'Refresh'}
            </Button>
            <Button 
              onClick={() => setShowSettingsModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Settings className="w-4 h-4 mr-2" />
              {t('admin.referralSettings') || 'Settings'}
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Referrals</p>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {totalReferrals}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                  <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Points</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {totalPoints.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                  <Star className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Top Referrers</p>
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    {topReferrers.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                  <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Avg Points</p>
                  <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                    {topReferrers.length > 0 ? Math.round(totalPoints / topReferrers.length) : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Settings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Star className="w-4 h-4 text-primary" />
                </div>
                {t('admin.level1Points') || 'Level 1 Points'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">{referralSettings.level1Points}</div>
              <p className="text-sm text-muted-foreground">{t('admin.level1PointsDesc') || 'Direct referrals'}</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Star className="w-4 h-4 text-primary" />
                </div>
                {t('admin.level2Points') || 'Level 2 Points'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">{referralSettings.level2Points}</div>
              <p className="text-sm text-muted-foreground">{t('admin.level2PointsDesc') || 'Second level referrals'}</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Star className="w-4 h-4 text-primary" />
                </div>
                {t('admin.level3Points') || 'Level 3 Points'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">{referralSettings.level3Points}</div>
              <p className="text-sm text-muted-foreground">{t('admin.level3PointsDesc') || 'Third level referrals'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Referrers Table */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              {t('admin.topReferrers') || 'Top Referrers'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingReferrers ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <span className="text-lg font-medium">{t('common.loading') || 'Loading...'}</span>
              </div>
            ) : topReferrers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <Trophy className="w-12 h-12 opacity-50" />
                </div>
                <span className="text-lg font-medium mb-2">{t('admin.noReferrersFound') || 'No referrers found'}</span>
                <span className="text-sm text-center max-w-md">
                  No users have made referrals yet. Encourage users to invite friends!
                </span>
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-semibold">Rank</TableHead>
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Referrals</TableHead>
                        <TableHead className="font-semibold">Total Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topReferrers.map((referrer, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {idx === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                              {idx === 1 && <Trophy className="w-4 h-4 text-gray-400" />}
                              {idx === 2 && <Trophy className="w-4 h-4 text-orange-600" />}
                              <span className="font-medium">#{idx + 1}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {referrer.first_name} {referrer.last_name}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {referrer.email}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              {referrer.referral_count || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              {referrer.total_referral_points?.toLocaleString() || 0}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Modal */}
        <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                {t('admin.referralSettings') || 'Referral Settings'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t('admin.level1Points') || 'Level 1 Points'}</Label>
                <Input
                  type="number"
                  value={settingsForm.level1Points}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, level1Points: parseInt(e.target.value) || 0 }))}
                  className="mt-1 bg-background/50 border-border/50"
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('admin.level1PointsDesc') || 'Points for direct referrals'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">{t('admin.level2Points') || 'Level 2 Points'}</Label>
                <Input
                  type="number"
                  value={settingsForm.level2Points}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, level2Points: parseInt(e.target.value) || 0 }))}
                  className="mt-1 bg-background/50 border-border/50"
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('admin.level2PointsDesc') || 'Points for second level referrals'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">{t('admin.level3Points') || 'Level 3 Points'}</Label>
                <Input
                  type="number"
                  value={settingsForm.level3Points}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, level3Points: parseInt(e.target.value) || 0 }))}
                  className="mt-1 bg-background/50 border-border/50"
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('admin.level3PointsDesc') || 'Points for third level referrals'}
                </p>
              </div>
              <Button 
                onClick={handleUpdateSettings}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {t('common.save') || 'Save Settings'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 