-- Add profit_duration_months column to investment_certificates table
-- This column is required for the investment certificate feature

-- First, check if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'investment_certificates') THEN
        -- Add the profit_duration_months column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'investment_certificates' 
            AND column_name = 'profit_duration_months'
        ) THEN
            ALTER TABLE investment_certificates 
            ADD COLUMN profit_duration_months INTEGER DEFAULT 6;
            
            RAISE NOTICE 'Added profit_duration_months column to investment_certificates table';
        ELSE
            RAISE NOTICE 'profit_duration_months column already exists in investment_certificates table';
        END IF;
    ELSE
        RAISE NOTICE 'investment_certificates table does not exist. Creating it...';
        
        -- Create the table if it doesn't exist
        CREATE TABLE investment_certificates (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            title_en TEXT NOT NULL,
            title_ar TEXT NOT NULL,
            description_en TEXT NOT NULL,
            description_ar TEXT NOT NULL,
            invested_amount DECIMAL(10,2) NOT NULL,
            profit_rate DECIMAL(5,2) NOT NULL,
            profit_duration_months INTEGER DEFAULT 6 NOT NULL,
            next_profit_date TIMESTAMP WITH TIME ZONE,
            join_limit INTEGER,
            user_join_limit INTEGER DEFAULT 1,
            image_url TEXT,
            active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created investment_certificates table with profit_duration_months column';
    END IF;
END $$;

-- Also check if investment_certificate_joins table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'investment_certificate_joins') THEN
        CREATE TABLE investment_certificate_joins (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            certificate_id UUID NOT NULL REFERENCES investment_certificates(id) ON DELETE CASCADE,
            invested_amount DECIMAL(10,2) NOT NULL,
            join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            next_profit_date TIMESTAMP WITH TIME ZONE,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created investment_certificate_joins table';
    END IF;
END $$;

-- Enable Row Level Security on both tables
ALTER TABLE investment_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_certificate_joins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for investment_certificates
-- Allow all authenticated users to read active certificates
CREATE POLICY "Allow authenticated users to read active certificates"
ON investment_certificates
FOR SELECT
USING (active = true AND auth.role() = 'authenticated');

-- Allow admins to read all certificates
CREATE POLICY "Allow admins to read all certificates"
ON investment_certificates
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_info 
        WHERE user_uid = auth.uid() 
        AND is_admin = true
    )
);

-- Allow admins to insert certificates
CREATE POLICY "Allow admins to insert certificates"
ON investment_certificates
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_info 
        WHERE user_uid = auth.uid() 
        AND is_admin = true
    )
);

-- Allow admins to update certificates
CREATE POLICY "Allow admins to update certificates"
ON investment_certificates
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_info 
        WHERE user_uid = auth.uid() 
        AND is_admin = true
    )
);

-- Allow admins to delete certificates
CREATE POLICY "Allow admins to delete certificates"
ON investment_certificates
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_info 
        WHERE user_uid = auth.uid() 
        AND is_admin = true
    )
);

-- Create RLS policies for investment_certificate_joins
-- Allow users to read their own joins
CREATE POLICY "Allow users to read their own joins"
ON investment_certificate_joins
FOR SELECT
USING (user_id = auth.uid());

-- Allow admins to read all joins
CREATE POLICY "Allow admins to read all joins"
ON investment_certificate_joins
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_info 
        WHERE user_uid = auth.uid() 
        AND is_admin = true
    )
);

-- Allow users to insert their own joins
CREATE POLICY "Allow users to insert their own joins"
ON investment_certificate_joins
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow admins to update joins
CREATE POLICY "Allow admins to update joins"
ON investment_certificate_joins
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_info 
        WHERE user_uid = auth.uid() 
        AND is_admin = true
    )
);

-- Allow users to update their own joins (for withdrawal)
CREATE POLICY "Allow users to update their own joins"
ON investment_certificate_joins
FOR UPDATE
USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_investment_certificates_active ON investment_certificates(active);
CREATE INDEX IF NOT EXISTS idx_investment_certificate_joins_user_id ON investment_certificate_joins(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_certificate_joins_certificate_id ON investment_certificate_joins(certificate_id);
CREATE INDEX IF NOT EXISTS idx_investment_certificate_joins_status ON investment_certificate_joins(status);

-- Update existing certificates to have a default profit_duration_months value
UPDATE investment_certificates 
SET profit_duration_months = 6 
WHERE profit_duration_months IS NULL;

RAISE NOTICE 'Database schema updated successfully for investment certificates feature'; 