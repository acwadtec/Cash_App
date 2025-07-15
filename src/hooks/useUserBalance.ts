import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserBalances() {
  const [balances, setBalances] = useState<{
    personal_earnings: number;
    team_earnings: number;
    bonuses: number;
    balance: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }
        const user = userData.user;
        const { data, error } = await supabase
          .from('user_info')
          .select('personal_earnings, team_earnings, bonuses, balance')
          .eq('user_uid', user.id)
          .single();
        console.log('Fetched user_info data:', data); // Debug log
        if (error) {
          console.error('Supabase error:', error); // Debug log
          setError(error.message);
          setBalances(null);
        } else {
          setBalances({
            personal_earnings: typeof data?.personal_earnings === 'number' ? data.personal_earnings : Number(data?.personal_earnings) || 0,
            team_earnings: typeof data?.team_earnings === 'number' ? data.team_earnings : Number(data?.team_earnings) || 0,
            bonuses: typeof data?.bonuses === 'number' ? data.bonuses : Number(data?.bonuses) || 0,
            balance: typeof data?.balance === 'number' ? data.balance : Number(data?.balance) || 0,
          });
        }
      } catch (err: any) {
        console.error('Unknown error:', err); // Debug log
        setError(err.message || 'Unknown error');
        setBalances(null);
      } finally {
        setLoading(false);
      }
    };
    fetchBalances();
  }, []);

  return { balances, loading, error };
} 