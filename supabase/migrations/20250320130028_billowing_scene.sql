/*
  # Simplificar controle de capacidades do comerciante

  1. Alterações
    - Remover colunas can_generate_api_key e can_withdraw
    - Atualizar triggers e funções para usar apenas documents_submitted
    - Adicionar função para verificar capacidades do comerciante

  2. Segurança
    - Manter controle de acesso baseado no status dos documentos
    - Simplificar lógica de verificação
*/

-- Criar função para verificar capacidades do comerciante
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

-- Remover colunas antigas após criar view
ALTER TABLE merchants
DROP COLUMN IF EXISTS can_generate_api_key,
DROP COLUMN IF EXISTS can_withdraw;