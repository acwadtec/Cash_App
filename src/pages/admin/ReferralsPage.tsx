import { useState, useEffect } from 'react';
import { Gift, Users2, Settings } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Services
import { supabase } from '@/lib/supabase';

interface ReferralSettings {
  level1Points: number;
  level2Points: number;
  level3Points: number;
}

interface TopReferrer {
  id: string;
  name: string;
  email: string;
  referralCount: number;
  totalPoints: number;
}

export default function ReferralsPage() {
  const { t } = useLanguage();
  const [referralSettings, setReferralSettings] = useState<ReferralSettings>({
    level1Points: 100,
    level2Points: 50,
    level3Points: 25
  });
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [loadingReferrers, setLoadingReferrers] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState<ReferralSettings>({
    level1Points: 100,
    level2Points: 50,
    level3Points: 25
  });

  useEffect(() => {
    fetchTopReferrers();
    loadReferralSettings();
  }, []);

  const fetchTopReferrers = async () => {
    try {
      setLoadingReferrers(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, referral_count, total_points')
        .order('referral_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setTopReferrers(data?.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        referralCount: user.referral_count || 0,
        totalPoints: user.total_points || 0
      })) || []);
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to fetch top referrers'),
        variant: 'destructive',
      });
    } finally {
      setLoadingReferrers(false);
    }
  };

  const loadReferralSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('type', 'referral')
        .single();

      if (error) throw error;
      
      if (data) {
        const settings = {
          level1Points: data.level1_points || 100,
          level2Points: data.level2_points || 50,
          level3Points: data.level3_points || 25
        };
        setReferralSettings(settings);
        setSettingsForm(settings);
      }
    } catch (error) {
      console.error('Error loading referral settings:', error);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          type: 'referral',
          level1_points: settingsForm.level1Points,
          level2_points: settingsForm.level2Points,
          level3_points: settingsForm.level3Points
        });

      if (error) throw error;

      setReferralSettings(settingsForm);
      setShowSettingsModal(false);
      toast({
        title: t('Success'),
        description: t('Referral settings updated successfully'),
      });
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to update referral settings'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('Referral System')}</h2>
        <Button onClick={() => setShowSettingsModal(true)}>
          <Settings className="mr-2 h-4 w-4" />
          {t('Settings')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('Level 1 Points')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralSettings.level1Points}</div>
            <p className="text-sm text-muted-foreground">{t('Points for direct referrals')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Level 2 Points')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralSettings.level2Points}</div>
            <p className="text-sm text-muted-foreground">{t('Points for second-level referrals')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Level 3 Points')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralSettings.level3Points}</div>
            <p className="text-sm text-muted-foreground">{t('Points for third-level referrals')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('Top Referrers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Name')}</TableHead>
                <TableHead>{t('Email')}</TableHead>
                <TableHead>{t('Referral Count')}</TableHead>
                <TableHead>{t('Total Points')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingReferrers ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    {t('Loading...')}
                  </TableCell>
                </TableRow>
              ) : topReferrers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    {t('No referrers found')}
                  </TableCell>
                </TableRow>
              ) : (
                topReferrers.map((referrer) => (
                  <TableRow key={referrer.id}>
                    <TableCell>{referrer.name}</TableCell>
                    <TableCell>{referrer.email}</TableCell>
                    <TableCell>
                      <Badge>{referrer.referralCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{referrer.totalPoints}</Badge>
                    </TableCell>
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
            <DialogTitle>{t('Referral Settings')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Level 1 Points')}</Label>
              <Input
                type="number"
                value={settingsForm.level1Points}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, level1Points: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>{t('Level 2 Points')}</Label>
              <Input
                type="number"
                value={settingsForm.level2Points}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, level2Points: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>{t('Level 3 Points')}</Label>
              <Input
                type="number"
                value={settingsForm.level3Points}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, level3Points: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <Button onClick={handleUpdateSettings}>{t('Update Settings')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 