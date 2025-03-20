/*
  # Atualizar lógica de capacidades do comerciante

  1. Alterações
    - Atualizar função check_merchant_capabilities
    - Adicionar função para atualizar status do comerciante
    - Melhorar verificação de documentos
*/

-- Atualizar função de verificação de capacidades
CREATE OR REPLACE FUNCTION check_merchant_capabilities(merchant_id uuid)
RETURNS TABLE (
  can_generate_api_key boolean,
  can_withdraw boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.documents_submitted AND m.status = 'approved' as can_generate_api_key,
    m.documents_submitted AND m.status = 'approved' as can_withdraw
  FROM merchants m
  WHERE m.id = merchant_id;
END;
$$ LANGUAGE plpgsql;

-- Criar função para atualizar status do comerciante
CREATE OR REPLACE FUNCTION update_merchant_status(
  p_merchant_id uuid,
  p_status text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE merchants
  SET 
    status = p_status,
    rejection_reason = CASE 
      WHEN p_status = 'rejected' THEN p_rejection_reason 
      ELSE NULL 
    END,
    updated_at = NOW()
  WHERE id = p_merchant_id;
END;
$$ LANGUAGE plpgsql;

-- Criar função para verificar status dos documentos
CREATE OR REPLACE FUNCTION check_merchant_documents(merchant_id uuid)
RETURNS boolean AS $$
DECLARE
  doc_status jsonb;
BEGIN
  SELECT document_urls INTO doc_status
  FROM merchants
  WHERE id = merchant_id;

  -- Verificar se todos os documentos necessários existem e estão aprovados
  RETURN (
    doc_status ? 'cnpj' AND
    doc_status ? 'identity' AND
    doc_status ? 'selfie' AND
    doc_status->>'status' = 'approved'
  );
END;
$$ LANGUAGE plpgsql;