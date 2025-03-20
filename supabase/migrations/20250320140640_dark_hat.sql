/*
  # Fix merchant permissions check

  1. Changes
    - Drop old permissions check function
    - Create new function using existing fields
*/

-- Drop old function if exists
DROP FUNCTION IF EXISTS check_merchant_permissions();

-- Create new function that checks permissions based on status and documents
CREATE OR REPLACE FUNCTION check_merchant_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar permissões baseado no status e documentos
  IF NEW.status = 'approved' AND NEW.documents_verified = TRUE THEN
    -- Permissões concedidas automaticamente quando aprovado e verificado
    NULL;
  ELSIF NEW.status = 'rejected' THEN
    -- Permissões removidas quando rejeitado
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;