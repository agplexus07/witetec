/*
  # Melhorias no monitoramento de PIX

  1. Alterações
    - Adicionar campos para rastreamento detalhado de pagamentos PIX
    - Melhorar armazenamento de informações do pagador
    - Adicionar campos para data de pagamento e ID único end-to-end

  2. Campos Adicionados
    - end_to_end_id: Identificador único do PIX
    - paid_at: Data/hora do pagamento
    - payer_info: Informações detalhadas do pagador
*/

-- Adicionar novos campos à tabela transactions
ALTER TABLE transactions
ADD COLUMN end_to_end_id TEXT UNIQUE,
ADD COLUMN paid_at TIMESTAMPTZ,
ADD COLUMN payer_info JSONB;