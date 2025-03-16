import axios from 'axios';
import * as https from 'https';

const CASH_OUT_URL = 'http://secureapi.ecomovi-prod.onz.software';
const CASH_IN_URL = 'http://api.pix.ecomovi.com.br';

// Criar uma instância do Axios com configuração básica e ignorar certificado SSL
const axiosInstance = axios.create({
  timeout: 10000, // Timeout de 10 segundos
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // Ignorar erro de certificado
  }),
});

export const onzClient = {
  pix: {
    create: async (data: {
      amount: number;
      correlationID: string;
      description?: string;
      expiresIn?: number;
    }) => {
      const payload = {
        calendario: {
          expiracao: data.expiresIn || 3600
        },
        valor: {
          original: data.amount.toFixed(2),
          modalidadeAlteracao: 0
        },
        chave: process.env.ONZ_PIX_KEY,
        solicitacaoPagador: data.description,
        infoAdicionais: [
          {
            nome: "correlationID",
            valor: data.correlationID
          }
        ]
      };

      try {
        const response = await axiosInstance.post(`${CASH_IN_URL}/cob`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Client-ID': process.env.ONZ_CLIENT_ID,
            'X-Client-Secret': process.env.ONZ_CLIENT_SECRET,
            'X-API-Key': process.env.ONZ_API_KEY
          },
        });
        
        return {
          qrCode: response.data.pixCopiaECola,
          qrCodeImage: response.data.imagemQrcode,
          paymentLinkUrl: response.data.location,
          expiresAt: new Date(Date.now() + (data.expiresIn || 3600) * 1000).toISOString()
        };
      } catch (error) {
        console.error('Erro ao criar cobrança PIX:', error.response?.data || error.message);
        throw error;
      }
    },

    status: async (transactionId: string) => {
      try {
        const response = await axiosInstance.get(`${CASH_IN_URL}/cob/${transactionId}`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Client-ID': process.env.ONZ_CLIENT_ID,
            'X-Client-Secret': process.env.ONZ_CLIENT_SECRET,
            'X-API-Key': process.env.ONZ_API_KEY
          },
        });

        const statusMap = {
          'ATIVA': 'pending',
          'CONCLUIDA': 'completed',
          'REMOVIDA_PELO_USUARIO_RECEBEDOR': 'cancelled',
          'REMOVIDA_PELO_PSP': 'cancelled'
        };

        return {
          status: statusMap[response.data.status] || 'pending',
          paidAmount: response.data.valor?.pago || 0,
          paidAt: response.data.pix?.[0]?.horario
        };
      } catch (error) {
        console.error('Erro ao consultar status PIX:', error.response?.data || error.message);
        throw error;
      }
    },

    refund: async (data: {
      correlationID: string;
      amount: number;
      reason?: string;
    }) => {
      try {
        const response = await axiosInstance.post(`${CASH_OUT_URL}/pix/devolucao`, {
          valor: data.amount.toFixed(2),
          txid: data.correlationID,
          motivo: data.reason || 'Devolução solicitada'
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Client-ID': process.env.ONZ_CLIENT_ID,
            'X-Client-Secret': process.env.ONZ_CLIENT_SECRET,
          },
        });
        return response.data;
      } catch (error) {
        console.error('Erro ao criar reembolso PIX:', error.response?.data || error.message);
        throw error;
      }
    },
  },
};
