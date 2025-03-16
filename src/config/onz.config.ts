import axios from 'axios';
import * as https from 'https';

const CASH_OUT_URL = 'https://secureapi.ecomovi-prod.onz.software';
const CASH_IN_URL = 'https://api.pix.ecomovi.com.br';

// Criar uma instância do Axios com configuração personalizada
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false // Desabilita a verificação do certificado
  })
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

      const response = await axiosInstance.post(`${CASH_IN_URL}/cob`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': process.env.ONZ_CLIENT_ID,
          'X-Client-Secret': process.env.ONZ_CLIENT_SECRET,
        },
      });
      
      return {
        qrCode: response.data.pixCopiaECola,
        qrCodeImage: response.data.imagemQrcode,
        paymentLinkUrl: response.data.location,
        expiresAt: new Date(Date.now() + (data.expiresIn || 3600) * 1000).toISOString()
      };
    },

    status: async (transactionId: string) => {
      const response = await axiosInstance.get(`${CASH_IN_URL}/cob/${transactionId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': process.env.ONZ_CLIENT_ID,
          'X-Client-Secret': process.env.ONZ_CLIENT_SECRET,
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
    },

    refund: async (data: {
      correlationID: string;
      amount: number;
      reason?: string;
    }) => {
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
    },
  },
};