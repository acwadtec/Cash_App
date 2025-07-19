import React, { useEffect, useState } from 'react';
import { supabase, robustQuery } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';

interface Offer {
  id: string;
  title: string;
  description: string;
  amount: number;
  cost?: number;
  daily_profit?: number;
  monthly_profit?: number;
  image_url?: string;
  deadline?: string;
  status: string;
  joined_at?: string;
  last_profit_at?: string;
  approved_at?: string;
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

function getTimeLeftToNextProfit(offer: Offer, now: Date, t: (key: string) => string): string {
  const last = offer.last_profit_at || offer.approved_at;
  if (!last) return '-';
  const lastDate = new Date(last);
  const nextProfit = new Date(lastDate.getTime() + 24 * 60 * 60 * 1000); // Exactly 24 hours
  const diff = nextProfit.getTime() - now.getTime();
  
  // Debug logging
  console.log('Debug timer:', {
    offerId: offer.id,
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

function getDaysLeft(offer: Offer, now: Date, t: (key: string) => string): string {
  if (!offer.deadline) return '-';
  const deadline = new Date(offer.deadline);
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return t('myOffers.expired');
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days} ${days !== 1 ? t('myOffers.days') : t('myOffers.day')}`;
}

function getTotalProfitFromTransactions(transactions: Transaction[], offerId: string): string {
  // Filter transactions for this specific offer (daily_profit type)
  const offerTransactions = transactions.filter(t => 
    t.type === 'daily_profit' && 
    t.description && 
    t.description.includes(`offer ${offerId}`)
  );
  
  const total = offerTransactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  
  console.log('Debug transactions for offer:', {
    offerId: offerId,
    allTransactions: transactions,
    offerTransactions: offerTransactions,
    total: total
  });
  
  return `$${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

const MyOffers: React.FC = () => {
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState('pending');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

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
      
      // Fetch offers using robust query
      const { data: offersData, error: offersError } = await robustQuery(async () => {
        return await supabase
          .from('offer_joins')
          .select(`
            id,
            offer_id,
            status,
            joined_at,
            last_profit_at,
            approved_at,
            offer:offers (id, title, description, amount, cost, daily_profit, monthly_profit, image_url, deadline, active)
          `)
          .eq('user_id', userId);
      });
      
      // Fetch transactions using robust query
      const { data: transactionsData, error: transactionsError } = await robustQuery(async () => {
        return await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('type', 'daily_profit')
          .eq('status', 'completed');
      });
      
      if (offersError) {
        console.error('Error fetching offers:', offersError);
        setOffers([]);
      } else {
        const mapped = (offersData || []).map((row: any) => ({
          id: row.offer?.id,
          title: row.offer?.title,
          description: row.offer?.description,
          amount: row.offer?.amount,
          cost: row.offer?.cost,
          daily_profit: row.offer?.daily_profit,
          monthly_profit: row.offer?.monthly_profit,
          image_url: row.offer?.image_url,
          deadline: row.offer?.deadline,
          status: row.status === 'pending' ? 'pending' : (row.offer?.active ? 'active' : 'inactive'),
          joined_at: row.joined_at,
          last_profit_at: row.last_profit_at,
          approved_at: row.approved_at,
        }));
        
        // Debug logging
        console.log('Raw offers data from database:', offersData);
        console.log('Mapped offers:', mapped);
        
        setOffers(mapped);
      }
      
      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        setTransactions([]);
      } else {
        console.log('Raw transactions data:', transactionsData);
        setTransactions(transactionsData || []);
      }
      
      setLoading(false);
    };
    fetchData();
  }, [userId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredOffers = offers.filter((offer) => offer.status === selectedTab);

  const statusTabs = [
    { label: t('myOffers.pending'), value: 'pending' },
    { label: t('myOffers.active'), value: 'active' },
    { label: t('myOffers.inactive'), value: 'inactive' },
  ];

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
          <div>
            {loading ? (
              <p className="text-center text-muted-foreground">{t('myOffers.loading')}</p>
            ) : filteredOffers.length === 0 ? (
              <p className="text-center text-muted-foreground">{t('myOffers.noOffers').replace('{status}', selectedTab)}</p>
            ) : (
              <ul className="space-y-3">
                {filteredOffers.map((offer) => (
                  <li
                    key={offer.id}
                    className="border rounded-lg p-4 bg-card shadow-sm"
                  >
                    <div className="font-semibold text-lg mb-2">{offer.title}</div>
                    <div className="text-sm text-muted-foreground mb-3">{offer.description}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="text-muted-foreground">{t('myOffers.joined')} {offer.joined_at ? new Date(offer.joined_at).toLocaleString() : '-'}</div>
                      <div className="text-muted-foreground">{t('myOffers.status')} {offer.status}</div>
                      <div className="text-blue-600">{t('myOffers.timeToNextProfit')} {getTimeLeftToNextProfit(offer, now, t)}</div>
                      <div className="text-orange-600">{t('myOffers.daysLeft')} {getDaysLeft(offer, now, t)}</div>
                    </div>
                    <div className="text-sm text-green-700 mt-2 font-semibold">{t('myOffers.totalProfit')} {getTotalProfitFromTransactions(transactions, offer.id)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyOffers; 