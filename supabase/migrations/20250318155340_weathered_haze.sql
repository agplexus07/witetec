/*
  # Correção de Segurança para Chaves de API

  1. Alterações
    - Remover políticas existentes da tabela api_keys
    - Adicionar novas políticas mais restritivas
    - Garantir que comerciantes só vejam suas próprias chaves
    - Permitir que admins vejam todas as chaves
*/

-- Remover políticas existentes
DROP POLICY IF EXISTS "Merchants can view own api keys" ON api_keys;
DROP POLICY IF EXISTS "Merchants can create api keys" ON api_keys;

-- Criar novas políticas mais restritivas
CREATE POLICY "Merchants can view only their own api keys"
  ON api_keys
  FOR SELECT
  TO authenticated
  USING (
    merchant_id::text = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can create their own api keys"
  ON api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id::text = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can update api keys"
  ON api_keys
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can delete api keys"
  ON api_keys
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );