/*
  # Fix merchant permissions with proper cascade

  1. Changes
    - Drop existing trigger first
    - Drop and recreate permissions check function
    - Create new trigger with updated logic

  2. Security
    - Maintain existing security model
    - Ensure proper permission checks
*/

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_merchant_permissions ON merchants;

-- Drop and recreate the function
DROP FUNCTION IF EXISTS check_merchant_permissions();

-- Create new function with improved logic
CREATE OR REPLACE FUNCTION check_merchant_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar permissões baseado no status e documentos
  IF NEW.status = 'approved' AND NEW.documents_verified = TRUE THEN
    -- Permissões concedidas automaticamente quando aprovado e verificado
    NEW.documents_status := 'approved';
  ELSIF NEW.status = 'rejected' THEN
    -- Permissões removidas quando rejeitado
    NEW.documents_status := 'rejected';
    NEW.documents_verified := FALSE;
    NEW.documents_verified_at := NULL;
    NEW.documents_verified_by := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER update_merchant_permissions
  BEFORE UPDATE OF status, documents_verified
  ON merchants
  FOR EACH ROW
  EXECUTE FUNCTION check_merchant_permissions();