import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Gift, Users, Star } from 'lucide-react';
import { Dialog as ConfirmDialog, DialogContent as ConfirmDialogContent, DialogHeader as ConfirmDialogHeader, DialogTitle as ConfirmDialogTitle } from '@/components/ui/dialog';

interface InvestmentCertificate {
  id: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  invested_amount: number;
  profit_rate: number;
  profit_duration_months: number;
  next_profit_date: string;
  join_limit?: number | null;
  user_join_limit?: number | null;
  image_url?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface UserJoin {
  id: string;
  user_id: string;
  certificate_id: string;
  invested_amount: number;
  join_date: string;
  next_profit_date: string;
  status: string;
}

export default function InvestmentCertificate() {
  const { t, isRTL, language } = useLanguage();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<InvestmentCertificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userJoins, setUserJoins] = useState<{ [certificateId: string]: UserJoin }>({});
  const [showAlert, setShowAlert] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingCertificate, setPendingCertificate] = useState<InvestmentCertificate | null>(null);
  const [joinAmount, setJoinAmount] = useState('');
  const [joining, setJoining] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [pendingWithdraw, setPendingWithdraw] = useState<UserJoin | null>(null);
  
  // Add state for balance selection modal
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [pendingCertificateId, setPendingCertificateId] = useState<string | null>(null);
  const [userBalances, setUserBalances] = useState<{ balance: number; bonuses: number; team_earnings: number; total_points: number } | null>(null);
  const [showUserConfirm, setShowUserConfirm] = useState(false);
  const [pendingUserJoin, setPendingUserJoin] = useState<null | (() => void)>(null);
  const [pendingBalanceType, setPendingBalanceType] = useState<string | null>(null);
  const [amountWarning, setAmountWarning] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);

  // Fetch user balances on mount
  useEffect(() => {
    const fetchBalances = async () => {
      const { data, error } = await supabase
        .from('user_info')
        .select('balance, bonuses, team_earnings, total_points')
        .eq('user_uid', userId)
        .single();
      if (!error && data) {
        setUserBalances({
          balance: data.balance ?? 0,
          bonuses: data.bonuses ?? 0,
          team_earnings: data.team_earnings ?? 0,
          total_points: data.total_points ?? 0,
        });
      }
    };
    if (userId) fetchBalances();
  }, [userId]);

  useEffect(() => {
    const fetchCertificates = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('investment_certificates')
        .select('*')
        .eq('active', true);
      setCertificates(data || []);
      setLoading(false);
    };
    fetchCertificates();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchJoins = async () => {
      const { data } = await supabase
        .from('investment_certificate_joins')
        .select('*')
        .eq('user_id', userId);
      const joinMap: { [certificateId: string]: UserJoin } = {};
      (data || []).forEach((j: UserJoin) => {
        joinMap[j.certificate_id] = j;
      });
      setUserJoins(joinMap);
    };
    fetchJoins();
  }, [userId]);

  const handleJoin = (certificate: InvestmentCertificate) => {
    setPendingCertificateId(certificate.id);
    setPendingCertificate(certificate);
    setJoinAmount(certificate.invested_amount.toString());
    setShowBalanceModal(true);
    setAmountWarning(null);
  };

  const checkAmountWarning = (amount: string) => {
    if (!userBalances || !amount || isNaN(Number(amount))) {
      setAmountWarning(null);
      return;
    }

    const numAmount = Number(amount);
    const warnings = [];

    if (numAmount > userBalances.balance) {
      warnings.push(t('profile.balance') || 'Balance');
    }
    if (numAmount > userBalances.total_points) {
      warnings.push(t('profile.totalPoints') || 'Total Points');
    }
    if (numAmount > userBalances.bonuses) {
      warnings.push(t('profile.bonuses') || 'Bonuses');
    }
    if (numAmount > userBalances.team_earnings) {
      warnings.push(t('profile.teamEarnings') || 'Team Earnings');
    }

    if (warnings.length > 0) {
      setAmountWarning(t('investment.amountExceedsWarning') || `Amount exceeds available ${warnings.join(', ')}`);
    } else {
      setAmountWarning(null);
    }
  };

  // Add function to handle balance selection and join
  const handleSelectBalanceType = (type: 'balance' | 'bonuses' | 'team_earnings' | 'total_points') => {
    setPendingBalanceType(type);
    setShowUserConfirm(true);
    setPendingUserJoin(() => () => doJoinWithBalanceType(type));
  };

  // Move the actual join logic to a new function
  type BalanceType = 'balance' | 'bonuses' | 'team_earnings' | 'total_points';
  const doJoinWithBalanceType = async (type: BalanceType) => {
    setShowUserConfirm(false);
    if (!pendingCertificateId || !pendingCertificate || !userBalances || !userId) return;
    
    const investmentAmount = Number(joinAmount);
    if (investmentAmount <= 0) {
      toast({ title: t('common.error'), description: t('error.invalidAmount'), variant: 'destructive' });
      setShowBalanceModal(false);
      return;
    }

    // Check if user has sufficient balance
    if (userBalances[type] < investmentAmount) {
      toast({ title: t('common.error'), description: t('error.insufficientBalance'), variant: 'destructive' });
      setShowBalanceModal(false);
      return;
    }

    setJoining(true);
    
    // Subtract investment amount from selected balance
    const newBalances = { ...userBalances, [type]: userBalances[type] - investmentAmount };
    const { error: updateError } = await supabase
      .from('user_info')
      .update({ [type]: newBalances[type] })
      .eq('user_uid', userId);
    
    if (updateError) {
      toast({ title: t('common.error'), description: t('error.failedToUpdateBalance'), variant: 'destructive' });
      setJoining(false);
      setShowBalanceModal(false);
      return;
    }

    // Log transaction for investment
    await supabase.from('transactions').insert({
      user_id: userId,
      type: `${type}_investment`,
      amount: investmentAmount,
      status: 'completed',
      description: t('investment.certificateInvestment') || 'Investment Certificate Investment',
      created_at: new Date().toISOString(),
    });

    // Create investment join record
    const now = new Date();
    const joinDate = now.toISOString();
    const nextProfitDate = new Date(now.setMonth(now.getMonth() + (pendingCertificate.profit_duration_months || 6))).toISOString();
    
    const { error } = await supabase.from('investment_certificate_joins').insert({
      user_id: userId,
      certificate_id: pendingCertificateId,
      invested_amount: investmentAmount,
      join_date: joinDate,
      next_profit_date: nextProfitDate,
      status: 'pending',
    });

    setJoining(false);
    setShowBalanceModal(false);
    
    if (!error) {
      toast({ title: t('common.success'), description: t('investment.joinRequestPending') || 'Join request submitted. Pending approval.' });
      setUserJoins((prev) => ({ ...prev, [pendingCertificateId]: {
        id: '', user_id: userId, certificate_id: pendingCertificateId, invested_amount: investmentAmount, join_date: joinDate, next_profit_date: nextProfitDate, status: 'pending'
      }}));
      // Update local balances
      setUserBalances(newBalances);
    } else {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
    
    setPendingCertificateId(null);
    setPendingCertificate(null);
    setJoinAmount('');
  };

  const handleJoinSubmit = async () => {
    if (!userId || !pendingCertificate) return;
    setJoining(true);
    const now = new Date();
    const joinDate = now.toISOString();
    const nextProfitDate = new Date(now.setMonth(now.getMonth() + (pendingCertificate.profit_duration_months || 6))).toISOString();
    const { error } = await supabase.from('investment_certificate_joins').insert({
      user_id: userId,
      certificate_id: pendingCertificate.id,
      invested_amount: Number(joinAmount),
      join_date: joinDate,
      next_profit_date: nextProfitDate,
      status: 'pending',
    });
    setJoining(false);
    setShowJoinModal(false);
    if (!error) {
      toast({ title: 'Success', description: 'Join request submitted. Pending approval.' });
      setUserJoins((prev) => ({ ...prev, [pendingCertificate.id]: {
        id: '', user_id: userId, certificate_id: pendingCertificate.id, invested_amount: Number(joinAmount), join_date: joinDate, next_profit_date: nextProfitDate, status: 'pending'
      }}));
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleWithdraw = (join: UserJoin) => {
    setPendingWithdraw(join);
    setShowWithdrawConfirm(true);
  };

  const confirmWithdraw = async () => {
    if (!pendingWithdraw) return;
    await supabase.from('investment_certificate_joins').update({ status: 'withdrawn' }).eq('id', pendingWithdraw.id);
    setShowWithdrawConfirm(false);
    setUserJoins((prev) => {
      const copy = { ...prev };
      delete copy[pendingWithdraw.certificate_id];
      return copy;
    });
    toast({ title: 'Withdrawn', description: 'You have withdrawn from this certificate.' });
  };

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString();
  }
  function getCountdown(date: string) {
    const now = new Date();
    const target = new Date(date);
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return t('investment.payoutDue');
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const remDays = days % 30;
    return `${months > 0 ? months + ' months ' : ''}${remDays} days`;
  }

  return (
    <div className={`min-h-screen py-20 ${isRTL ? 'rtl' : 'ltr'} bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
      <div className="container mx-auto px-4 relative">
        <div className="max-w-6xl mx-auto">
          {/* Enhanced Header */}
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('investment.title') || 'Investment Certificates'}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Grow your wealth with our exclusive investment opportunities
            </p>
          </div>
          
          {loading ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              </div>
              <p className="text-xl text-muted-foreground font-medium">
                {t('common.loading')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {certificates.map((cert) => {
                const join = userJoins[cert.id];
                return (
                  <Card key={cert.id} className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden group hover:scale-105 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardHeader className="relative">
                      <div className="flex justify-between items-center mb-4">
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                          {language === 'ar' ? (cert.title_ar || cert.title_en) : (cert.title_en || cert.title_ar)}
                        </CardTitle>
                        <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                          {cert.invested_amount} EGP
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      {cert.image_url && (
                        <div className="mb-6 rounded-xl overflow-hidden border border-primary/20">
                          <img
                            src={cert.image_url}
                            alt={language === 'ar' ? (cert.title_ar || cert.title_en) : (cert.title_en || cert.title_ar)}
                            className="w-full h-48 object-contain bg-gradient-to-r from-primary/5 to-transparent p-4 group-hover:scale-105 transition-transform duration-300"
                            onError={e => e.currentTarget.src = '/placeholder.svg'}
                          />
                        </div>
                      )}
                      <p className="text-muted-foreground mb-6 leading-relaxed text-lg">
                        {language === 'ar' ? (cert.description_ar || cert.description_en) : (cert.description_en || cert.description_ar)}
                      </p>
                      <div className="space-y-3 mb-8 text-base">
                        <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/10">
                          <span className="text-muted-foreground font-medium">{t('investment.investmentAmount') || 'Investment Amount'}:</span>
                          <span className="font-bold text-primary">{cert.invested_amount} EGP</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-green-500/5 to-green-600/5 border border-green-500/10">
                          <span className="text-muted-foreground font-medium">{t('investment.profitRate') || 'Profit Rate'}:</span>
                          <span className="font-bold text-green-600">{cert.profit_rate}%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-blue-500/5 to-blue-600/5 border border-blue-500/10">
                          <span className="text-muted-foreground font-medium">{t('investment.profitDuration') || 'Profit Duration'}:</span>
                          <span className="font-bold text-blue-600">{cert.profit_duration_months || 6} {t('investment.months') || 'months'}</span>
                        </div>
                        {join && (
                          <>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-purple-500/5 to-purple-600/5 border border-purple-500/10">
                              <span className="text-muted-foreground font-medium">{t('investment.joinDate') || 'Join Date'}:</span>
                              <span className="font-bold text-purple-600">{formatDate(join.join_date)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-yellow-500/5 to-yellow-600/5 border border-yellow-500/10">
                              <span className="text-muted-foreground font-medium">{t('investment.nextProfitDate') || 'Next Profit Date'}:</span>
                              <span className="font-bold text-yellow-600">{formatDate(join.next_profit_date)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-orange-500/5 to-orange-600/5 border border-orange-500/10">
                              <span className="text-muted-foreground font-medium">{t('investment.nextProfitDueIn') || 'Next Profit Due In'}:</span>
                              <span className="font-bold text-orange-600">{getCountdown(join.next_profit_date)}</span>
                            </div>
                          </>
                        )}
                      </div>
                      {!join ? (
                        <Button 
                          className="w-full h-14 text-lg bg-gradient-to-r from-primary to-purple-600 border-0 text-white hover:scale-105 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:shadow-2xl active:scale-95 font-bold rounded-xl" 
                          onClick={() => handleJoin(cert)}
                        >
                          {t('investment.join') || 'Join'}
                        </Button>
                      ) : join.status === 'pending' ? (
                        <Button 
                          className="w-full h-14 text-lg bg-gradient-to-r from-yellow-500 to-yellow-600 border-0 text-white cursor-not-allowed font-bold rounded-xl" 
                          disabled
                        >
                          {t('investment.pendingApproval') || 'Pending Approval'}
                        </Button>
                      ) : join.status === 'approved' ? (
                        <Button 
                          className="w-full h-14 text-lg bg-gradient-to-r from-red-500 to-red-600 border-0 text-white hover:scale-105 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 hover:shadow-2xl active:scale-95 font-bold rounded-xl" 
                          onClick={() => handleWithdraw(join)}
                        >
                          {t('investment.withdraw') || 'Withdraw'}
                        </Button>
                      ) : (
                        <Badge className="w-full h-14 text-lg bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold rounded-xl flex items-center justify-center">
                          {t('investment.withdrawn') || 'Withdrawn'}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced Balance Selection Modal */}
      <Dialog open={showBalanceModal} onOpenChange={setShowBalanceModal}>
        <DialogContent className="bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-lg"></div>
          <DialogHeader className="relative">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('investment.selectBalanceType') || 'Select Balance Type'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-6 relative">
            <div>
              <label className="block mb-3 font-medium text-muted-foreground">{t('investment.investmentAmount') || 'Investment Amount'} (EGP)</label>
              <input
                type="number"
                value={joinAmount}
                onChange={e => {
                  setJoinAmount(e.target.value);
                  checkAmountWarning(e.target.value);
                }}
                className="w-full h-14 border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent text-foreground rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-300"
                min={pendingCertificate?.invested_amount || 1}
                step="0.01"
              />
              {amountWarning && (
                <div className="mt-3 p-4 bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-warning mr-3" />
                    <span className="text-sm text-warning-foreground font-medium">{amountWarning}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <button
                className={`flex items-center gap-4 p-6 rounded-xl border transition-all duration-300 hover:scale-105 ${
                  !userBalances || userBalances.balance < Number(joinAmount)
                    ? 'border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 dark:text-gray-500 cursor-not-allowed'
                    : 'border-green-400 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 dark:bg-gradient-to-r dark:from-green-950/20 dark:to-green-900/20 dark:border-green-400/50 dark:hover:from-green-950/40 dark:hover:to-green-900/40 dark:text-green-400 shadow-lg hover:shadow-green-500/30'
                }`}
                onClick={() => handleSelectBalanceType('balance')}
                disabled={!userBalances || userBalances.balance < Number(joinAmount)}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-green-600 p-1">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className={`font-bold text-lg ${
                    !userBalances || userBalances.balance < Number(joinAmount)
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-green-700 dark:text-green-400'
                  }`}>{t('profile.balance') || 'Balance'}</div>
                  <div className={`text-sm ${
                    !userBalances || userBalances.balance < Number(joinAmount)
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-green-600 dark:text-green-400'
                  }`}>Available: {userBalances?.balance ?? 0} EGP</div>
                </div>
                <div className={`text-2xl font-bold ${
                  !userBalances || userBalances.balance < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-green-700 dark:text-green-400'
                }`}>{userBalances?.balance ?? 0} EGP</div>
              </button>
              <button
                className={`flex items-center gap-4 p-6 rounded-xl border transition-all duration-300 hover:scale-105 ${
                  !userBalances || userBalances.total_points < Number(joinAmount)
                    ? 'border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 dark:text-gray-500 cursor-not-allowed'
                    : 'border-blue-400 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:bg-gradient-to-r dark:from-blue-950/20 dark:to-blue-900/20 dark:border-blue-400/50 dark:hover:from-blue-950/40 dark:hover:to-blue-900/40 dark:text-blue-400 shadow-lg hover:shadow-blue-500/30'
                }`}
                onClick={() => handleSelectBalanceType('total_points')}
                disabled={!userBalances || userBalances.total_points < Number(joinAmount)}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 p-1">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <Star className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className={`font-bold text-lg ${
                    !userBalances || userBalances.total_points < Number(joinAmount)
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-blue-700 dark:text-blue-400'
                  }`}>{t('profile.totalPoints') || 'Total Points'}</div>
                  <div className={`text-sm ${
                    !userBalances || userBalances.total_points < Number(joinAmount)
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}>Available: {userBalances?.total_points ?? 0} points</div>
                </div>
                <div className={`text-2xl font-bold ${
                  !userBalances || userBalances.total_points < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-blue-700 dark:text-blue-400'
                }`}>{userBalances?.total_points ?? 0}</div>
              </button>
              <button
                className={`flex items-center gap-4 p-6 rounded-xl border transition-all duration-300 hover:scale-105 ${
                  !userBalances || userBalances.bonuses < Number(joinAmount)
                    ? 'border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 dark:text-gray-500 cursor-not-allowed'
                    : 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 dark:bg-gradient-to-r dark:from-yellow-950/20 dark:to-yellow-900/20 dark:border-yellow-400/50 dark:hover:from-yellow-950/40 dark:hover:to-yellow-900/40 dark:text-yellow-400 shadow-lg hover:shadow-yellow-500/30'
                }`}
                onClick={() => handleSelectBalanceType('bonuses')}
                disabled={!userBalances || userBalances.bonuses < Number(joinAmount)}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 p-1">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <Gift className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className={`font-bold text-lg ${
                    !userBalances || userBalances.bonuses < Number(joinAmount)
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-yellow-700 dark:text-yellow-400'
                  }`}>{t('profile.bonuses') || 'Bonuses'}</div>
                  <div className={`text-sm ${
                    !userBalances || userBalances.bonuses < Number(joinAmount)
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}>Available: {userBalances?.bonuses ?? 0} EGP</div>
                </div>
                <div className={`text-2xl font-bold ${
                  !userBalances || userBalances.bonuses < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-yellow-700 dark:text-yellow-400'
                }`}>{userBalances?.bonuses ?? 0} EGP</div>
              </button>
              <button
                className={`flex items-center gap-4 p-6 rounded-xl border transition-all duration-300 hover:scale-105 ${
                  !userBalances || userBalances.team_earnings < Number(joinAmount)
                    ? 'border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 dark:text-gray-500 cursor-not-allowed'
                    : 'border-purple-400 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 dark:bg-gradient-to-r dark:from-purple-950/20 dark:to-purple-900/20 dark:border-purple-400/50 dark:hover:from-purple-950/40 dark:hover:to-purple-900/40 dark:text-purple-400 shadow-lg hover:shadow-purple-500/30'
                }`}
                onClick={() => handleSelectBalanceType('team_earnings')}
                disabled={!userBalances || userBalances.team_earnings < Number(joinAmount)}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 p-1">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className={`font-bold text-lg ${
                    !userBalances || userBalances.team_earnings < Number(joinAmount)
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-purple-700 dark:text-purple-400'
                  }`}>{t('profile.teamEarnings') || 'Team Earnings'}</div>
                  <div className={`text-sm ${
                    !userBalances || userBalances.team_earnings < Number(joinAmount)
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-purple-600 dark:text-purple-400'
                  }`}>Available: {userBalances?.team_earnings ?? 0} EGP</div>
                </div>
                <div className={`text-2xl font-bold ${
                  !userBalances || userBalances.team_earnings < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-purple-700 dark:text-purple-400'
                }`}>{userBalances?.team_earnings ?? 0} EGP</div>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Join Confirmation Modal */}
      <ConfirmDialog open={showUserConfirm} onOpenChange={setShowUserConfirm}>
        <ConfirmDialogContent className="bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-lg"></div>
          <ConfirmDialogHeader className="relative">
            <ConfirmDialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('investment.confirmInvestment') || 'Confirm Investment'} - {joinAmount} EGP using {pendingBalanceType === 'balance' ? (t('profile.balance') || 'Balance') : pendingBalanceType === 'bonuses' ? (t('profile.bonuses') || 'Bonuses') : pendingBalanceType === 'team_earnings' ? (t('profile.teamEarnings') || 'Team Earnings') : (t('profile.totalPoints') || 'Total Points')}?
            </ConfirmDialogTitle>
          </ConfirmDialogHeader>
          <div className="flex justify-end gap-4 mt-8 relative">
            <Button 
              variant="outline" 
              onClick={() => setShowUserConfirm(false)}
              className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20 hover:scale-105 transition-all duration-300"
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button 
              onClick={() => { setShowUserConfirm(false); if (pendingUserJoin) pendingUserJoin(); }}
              className="bg-gradient-to-r from-primary to-purple-600 border-0 text-white hover:scale-105 transition-all duration-300 shadow-2xl"
            >
              {t('common.confirm') || 'Confirm'}
            </Button>
          </div>
        </ConfirmDialogContent>
      </ConfirmDialog>

      {/* Enhanced Join Modal - keeping for backward compatibility */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent className="bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-lg"></div>
          <DialogHeader className="relative">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('investment.joinCertificate') || 'Join Investment Certificate'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 relative">
            <div>
              <label className="block mb-3 font-medium text-muted-foreground">{t('investment.investmentAmount') || 'Investment Amount'} (EGP)</label>
              <input
                type="number"
                value={joinAmount}
                onChange={e => {
                  setJoinAmount(e.target.value);
                  checkAmountWarning(e.target.value);
                }}
                className="w-full h-14 border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent text-foreground rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-300"
                min={pendingCertificate?.invested_amount || 1}
                step="0.01"
              />
              {amountWarning && (
                <div className="mt-3 p-4 bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-warning mr-3" />
                    <span className="text-sm text-warning-foreground font-medium">{amountWarning}</span>
                  </div>
                </div>
              )}
            </div>
            <Button 
              className="w-full h-14 text-lg bg-gradient-to-r from-primary to-purple-600 border-0 text-white hover:scale-105 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:shadow-2xl active:scale-95 font-bold rounded-xl" 
              onClick={handleJoinSubmit} 
              disabled={joining}
            >
              {joining ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  {t('common.loading')}
                </div>
              ) : (
                t('investment.confirmJoin') || 'Confirm Join'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Enhanced Withdraw Confirm Modal */}
      <Dialog open={showWithdrawConfirm} onOpenChange={setShowWithdrawConfirm}>
        <DialogContent className="bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-lg"></div>
          <DialogHeader className="relative">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('investment.confirmWithdraw') || 'Confirm Withdraw'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 relative">
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t('investment.withdrawWarning') || 'Are you sure you want to withdraw from this certificate?'}
            </p>
            <Button 
              className="w-full h-14 text-lg bg-gradient-to-r from-red-500 to-red-600 border-0 text-white hover:scale-105 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 hover:shadow-2xl active:scale-95 font-bold rounded-xl" 
              onClick={confirmWithdraw}
            >
              {t('investment.confirm') || 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 