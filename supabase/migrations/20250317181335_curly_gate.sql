/*
  # Add API Keys and Webhooks Support

  1. New Tables
    - `api_keys`
      - Stores merchant API keys
      - Key status tracking
      - Usage limits
    
    - `webhooks`
      - Webhook configurations
      - Event types
      - Security settings

  2. Security
    - Enable RLS
    - Policies for merchant access
*/

-- Create api_keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  key_name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  secret_key TEXT NOT NULL,
  
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  
  rate_limit INTEGER DEFAULT 1000, -- Requisições por hora
  webhook_url TEXT,
  
  test_mode BOOLEAN DEFAULT false
);

-- Create webhooks table
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  url TEXT NOT NULL,
  description TEXT,
  
  is_active BOOLEAN DEFAULT true,
  secret_token TEXT NOT NULL,
  
  events JSONB DEFAULT '["payment.success", "payment.failed"]',
  
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Policies for api_keys
CREATE POLICY "Merchants can view own api keys"
  ON api_keys
  FOR SELECT
  TO authenticated
  USING (merchant_id::text = auth.uid()::text);

CREATE POLICY "Merchants can create api keys"
  ON api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id::text = auth.uid()::text);

-- Policies for webhooks
CREATE POLICY "Merchants can view own webhooks"
  ON webhooks
  FOR SELECT
  TO authenticated
  USING (merchant_id::text = auth.uid()::text);

CREATE POLICY "Merchants can manage own webhooks"
  ON webhooks
  FOR ALL
  TO authenticated
  USING (merchant_id::text = auth.uid()::text);

-- Add triggers for updated_at
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();