import axios from 'axios';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger.config';

const CASH_OUT_URL = 'https://secureapi.ecomovi-prod.onz.software';
const CASH_IN_URL = 'https://api.pix.ecomovi.com.br';

// Configuração do certificado PFX
const certPath = path.join(process.cwd(), 'src', 'certs');
const pfx = fs.readFileSync(path.join(certPath, 'ECOMOVI_27.pfx'));

logger.info('Certificado PFX carregado', {
  certPath: certPath,
  pfxSize: pfx.length
});

// Criar instância do Axios com configuração SSL usando PFX
const axiosInstance = axios.create({
  timeout: 10000,
  httpsAgent: new https.Agent({
    pfx: pfx,
    passphrase: 'onzsoftware'
  }),
});

interface PixCreateData {
  amount: number;
  correlationID: string;
  description?: string;
  expiresIn?: number;
}

interface PixRefundData {
  correlationID: string;
  amount: number;
  reason?: string;
}

const createPix = async (data: PixCreateData) => {
  try {
    const txid = data.correlationID.replace(/[^a-zA-Z0-9]/g, '').substring(0, 35).padEnd(26, '0');

    logger.info('Iniciando criação de cobrança PIX', {
      correlationID: data.correlationID,
      amount: data.amount,
      url: `${CASH_IN_URL}/cob/${txid}`
    });

    const payload = {
      calendario: {
        expiracao: data.expiresIn || 3600
      },
      valor: {
        original: data.amount.toFixed(2)
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

    logger.debug('Payload da requisição', { payload });

    const response = await axiosInstance.put(`${CASH_IN_URL}/cob/${txid}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': process.env.ONZ_CLIENT_ID,
        'X-Client-Secret': process.env.ONZ_CLIENT_SECRET
      },
    });
    
    logger.info('Cobrança PIX criada com sucesso', {
      correlationID: data.correlationID,
      txid,
      responseStatus: response.status
    });

    return {
      qrCode: response.data.pixCopiaECola,
      qrCodeImage: response.data.imagemQrcode,
      paymentLinkUrl: response.data.location,
      expiresAt: new Date(Date.now() + (data.expiresIn || 3600) * 1000).toISOString()
    };
  } catch (error) {
    logger.error('Erro ao criar cobrança PIX', {
      error: error.response?.data || error.message,
      correlationID: data.correlationID,
      code: error.code,
      stack: error.stack,
      config: error.config
    });

    throw error;
  }
};

const getPixStatus = async (transactionId: string) => {
  try {
    const txid = transactionId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 35).padEnd(26, '0');
    
    const response = await axiosInstance.get(`${CASH_IN_URL}/cob/${txid}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': process.env.ONZ_CLIENT_ID,
        'X-Client-Secret': process.env.ONZ_CLIENT_SECRET
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
    logger.error('Erro ao consultar status PIX', {
      error: error.response?.data || error.message,
      transactionId,
      stack: error.stack
    });
    throw error;
  }
};

const refundPix = async (data: PixRefundData) => {
  try {
    const txid = data.correlationID.replace(/[^a-zA-Z0-9]/g, '').substring(0, 35).padEnd(26, '0');
    
    const response = await axiosInstance.post(`${CASH_OUT_URL}/pix/devolucao`, {
      valor: data.amount.toFixed(2),
      txid: txid,
      motivo: data.reason || 'Devolução solicitada'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': process.env.ONZ_CLIENT_ID,
        'X-Client-Secret': process.env.ONZ_CLIENT_SECRET
      },
    });
    return response.data;
  } catch (error) {
    logger.error('Erro ao criar reembolso PIX', {
      error: error.response?.data || error.message,
      correlationID: data.correlationID,
      stack: error.stack
    });
    throw error;
  }
};

export const onzClient = {
  pix: {
    create: createPix,
    status: getPixStatus,
    refund: refundPix,
  },
};