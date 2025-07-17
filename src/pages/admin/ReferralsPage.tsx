import { useState, useEffect } from 'react';
import { Gift, Settings } from 'lucide-react';
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

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold flex items-center gap-2"><Gift className="w-7 h-7 text-primary" />{t('admin.referrals')}</h2>
        <Button onClick={() => setShowSettingsModal(true)} variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          {t('admin.referralSettings')}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.level1Points')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralSettings.level1Points}</div>
            <p className="text-sm text-muted-foreground">{t('admin.level1PointsDesc')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.level2Points')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralSettings.level2Points}</div>
            <p className="text-sm text-muted-foreground">{t('admin.level2PointsDesc')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.level3Points')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralSettings.level3Points}</div>
            <p className="text-sm text-muted-foreground">{t('admin.level3PointsDesc')}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.topReferrers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.name')}</TableHead>
                <TableHead>{t('admin.email')}</TableHead>
                <TableHead>{t('admin.referralCount')}</TableHead>
                <TableHead>{t('admin.totalReferralPoints')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingReferrers ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : topReferrers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    {t('admin.noReferrersFound')}
                  </TableCell>
                </TableRow>
              ) : (
                topReferrers.map((referrer, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{referrer.first_name} {referrer.last_name}</TableCell>
                    <TableCell>{referrer.email}</TableCell>
                    <TableCell><Badge>{referrer.referral_count}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{referrer.total_referral_points}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.referralSettings')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('admin.level1Points')}</Label>
              <Input
                type="number"
                value={settingsForm.level1Points}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, level1Points: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>{t('admin.level2Points')}</Label>
              <Input
                type="number"
                value={settingsForm.level2Points}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, level2Points: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>{t('admin.level3Points')}</Label>
              <Input
                type="number"
                value={settingsForm.level3Points}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, level3Points: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <Button onClick={handleUpdateSettings} className="w-full mt-2">
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 