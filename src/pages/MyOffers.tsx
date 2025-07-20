import React, { useEffect, useState } from 'react';
import { supabase, robustQuery, testExpirationCheck } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface OfferJoin {
  id: string;
  user_id: string;
  offer_id: string;
  status: string;
  joined_at: string;
  last_profit_at?: string;
  approved_at?: string;
  offer: {
    id: string;
    title_en?: string;
    title_ar?: string;
    description_en?: string;
    description_ar?: string;
    amount: number;
    cost?: number;
    daily_profit?: number;
    monthly_profit?: number;
    image_url?: string;
    deadline?: string;
    active: boolean;
  };
}

interface DailyProfit {
  id: string;
  user_id: string;
  offer_id: string;
  offer_join_id: string;
  amount: number;
  profit_date: string;
  transaction_id?: string;
  created_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
  source_user_id?: string;
}

function getTimeLeftToNextProfit(offerJoin: OfferJoin, now: Date, t: (key: string) => string): string {
  // If offer is inactive, timer should be stopped
  if (offerJoin.status === 'inactive') {
    return t('myOffers.timerStopped') || 'Timer Stopped';
  }
  
  const last = offerJoin.last_profit_at || offerJoin.approved_at;
  if (!last) return '-';
  const lastDate = new Date(last);
  const nextProfit = new Date(lastDate.getTime() + 24 * 60 * 60 * 1000); // Exactly 24 hours
  const diff = nextProfit.getTime() - now.getTime();
  
  // Debug logging
  console.log('Debug timer:', {
    offerJoinId: offerJoin.id,
    offerId: offerJoin.offer_id,
    status: offerJoin.status,
    last: last,
    lastDate: lastDate,
    nextProfit: nextProfit,
    now: now,
    diff: diff,
    hours: Math.floor(diff / (1000 * 60 * 60))
  });
  
  if (diff <= 0) return t('myOffers.availableNow');
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

function getDaysLeft(offerJoin: OfferJoin, now: Date, t: (key: string) => string): string {
  if (!offerJoin.approved_at) return '-';
  
  // Calculate 30 days from approved_at date
  const approvedDate = new Date(offerJoin.approved_at);
  const endDate = new Date(approvedDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const diff = endDate.getTime() - now.getTime();
  
  console.log('Debug days left:', {
    offerJoinId: offerJoin.id,
    approvedAt: offerJoin.approved_at,
    approvedDate: approvedDate,
    endDate: endDate,
    now: now,
    diff: diff,
    days: Math.ceil(diff / (1000 * 60 * 60 * 24))
  });
  
  if (diff <= 0) return t('myOffers.expired');
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days} ${days !== 1 ? t('myOffers.days') : t('myOffers.day')}`;
}

function isOfferExpired(offerJoin: OfferJoin, now: Date): boolean {
  if (!offerJoin.approved_at) return false;
  
  const approvedDate = new Date(offerJoin.approved_at);
  const endDate = new Date(approvedDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  return now.getTime() >= endDate.getTime();
}

function getTotalProfitFromDailyProfits(dailyProfits: DailyProfit[], offerJoinId: string): string {
  // Filter daily profits for this specific offer join
  const offerDailyProfits = dailyProfits.filter(dp => dp.offer_join_id === offerJoinId);
  
  const total = offerDailyProfits.reduce((sum, dailyProfit) => sum + Number(dailyProfit.amount), 0);
  
  console.log('Debug daily profits for offer join:', {
    offerJoinId: offerJoinId,
    allDailyProfits: dailyProfits,
    offerDailyProfits: offerDailyProfits,
    total: total
  });
  
  return `$${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

const MyOffers: React.FC = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('pending');
  const [offerJoins, setOfferJoins] = useState<OfferJoin[]>([]);
  const [dailyProfits, setDailyProfits] = useState<DailyProfit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [updatingTime, setUpdatingTime] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUserId(userData?.user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      setLoading(true);
      
      console.log('Fetching offer joins for user:', userId);

      // Fetch offer joins with offer details using correct multilingual column names
      const { data: offerJoinsData, error: offerJoinsError } = await robustQuery(async () => {
        return await supabase
          .from('offer_joins')
          .select(`
            id,
            user_id,
            offer_id,
            status,
            joined_at,
            last_profit_at,
            approved_at,
            offer:offers (
              id,
              title_en,
              title_ar,
              description_en,
              description_ar,
              amount,
              cost,
              daily_profit,
              monthly_profit,
              image_url,
              deadline,
              active
            )
          `)
          .eq('user_id', userId)
          .order('joined_at', { ascending: false });
      });

      console.log('Offer joins data:', offerJoinsData);
      console.log('Offer joins error:', offerJoinsError);

      if (offerJoinsError) {
        console.error('Error fetching offer joins:', offerJoinsError);
        setOfferJoins([]);
      } else {
        const mapped = (offerJoinsData || []).map((row: any) => {
          console.log('Processing offer join row:', row);
          
          // Determine status based on offer_join status and offer active status
          // We'll calculate expiration status in the render function instead
          let status = 'pending';
          if (row.status === 'approved') {
            status = row.offer?.active ? 'active' : 'inactive';
          } else if (row.status === 'rejected') {
            status = 'inactive';
          } else {
            status = row.status; // 'pending' or other statuses
          }
          
          const mappedOfferJoin: OfferJoin = {
            id: row.id,
            user_id: row.user_id,
            offer_id: row.offer_id,
            status: status,
            joined_at: row.joined_at,
            last_profit_at: row.last_profit_at,
            approved_at: row.approved_at,
            offer: {
              id: row.offer?.id || '',
              title_en: row.offer?.title_en || '',
              title_ar: row.offer?.title_ar || '',
              description_en: row.offer?.description_en || '',
              description_ar: row.offer?.description_ar || '',
              amount: row.offer?.amount || 0,
              cost: row.offer?.cost,
              daily_profit: row.offer?.daily_profit,
              monthly_profit: row.offer?.monthly_profit,
              image_url: row.offer?.image_url,
              deadline: row.offer?.deadline,
              active: row.offer?.active || false,
            },
          };
          
          console.log('Mapped offer join:', mappedOfferJoin);
          return mappedOfferJoin;
        });
        
        console.log('Mapped offer joins:', mapped);
        setOfferJoins(mapped);
      }
      
      // Fetch daily profits
      const { data: dailyProfitsData, error: dailyProfitsError } = await robustQuery(async () => {
        return await supabase
          .from('daily_profits')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
      });
      
      if (dailyProfitsError) {
        console.error('Error fetching daily profits:', dailyProfitsError);
        setDailyProfits([]);
      } else {
        console.log('Daily profits data:', dailyProfitsData);
        setDailyProfits(dailyProfitsData || []);
      }
      
      // Fetch transactions (keeping for reference)
      const { data: transactionsData, error: transactionsError } = await robustQuery(async () => {
        return await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('type', 'daily_profit')
          .eq('status', 'completed');
      });
      
      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        setTransactions([]);
      } else {
        console.log('Transactions data:', transactionsData);
        setTransactions(transactionsData || []);
      }
      
      setLoading(false);
    };
    fetchData();
    
    // Listen for refresh events
    const handleRefresh = () => {
      fetchData();
    };
    window.addEventListener('refreshData', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshData', handleRefresh);
    };
  }, [userId]);

  // Automatic expiration check when page loads
  useEffect(() => {
    if (!userId) return;
    
    const runExpirationCheck = async () => {
      try {
        console.log('Running automatic expiration check...');
        await testExpirationCheck();
        console.log('Automatic expiration check completed');
      } catch (error) {
        console.error('Error in automatic expiration check:', error);
      }
    };
    
    // Run expiration check when page loads
    runExpirationCheck();
    
    // Set up periodic expiration check every 5 minutes
    const expirationInterval = setInterval(runExpirationCheck, 5 * 60 * 1000); // 5 minutes
    
    return () => {
      clearInterval(expirationInterval);
    };
  }, [userId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate filtered offers with real-time status updates
  const filteredOfferJoins = offerJoins
    .map(offerJoin => {
      // Calculate real-time status including expiration
      let finalStatus = offerJoin.status;
      if (offerJoin.status === 'approved' && offerJoin.approved_at) {
        const isExpired = isOfferExpired(offerJoin, now);
        if (isExpired) {
          finalStatus = 'inactive';
        } else {
          finalStatus = offerJoin.offer?.active ? 'active' : 'inactive';
        }
      }
      
      return {
        ...offerJoin,
        status: finalStatus
      };
    })
    .filter((offerJoin) => offerJoin.status === selectedTab);

  const statusTabs = [
    { label: t('myOffers.pending'), value: 'pending' },
    { label: t('myOffers.active'), value: 'active' },
    { label: t('myOffers.inactive'), value: 'inactive' },
  ];

  // Helper function to get the correct title and description based on language
  const getLocalizedContent = (offerJoin: OfferJoin) => {
    const title = language === 'ar' 
      ? (offerJoin.offer.title_ar || offerJoin.offer.title_en || 'Unknown Offer')
      : (offerJoin.offer.title_en || offerJoin.offer.title_ar || 'Unknown Offer');
    
    const description = language === 'ar'
      ? (offerJoin.offer.description_ar || offerJoin.offer.description_en || '')
      : (offerJoin.offer.description_en || offerJoin.offer.description_ar || '');
    
    return { title, description };
  };

  // Function to move time forward or backward by 1 hour
  const moveTime = async (offerJoinId: string, direction: 'forward' | 'backward') => {
    setUpdatingTime(offerJoinId);
    
    try {
      // Get current last_profit_at
      const currentOfferJoin = offerJoins.find(oj => oj.id === offerJoinId);
      if (!currentOfferJoin) {
        toast({
          title: "Error",
          description: "Offer join not found",
          variant: "destructive",
        });
        return;
      }

      const currentTime = currentOfferJoin.last_profit_at || currentOfferJoin.approved_at;
      if (!currentTime) {
        toast({
          title: "Error",
          description: "No time to adjust",
          variant: "destructive",
        });
        return;
      }

      // Calculate new time (1 hour forward or backward)
      const currentDate = new Date(currentTime);
      const newDate = new Date(currentDate.getTime() + (direction === 'forward' ? 1 : -1) * 60 * 60 * 1000);

      console.log('Moving time:', {
        offerJoinId,
        direction,
        currentTime: currentDate.toISOString(),
        newTime: newDate.toISOString()
      });

      // Update the database
      const { error } = await supabase
        .from('offer_joins')
        .update({ last_profit_at: newDate.toISOString() })
        .eq('id', offerJoinId);

      if (error) {
        console.error('Error updating time:', error);
        toast({
          title: "Error",
          description: "Failed to update time",
          variant: "destructive",
        });
      } else {
        // Update local state
        setOfferJoins(prev => prev.map(oj => 
          oj.id === offerJoinId 
            ? { ...oj, last_profit_at: newDate.toISOString() }
            : oj
        ));
        
        toast({
          title: "Success",
          description: `Time moved ${direction} by 1 hour`,
        });
      }
    } catch (error) {
      console.error('Error moving time:', error);
      toast({
        title: "Error",
        description: "Failed to move time",
        variant: "destructive",
      });
    } finally {
      setUpdatingTime(null);
    }
  };

  // Function to move time forward or backward by 1 day
  const moveTimeByDay = async (offerJoinId: string, direction: 'forward' | 'backward') => {
    setUpdatingTime(offerJoinId);
    
    try {
      // Get current last_profit_at
      const currentOfferJoin = offerJoins.find(oj => oj.id === offerJoinId);
      if (!currentOfferJoin) {
        toast({
          title: "Error",
          description: "Offer join not found",
          variant: "destructive",
        });
        return;
      }

      const currentTime = currentOfferJoin.last_profit_at || currentOfferJoin.approved_at;
      if (!currentTime) {
        toast({
          title: "Error",
          description: "No time to adjust",
          variant: "destructive",
        });
        return;
      }

      // Calculate new time (1 day forward or backward)
      const currentDate = new Date(currentTime);
      const newDate = new Date(currentDate.getTime() + (direction === 'forward' ? 1 : -1) * 24 * 60 * 60 * 1000);

      console.log('Moving time by day:', {
        offerJoinId,
        direction,
        currentTime: currentDate.toISOString(),
        newTime: newDate.toISOString()
      });

      // Update the database
      const { error } = await supabase
        .from('offer_joins')
        .update({ last_profit_at: newDate.toISOString() })
        .eq('id', offerJoinId);

      if (error) {
        console.error('Error updating time:', error);
        toast({
          title: "Error",
          description: "Failed to update time",
          variant: "destructive",
        });
      } else {
        // Update local state
        setOfferJoins(prev => prev.map(oj => 
          oj.id === offerJoinId 
            ? { ...oj, last_profit_at: newDate.toISOString() }
            : oj
        ));
        
        toast({
          title: "Success",
          description: `Time moved ${direction} by 1 day`,
        });
      }
    } catch (error) {
      console.error('Error moving time:', error);
      toast({
        title: "Error",
        description: "Failed to move time",
        variant: "destructive",
      });
    } finally {
      setUpdatingTime(null);
    }
  };

  // Function to move approved_at date forward or backward by 1 day (for testing expiration)
  const moveApprovedDateByDay = async (offerJoinId: string, direction: 'forward' | 'backward') => {
    setUpdatingTime(offerJoinId);
    
    try {
      // Get current approved_at
      const currentOfferJoin = offerJoins.find(oj => oj.id === offerJoinId);
      if (!currentOfferJoin) {
        toast({
          title: "Error",
          description: "Offer join not found",
          variant: "destructive",
        });
        return;
      }

      if (!currentOfferJoin.approved_at) {
        toast({
          title: "Error",
          description: "No approved date to adjust",
          variant: "destructive",
        });
        return;
      }

      // Calculate new approved_at date (1 day forward or backward)
      const currentDate = new Date(currentOfferJoin.approved_at);
      const newDate = new Date(currentDate.getTime() + (direction === 'forward' ? 1 : -1) * 24 * 60 * 60 * 1000);

      console.log('Moving approved date by day:', {
        offerJoinId,
        direction,
        currentApprovedAt: currentDate.toISOString(),
        newApprovedAt: newDate.toISOString()
      });

      // Update the database
      const { error } = await supabase
        .from('offer_joins')
        .update({ approved_at: newDate.toISOString() })
        .eq('id', offerJoinId);

      if (error) {
        console.error('Error updating approved date:', error);
        toast({
          title: "Error",
          description: "Failed to update approved date",
          variant: "destructive",
        });
      } else {
        // Update local state
        setOfferJoins(prev => prev.map(oj => 
          oj.id === offerJoinId 
            ? { ...oj, approved_at: newDate.toISOString() }
            : oj
        ));
        
        toast({
          title: "Success",
          description: `Approved date moved ${direction} by 1 day`,
        });
      }
    } catch (error) {
      console.error('Error moving approved date:', error);
      toast({
        title: "Error",
        description: "Failed to move approved date",
        variant: "destructive",
      });
    } finally {
      setUpdatingTime(null);
    }
  };

  // Function to reset timer to current time
  const resetTimer = async (offerJoinId: string) => {
    setUpdatingTime(offerJoinId);
    
    try {
      const now = new Date();
      
      console.log('Resetting timer:', {
        offerJoinId,
        newTime: now.toISOString()
      });

      // Update the database
      const { error } = await supabase
        .from('offer_joins')
        .update({ last_profit_at: now.toISOString() })
        .eq('id', offerJoinId);

      if (error) {
        console.error('Error resetting timer:', error);
        toast({
          title: "Error",
          description: "Failed to reset timer",
          variant: "destructive",
        });
      } else {
        // Update local state
        setOfferJoins(prev => prev.map(oj => 
          oj.id === offerJoinId 
            ? { ...oj, last_profit_at: now.toISOString() }
            : oj
        ));
        
        toast({
          title: "Success",
          description: "Timer reset to current time",
        });
      }
    } catch (error) {
      console.error('Error resetting timer:', error);
      toast({
        title: "Error",
        description: "Failed to reset timer",
        variant: "destructive",
      });
    } finally {
      setUpdatingTime(null);
    }
  };

  // Function to test expiration check
  const handleTestExpiration = async () => {
    try {
      console.log('Testing expiration check...');
      const result = await testExpirationCheck();
      console.log('Expiration test result:', result);
      
      toast({
        title: "Success",
        description: `Expiration check completed. Check console for details.`,
      });
      
      // Refresh the data to show updated statuses
      if (userId) {
        // Trigger a re-fetch of the data
        const event = new Event('refreshData');
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error testing expiration:', error);
      toast({
        title: "Error",
        description: "Failed to test expiration check",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center">{t('myOffers.title')}</h1>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                className={`px-3 py-2 rounded text-sm md:text-base ${
                  selectedTab === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
                onClick={() => setSelectedTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Expiration Check Button */}
          <div className="text-center mb-4">
            <Button
              onClick={handleTestExpiration}
              variant="outline"
              size="sm"
              className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
            >
              🔄 Check & Update Expired Offers
            </Button>
          </div>
          <div>
            {loading ? (
              <p className="text-center text-muted-foreground">{t('myOffers.loading')}</p>
            ) : filteredOfferJoins.length === 0 ? (
              <p className="text-center text-muted-foreground">{t('myOffers.noOffers').replace('{status}', selectedTab)}</p>
            ) : (
              <ul className="space-y-3">
                {filteredOfferJoins.map((offerJoin) => {
                  const { title, description } = getLocalizedContent(offerJoin);
                  const isUpdating = updatingTime === offerJoin.id;
                  const isExpired = isOfferExpired(offerJoin, now);
                  
                  return (
                    <li
                      key={offerJoin.id}
                      className={`border rounded-lg p-4 bg-card shadow-sm ${
                        isExpired ? 'opacity-60 bg-gray-50' : ''
                      }`}
                    >
                      <div className="font-semibold text-lg mb-2">{title}</div>
                      <div className="text-sm text-muted-foreground mb-3">{description}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="text-muted-foreground">
                          {t('myOffers.joined')} {offerJoin.joined_at ? new Date(offerJoin.joined_at).toLocaleString() : '-'}
                        </div>
                        <div className="text-muted-foreground">
                          {t('myOffers.status')} {offerJoin.status}
                        </div>
                        <div className={`${offerJoin.status === 'inactive' ? 'text-gray-500' : 'text-blue-600'}`}>
                          {t('myOffers.timeToNextProfit')} {getTimeLeftToNextProfit(offerJoin, now, t)}
                        </div>
                        <div className={`${isExpired ? 'text-red-600' : 'text-orange-600'}`}>
                          {t('myOffers.daysLeft')} {getDaysLeft(offerJoin, now, t)}
                        </div>
                      </div>
                      <div className="text-sm text-green-700 mt-2 font-semibold">
                        {t('myOffers.totalProfit')} {getTotalProfitFromDailyProfits(dailyProfits, offerJoin.id)}
                      </div>
                      
                      {isExpired && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          ⚠️ This offer has expired (30-day period completed)
                        </div>
                      )}
                      
                      {/* Test buttons for time manipulation */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500 mb-2">Test Controls:</div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log('Clicking moveTime backward for:', offerJoin.id);
                              moveTime(offerJoin.id, 'backward');
                            }}
                            disabled={isUpdating}
                            className="text-xs"
                          >
                            {isUpdating ? 'Updating...' : '← 1 Hour'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log('Clicking moveTime forward for:', offerJoin.id);
                              moveTime(offerJoin.id, 'forward');
                            }}
                            disabled={isUpdating}
                            className="text-xs"
                          >
                            {isUpdating ? 'Updating...' : '1 Hour →'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log('Clicking moveTimeByDay backward for:', offerJoin.id);
                              moveTimeByDay(offerJoin.id, 'backward');
                            }}
                            disabled={isUpdating}
                            className="text-xs"
                          >
                            {isUpdating ? 'Updating...' : '← 1 Day'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log('Clicking moveTimeByDay forward for:', offerJoin.id);
                              moveTimeByDay(offerJoin.id, 'forward');
                            }}
                            disabled={isUpdating}
                            className="text-xs"
                          >
                            {isUpdating ? 'Updating...' : '1 Day →'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log('Clicking resetTimer for:', offerJoin.id);
                              resetTimer(offerJoin.id);
                            }}
                            disabled={isUpdating}
                            className="text-xs"
                          >
                            {isUpdating ? 'Updating...' : 'Reset Timer'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log('Clicking moveApprovedDateByDay backward for:', offerJoin.id);
                              moveApprovedDateByDay(offerJoin.id, 'backward');
                            }}
                            disabled={isUpdating}
                            className="text-xs"
                          >
                            {isUpdating ? 'Updating...' : '← 1 Day Approved'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log('Clicking moveApprovedDateByDay forward for:', offerJoin.id);
                              moveApprovedDateByDay(offerJoin.id, 'forward');
                            }}
                            disabled={isUpdating}
                            className="text-xs"
                          >
                            {isUpdating ? 'Updating...' : '1 Day Approved →'}
                          </Button>
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          Debug: isUpdating={isUpdating ? 'true' : 'false'}, isExpired={isExpired ? 'true' : 'false'}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-1">
                        Offer Join ID: {offerJoin.id}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyOffers; 