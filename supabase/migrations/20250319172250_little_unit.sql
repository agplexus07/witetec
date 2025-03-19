/*
  # Atualização de Segurança

  1. Configurações
    - Atualiza a função de verificação de domínio
    - Restringe acesso apenas para api.witetec.com

  2. Políticas
    - Atualiza políticas existentes para verificar apenas api.witetec.com
*/

-- Atualiza a função para verificar apenas api.witetec.com
CREATE OR REPLACE FUNCTION public.check_witetec_domain()
RETURNS boolean AS $$
BEGIN
  -- Verifica se a origem da requisição é do domínio api.witetec.com
  RETURN current_setting('request.headers')::json->>'origin' = 'https://api.witetec.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove políticas existentes
DROP POLICY IF EXISTS "Permitir acesso api_keys domínio witetec" ON public.api_keys;
DROP POLICY IF EXISTS "Permitir acesso merchants domínio witetec" ON public.merchants;
DROP POLICY IF EXISTS "Permitir acesso transactions domínio witetec" ON public.transactions;
DROP POLICY IF EXISTS "Permitir acesso webhooks domínio witetec" ON public.webhooks;
DROP POLICY IF EXISTS "Permitir acesso withdrawals domínio witetec" ON public.withdrawals;

-- Cria novas políticas mais restritivas
CREATE POLICY "Permitir acesso api api_keys" ON public.api_keys
  FOR ALL USING (
    check_witetec_domain()
  );

CREATE POLICY "Permitir acesso api merchants" ON public.merchants
  FOR ALL USING (
    check_witetec_domain()
  );

CREATE POLICY "Permitir acesso api transactions" ON public.transactions
  FOR ALL USING (
    check_witetec_domain()
  );

CREATE POLICY "Permitir acesso api webhooks" ON public.webhooks
  FOR ALL USING (
    check_witetec_domain()
  );

CREATE POLICY "Permitir acesso api withdrawals" ON public.withdrawals
  FOR ALL USING (
    check_witetec_domain()
  );