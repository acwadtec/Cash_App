import { createClient } from '@supabase/supabase-js';
// Load from environment or hardcode for local dev
const SUPABASE_URL = process.env.SUPABASE_URL || '<YOUR_SUPABASE_URL>';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '<YOUR_SERVICE_ROLE_KEY>';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
async function addProfits(type) {
    // 1. Get all active user-offer subscriptions
    const { data: userOffers, error } = await supabase
        .from('user_offers')
        .select('id, user_id, offer_id, joined_at')
        .eq('active', true);
    if (error)
        throw error;
    for (const uo of userOffers || []) {
        // 2. Get offer profit (always select both fields)
        const { data: offer } = await supabase
            .from('offers')
            .select('daily_profit, monthly_profit')
            .eq('id', uo.offer_id)
            .single();
        if (!offer)
            continue;
        const profit = type === 'daily' ? offer.daily_profit : offer.monthly_profit;
        if (!profit || profit <= 0)
            continue;
        // 3. Check if already credited today/this month
        const today = new Date();
        let start, end;
        if (type === 'daily') {
            start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        }
        else {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        }
        const { data: existing } = await supabase
            .from('transactions')
            .select('id')
            .eq('user_id', uo.user_id)
            .eq('offer_id', uo.offer_id)
            .eq('type', type === 'daily' ? 'daily_profit' : 'monthly_profit')
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString());
        if (existing && existing.length > 0)
            continue; // Already credited
        // 4. Add profit to user balance
        await supabase.rpc('increment_user_balance', {
            user_id: uo.user_id,
            amount: profit,
        });
        // 5. Log the transaction
        await supabase.from('transactions').insert([{
                user_id: uo.user_id,
                offer_id: uo.offer_id,
                type: type === 'daily' ? 'daily_profit' : 'monthly_profit',
                amount: profit,
                description: type === 'daily'
                    ? 'Daily profit from offer'
                    : 'Monthly profit from offer',
                created_at: new Date().toISOString(),
            }]);
    }
}
// Run daily profits
addProfits('daily').then(() => console.log('Daily profits added!')).catch(console.error);
// Run monthly profits (uncomment to run manually or schedule for 1st of month)
// addProfits('monthly').then(() => console.log('Monthly profits added!')).catch(console.error); 
