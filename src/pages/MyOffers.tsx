import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

const statusTabs = [
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

function getTimeLeftToNextProfit(offer: Offer, now: Date): string {
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
  
  if (diff <= 0) return 'Available now';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

function getDaysLeft(offer: Offer, now: Date): string {
  if (!offer.deadline) return '-';
  const deadline = new Date(offer.deadline);
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return 'Expired';
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days} day${days !== 1 ? 's' : ''}`;
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
      
      // Fetch offers
      const { data: offersData, error: offersError } = await supabase
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
      
      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'daily_profit')
        .eq('status', 'completed');
      
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

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Offers</h1>
      <div className="flex space-x-4 mb-6">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            className={`px-4 py-2 rounded ${
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
          <p>Loading...</p>
        ) : filteredOffers.length === 0 ? (
          <p>No {selectedTab} offers available.</p>
        ) : (
          <ul className="space-y-2">
            {filteredOffers.map((offer) => (
              <li
                key={offer.id}
                className="border rounded p-4 bg-white shadow"
              >
                <div className="font-semibold">{offer.title}</div>
                <div className="text-sm text-gray-600 mb-2">{offer.description}</div>
                <div className="text-xs text-gray-500">Joined: {offer.joined_at ? new Date(offer.joined_at).toLocaleString() : '-'}</div>
                <div className="text-xs text-gray-500">Status: {offer.status}</div>
                <div className="text-xs text-blue-600 mt-1">Time left to next daily profit: {getTimeLeftToNextProfit(offer, now)}</div>
                <div className="text-xs text-orange-600 mt-1">Days left until offer ends: {getDaysLeft(offer, now)}</div>
                <div className="text-xs text-green-700 mt-1 font-semibold">Total profit from this offer: {getTotalProfitFromTransactions(transactions, offer.id)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MyOffers; 