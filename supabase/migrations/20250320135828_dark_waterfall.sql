/*
  # Fix merchant status trigger

  1. Changes
    - Remove old trigger that was trying to access non-existent fields
    - Create new trigger that only updates relevant fields
    - Fix merchant status update logic
*/

-- Drop old trigger and function
DROP TRIGGER IF EXISTS merchant_status_update_trigger ON merchants;
DROP FUNCTION IF EXISTS handle_merchant_status_update();

-- Create new function with correct fields
CREATE OR REPLACE FUNCTION handle_merchant_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update documents_verified fields when status changes to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.documents_verified := TRUE;
    NEW.documents_verified_at := NOW();
    NEW.documents_verified_by := auth.uid();
  -- Clear verification fields when status changes to rejected
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    NEW.documents_verified := FALSE;
    NEW.documents_verified_at := NULL;
    NEW.documents_verified_by := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER merchant_status_update_trigger
  BEFORE UPDATE OF status
  ON merchants
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION handle_merchant_status_update();

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'merchants' AND column_name = 'documents_verified'
  ) THEN
    ALTER TABLE merchants ADD COLUMN documents_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'merchants' AND column_name = 'documents_verified_at'
  ) THEN
    ALTER TABLE merchants ADD COLUMN documents_verified_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'merchants' AND column_name = 'documents_verified_by'
  ) THEN
    ALTER TABLE merchants ADD COLUMN documents_verified_by uuid;
  END IF;
END $$;