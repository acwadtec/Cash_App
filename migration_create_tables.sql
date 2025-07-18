-- Create user_info table
CREATE TABLE IF NOT EXISTS user_info (
    user_uid UUID PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    status TEXT DEFAULT 'pending',
    verified BOOLEAN DEFAULT false,
    profile_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_info(user_uid),
    type TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_info(user_uid),
    status TEXT NOT NULL DEFAULT 'active',
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES chat_sessions(id),
    sender TEXT NOT NULL,
    text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    target TEXT NOT NULL DEFAULT 'all',
    target_value TEXT,
    banner BOOLEAN DEFAULT false,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deposit_requests table
CREATE TABLE IF NOT EXISTS deposit_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_info(user_uid),
    amount DECIMAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    deposit_number TEXT NOT NULL,
    proof_image TEXT,
    admin_note TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_info(user_uid),
    amount DECIMAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL,
    account_details TEXT NOT NULL,
    admin_note TEXT,
    rejection_reason TEXT,
    proof_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deposit_numbers table
CREATE TABLE IF NOT EXISTS deposit_numbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    number TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    amount DECIMAL NOT NULL,
    cost DECIMAL NOT NULL,
    daily_profit DECIMAL NOT NULL,
    monthly_profit DECIMAL NOT NULL,
    type TEXT DEFAULT 'regular',
    active BOOLEAN DEFAULT true,
    image_url TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add join_limit and join_count columns to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS join_limit INTEGER DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS join_count INTEGER DEFAULT 0;

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'achievement',
    requirement INTEGER NOT NULL DEFAULT 1,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create levels table
CREATE TABLE IF NOT EXISTS levels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    requirement INTEGER NOT NULL,
    benefits TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_offers_type ON offers(type);
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(active);
CREATE INDEX IF NOT EXISTS idx_badges_type ON badges(type);
CREATE INDEX IF NOT EXISTS idx_badges_is_active ON badges(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE user_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- user_info policies
CREATE POLICY "Users can view their own info" ON user_info FOR SELECT
    USING (auth.uid() = user_uid);
CREATE POLICY "Admins can view all user info" ON user_info FOR SELECT
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_uid = auth.uid()));

-- transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_uid = auth.uid()));

-- chat policies
CREATE POLICY "Users can view their own chats" ON chat_sessions FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all chats" ON chat_sessions FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_uid = auth.uid()));

-- notifications policies
CREATE POLICY "Everyone can view notifications" ON notifications FOR SELECT
    USING (true);
CREATE POLICY "Only admins can manage notifications" ON notifications FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_uid = auth.uid()));

-- deposit/withdrawal policies
CREATE POLICY "Users can view their own requests" ON deposit_requests FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own withdrawal requests" ON withdrawal_requests FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all requests" ON deposit_requests FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_uid = auth.uid()));
CREATE POLICY "Admins can manage all withdrawal requests" ON withdrawal_requests FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_uid = auth.uid()));

-- offers policies
CREATE POLICY "Everyone can view active offers" ON offers FOR SELECT
    USING (active = true OR EXISTS (SELECT 1 FROM admins WHERE admins.user_uid = auth.uid()));
CREATE POLICY "Only admins can manage offers" ON offers FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_uid = auth.uid()));

-- gamification policies
CREATE POLICY "Everyone can view badges and levels" ON badges FOR SELECT USING (true);
CREATE POLICY "Everyone can view levels" ON levels FOR SELECT USING (true);
CREATE POLICY "Only admins can manage badges" ON badges FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_uid = auth.uid()));
CREATE POLICY "Only admins can manage levels" ON levels FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_uid = auth.uid()));

-- settings policies
CREATE POLICY "Everyone can view settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Only admins can manage settings" ON settings FOR ALL
    USING (EXISTS (SELECT 1 FROM admins WHERE admins.user_uid = auth.uid())); 

-- Add status column to offer_joins for approval workflow
ALTER TABLE offer_joins ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'; 

-- Add approved_at and last_profit_at columns to offer_joins for profit scheduling
ALTER TABLE offer_joins ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE offer_joins ADD COLUMN IF NOT EXISTS last_profit_at TIMESTAMP; 

-- Add last_monthly_profit_at column to offer_joins for monthly profit scheduling
ALTER TABLE offer_joins ADD COLUMN IF NOT EXISTS last_monthly_profit_at TIMESTAMP; 