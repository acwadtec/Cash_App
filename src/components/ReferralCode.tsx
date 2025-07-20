import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Copy, Share2, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReferralCodeProps {
  userUid: string;
  isVerified: boolean;
  level1Count?: number;
  level2Count?: number;
  level3Count?: number;
}

export default function ReferralCode({ userUid, isVerified, level1Count = 0, level2Count = 0, level3Count = 0 }: ReferralCodeProps) {
  const { t } = useLanguage();
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    totalPoints: 0,
    level1Referrals: 0,
    level2Referrals: 0,
    level3Referrals: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userUid && isVerified) {
      loadReferralData();
    }
  }, [userUid, isVerified]);

  const loadReferralData = async () => {
    setLoading(true);
    try {
      // Get user's referral code
      const { data: userData, error: userError } = await supabase
        .from('user_info')
        .select('referral_code, referral_count, total_referral_points')
        .eq('user_uid', userUid)
        .single();

      if (userError) throw userError;

      if (userData?.referral_code) {
        setReferralCode(userData.referral_code);
      } else {
        // Generate referral code if not exists
        await generateReferralCode();
      }

      // Get referral statistics
      const { data: statsData, error: statsError } = await supabase
        .from('referrals')
        .select('level, points_earned')
        .eq('referrer_uid', userUid);

      if (!statsError && statsData) {
        const stats = {
          totalReferrals: userData?.referral_count || 0,
          totalPoints: userData?.total_referral_points || 0,
          level1Referrals: statsData.filter(r => r.level === 1).length,
          level2Referrals: statsData.filter(r => r.level === 2).length,
          level3Referrals: statsData.filter(r => r.level === 3).length
        };
        setReferralStats(stats);
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async () => {
    try {
      // Generate a unique 8-character code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { error } = await supabase
        .from('user_info')
        .update({ referral_code: code })
        .eq('user_uid', userUid);

      if (error) throw error;
      
      setReferralCode(code);
      toast({ title: 'Success', description: 'Referral code generated successfully!' });
    } catch (error) {
      console.error('Error generating referral code:', error);
      toast({ title: 'Error', description: 'Failed to generate referral code', variant: 'destructive' });
    }
  };

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      toast({ title: 'Copied!', description: 'Referral code copied to clipboard' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to copy referral code', variant: 'destructive' });
    }
  };

  const shareReferralCode = async () => {
    const shareText = `Join me on Cash App! Use my referral code: ${referralCode}`;
    const shareUrl = `${window.location.origin}/register?ref=${referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Cash App',
          text: shareText,
          url: shareUrl
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to copying
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast({ title: 'Shared!', description: 'Referral link copied to clipboard' });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to share referral code', variant: 'destructive' });
      }
    }
  };

  const totalReferrals = level1Count + level2Count + level3Count;

  if (!isVerified) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {t('referral.program')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Badge variant="outline" className="mb-4">{t('referral.accountVerificationRequired')}</Badge>
            <p className="text-muted-foreground">
              {t('referral.verifyToAccess')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {t('referral.program')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          {t('referral.yourProgram')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Code */}
        <div>
          <label className="text-sm font-medium mb-2 block">{t('referral.yourCode')}</label>
          <div className="flex gap-2">
            <Input
              value={referralCode}
              readOnly
              className="font-mono text-lg"
            />
            <Button onClick={copyReferralCode} variant="outline" size="icon">
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={shareReferralCode} variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Referral Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{totalReferrals}</div>
            <div className="text-sm text-muted-foreground">{t('referral.totalReferrals')}</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{referralStats.totalPoints}</div>
            <div className="text-sm text-muted-foreground">{t('referral.pointsEarned')}</div>
          </div>
        </div>

        {/* Referral Rewards Info */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">{t('referral.howItWorks')}</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>• <strong>{t('referral.howItWorks.level1')}</strong></div>
            <div>• <strong>{t('referral.howItWorks.level2')}</strong></div>
            <div>• <strong>{t('referral.howItWorks.level3')}</strong></div>
            <div>• {t('referral.howItWorks.share')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 