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
    <div className={`min-h-screen py-20 ${isRTL ? 'rtl' : 'ltr'} bg-background text-foreground`}>
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-4xl font-bold mb-8 text-foreground">{t('investment.title') || 'Investment Certificates'}</h1>
          {loading ? (
            <div className="text-center">{t('common.loading')}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {certificates.map((cert) => {
                const join = userJoins[cert.id];
                return (
                  <Card key={cert.id} className="shadow-card hover:shadow-glow transition-all duration-300">
                    <CardHeader>
                      <div className="flex justify-between items-center mb-2">
                        <CardTitle className="text-xl font-bold">
                          {language === 'ar' ? (cert.title_ar || cert.title_en) : (cert.title_en || cert.title_ar)}
                        </CardTitle>
                        <span className="text-2xl font-bold text-primary">{cert.invested_amount} EGP</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {cert.image_url && (
                        <img
                          src={cert.image_url}
                          alt={language === 'ar' ? (cert.title_ar || cert.title_en) : (cert.title_en || cert.title_ar)}
                          className="w-full h-40 object-contain rounded mb-4 bg-white dark:bg-gray-800 p-2 border border-border"
                          onError={e => e.currentTarget.src = '/placeholder.svg'}
                        />
                      )}
                      <p className="text-muted-foreground mb-4 leading-relaxed">
                        {language === 'ar' ? (cert.description_ar || cert.description_en) : (cert.description_en || cert.description_ar)}
                      </p>
                      <div className="space-y-2 mb-6 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('investment.investmentAmount') || 'Investment Amount'}:</span>
                          <span>{cert.invested_amount} EGP</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('investment.profitRate') || 'Profit Rate'}:</span>
                          <span>{cert.profit_rate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('investment.profitDuration') || 'Profit Duration'}:</span>
                          <span>{cert.profit_duration_months || 6} {t('investment.months') || 'months'}</span>
                        </div>
                        {join && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('investment.joinDate') || 'Join Date'}:</span>
                              <span>{formatDate(join.join_date)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('investment.nextProfitDate') || 'Next Profit Date'}:</span>
                              <span>{formatDate(join.next_profit_date)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('investment.nextProfitDueIn') || 'Next Profit Due In'}:</span>
                              <span>{getCountdown(join.next_profit_date)}</span>
                            </div>
                          </>
                        )}
                      </div>
                      {!join ? (
                        <Button className="w-full" onClick={() => handleJoin(cert)}>{t('investment.join') || 'Join'}</Button>
                      ) : join.status === 'pending' ? (
                        <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white cursor-not-allowed" disabled>{t('investment.pendingApproval') || 'Pending Approval'}</Button>
                      ) : join.status === 'approved' ? (
                        <Button className="w-full bg-red-500 hover:bg-red-600 text-white" onClick={() => handleWithdraw(join)}>{t('investment.withdraw') || 'Withdraw'}</Button>
                      ) : (
                        <Badge variant="outline">{t('investment.withdrawn') || 'Withdrawn'}</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Balance Selection Modal */}
      <Dialog open={showBalanceModal} onOpenChange={setShowBalanceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('investment.selectBalanceType') || 'Select Balance Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block mb-1 font-medium text-foreground">{t('investment.investmentAmount') || 'Investment Amount'} (EGP)</label>
              <input
                type="number"
                value={joinAmount}
                onChange={e => {
                  setJoinAmount(e.target.value);
                  checkAmountWarning(e.target.value);
                }}
                className="w-full border border-input bg-background text-foreground rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                min={pendingCertificate?.invested_amount || 1}
                step="0.01"
              />
              {amountWarning && (
                <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                    <span className="text-sm text-yellow-800 dark:text-yellow-200">{amountWarning}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <button
                className={`flex items-center gap-3 p-4 rounded-lg border transition ${
                  !userBalances || userBalances.balance < Number(joinAmount)
                    ? 'border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                    : 'border-green-400 bg-green-50 hover:bg-green-100 dark:bg-green-950/20 dark:border-green-400/50 dark:hover:bg-green-950/40 dark:text-green-400'
                }`}
                onClick={() => handleSelectBalanceType('balance')}
                disabled={!userBalances || userBalances.balance < Number(joinAmount)}
              >
                <DollarSign className={`w-6 h-6 ${
                  !userBalances || userBalances.balance < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-green-500 dark:text-green-400'
                }`} />
                <span className={`font-bold ${
                  !userBalances || userBalances.balance < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-green-700 dark:text-green-400'
                }`}>{t('profile.balance') || 'Balance'}</span>
                <span className={`ml-auto ${
                  !userBalances || userBalances.balance < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-green-700 dark:text-green-400'
                }`}>{userBalances?.balance ?? 0} EGP</span>
              </button>
              <button
                className={`flex items-center gap-3 p-4 rounded-lg border transition ${
                  !userBalances || userBalances.total_points < Number(joinAmount)
                    ? 'border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                    : 'border-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:border-blue-400/50 dark:hover:bg-blue-950/40 dark:text-blue-400'
                }`}
                onClick={() => handleSelectBalanceType('total_points')}
                disabled={!userBalances || userBalances.total_points < Number(joinAmount)}
              >
                <Star className={`w-6 h-6 ${
                  !userBalances || userBalances.total_points < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-blue-500 dark:text-blue-400'
                }`} />
                <span className={`font-bold ${
                  !userBalances || userBalances.total_points < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-blue-700 dark:text-blue-400'
                }`}>{t('profile.totalPoints') || 'Total Points'}</span>
                <span className={`ml-auto ${
                  !userBalances || userBalances.total_points < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-blue-700 dark:text-blue-400'
                }`}>{userBalances?.total_points ?? 0}</span>
              </button>
              <button
                className={`flex items-center gap-3 p-4 rounded-lg border transition ${
                  !userBalances || userBalances.bonuses < Number(joinAmount)
                    ? 'border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                    : 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/20 dark:border-yellow-400/50 dark:hover:bg-yellow-950/40 dark:text-yellow-400'
                }`}
                onClick={() => handleSelectBalanceType('bonuses')}
                disabled={!userBalances || userBalances.bonuses < Number(joinAmount)}
              >
                <Gift className={`w-6 h-6 ${
                  !userBalances || userBalances.bonuses < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-yellow-500 dark:text-yellow-400'
                }`} />
                <span className={`font-bold ${
                  !userBalances || userBalances.bonuses < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-yellow-700 dark:text-yellow-400'
                }`}>{t('profile.bonuses') || 'Bonuses'}</span>
                <span className={`ml-auto ${
                  !userBalances || userBalances.bonuses < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-yellow-700 dark:text-yellow-400'
                }`}>{userBalances?.bonuses ?? 0} EGP</span>
              </button>
              <button
                className={`flex items-center gap-3 p-4 rounded-lg border transition ${
                  !userBalances || userBalances.team_earnings < Number(joinAmount)
                    ? 'border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                    : 'border-purple-400 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/20 dark:border-purple-400/50 dark:hover:bg-purple-950/40 dark:text-purple-400'
                }`}
                onClick={() => handleSelectBalanceType('team_earnings')}
                disabled={!userBalances || userBalances.team_earnings < Number(joinAmount)}
              >
                <Users className={`w-6 h-6 ${
                  !userBalances || userBalances.team_earnings < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-purple-500 dark:text-purple-400'
                }`} />
                <span className={`font-bold ${
                  !userBalances || userBalances.team_earnings < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-purple-700 dark:text-purple-400'
                }`}>{t('profile.teamEarnings') || 'Team Earnings'}</span>
                <span className={`ml-auto ${
                  !userBalances || userBalances.team_earnings < Number(joinAmount)
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-purple-700 dark:text-purple-400'
                }`}>{userBalances?.team_earnings ?? 0} EGP</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Confirmation Modal */}
      <ConfirmDialog open={showUserConfirm} onOpenChange={setShowUserConfirm}>
        <ConfirmDialogContent>
          <ConfirmDialogHeader>
            <ConfirmDialogTitle>
              {t('investment.confirmInvestment') || 'Confirm Investment'} - {joinAmount} EGP using {pendingBalanceType === 'balance' ? (t('profile.balance') || 'Balance') : pendingBalanceType === 'bonuses' ? (t('profile.bonuses') || 'Bonuses') : pendingBalanceType === 'team_earnings' ? (t('profile.teamEarnings') || 'Team Earnings') : (t('profile.totalPoints') || 'Total Points')}?
            </ConfirmDialogTitle>
          </ConfirmDialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowUserConfirm(false)}>{t('common.cancel') || 'Cancel'}</Button>
            <Button onClick={() => { setShowUserConfirm(false); if (pendingUserJoin) pendingUserJoin(); }}>{t('common.confirm') || 'Confirm'}</Button>
          </div>
        </ConfirmDialogContent>
      </ConfirmDialog>

      {/* Join Modal - keeping for backward compatibility */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('investment.joinCertificate') || 'Join Investment Certificate'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-medium text-foreground">{t('investment.investmentAmount') || 'Investment Amount'} (EGP)</label>
              <input
                type="number"
                value={joinAmount}
                onChange={e => {
                  setJoinAmount(e.target.value);
                  checkAmountWarning(e.target.value);
                }}
                className="w-full border border-input bg-background text-foreground rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                min={pendingCertificate?.invested_amount || 1}
                step="0.01"
              />
              {amountWarning && (
                <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                    <span className="text-sm text-yellow-800 dark:text-yellow-200">{amountWarning}</span>
                  </div>
                </div>
              )}
            </div>
            <Button className="w-full" onClick={handleJoinSubmit} disabled={joining}>{joining ? t('common.loading') : t('investment.confirmJoin') || 'Confirm Join'}</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Withdraw Confirm Modal */}
      <Dialog open={showWithdrawConfirm} onOpenChange={setShowWithdrawConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('investment.confirmWithdraw') || 'Confirm Withdraw'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{t('investment.withdrawWarning') || 'Are you sure you want to withdraw from this certificate?'}</p>
            <Button className="w-full" onClick={confirmWithdraw}>{t('investment.confirm') || 'Confirm'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 