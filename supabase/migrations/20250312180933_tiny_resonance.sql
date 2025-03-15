/*
  # Sub-acquirer Initial Schema

  1. New Tables
    - `merchants`
      - Basic merchant information and KYC data
      - Status tracking for approval process
      - Financial information
    
    - `transactions`
      - PIX transaction records
      - Transaction status tracking
      - Financial calculations
    
    - `withdrawals`
      - Withdrawal requests
      - Processing status
      - Fee calculations

  2. Security
    - Enable RLS on all tables
    - Policies for merchant access
    - Admin-only access for certain operations
*/

-- Create merchants table
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Business Information
  company_name TEXT NOT NULL,
  trading_name TEXT,
  cnpj TEXT UNIQUE NOT NULL,
  
  -- Contact Information
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  
  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  kyc_verified BOOLEAN DEFAULT false,
  
  -- Financial
  balance DECIMAL(12,2) DEFAULT 0.00,
  fee_percentage DECIMAL(4,2) DEFAULT 2.99,
  
  -- Documents
  document_urls JSONB DEFAULT '{}',
  rejection_reason TEXT
);

-- Create transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  amount DECIMAL(12,2) NOT NULL,
  fee_amount DECIMAL(12,2) NOT NULL,
  net_amount DECIMAL(12,2) NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'chargeback')),
  pix_key TEXT NOT NULL,
  transaction_id TEXT UNIQUE NOT NULL,
  
  description TEXT,
  customer_info JSONB DEFAULT '{}'
);

-- Create withdrawals table
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  amount DECIMAL(12,2) NOT NULL,
  fee_amount DECIMAL(12,2) DEFAULT 2.99,
  net_amount DECIMAL(12,2) NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  pix_key TEXT NOT NULL,
  
  bank_info JSONB DEFAULT '{}',
  notes TEXT
);

-- Enable RLS
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Policies for merchants
CREATE POLICY "Merchants can view own data"
  ON merchants
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Policies for transactions
CREATE POLICY "Merchants can view own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (merchant_id::text = auth.uid()::text);

-- Policies for withdrawals
CREATE POLICY "Merchants can view own withdrawals"
  ON withdrawals
  FOR SELECT
  TO authenticated
  USING (merchant_id::text = auth.uid()::text);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_merchants_updated_at
    BEFORE UPDATE ON merchants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();