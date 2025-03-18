import axios from "axios"
import * as https from "https"
import * as fs from "fs"
import * as path from "path"
import { logger } from "./logger.config"

const API_URL = "https://api.pix.ecomovi.com.br"
const PIX_KEY = "45e3ded3-e1cf-432c-99c3-11533a5fd7fe"

// Configuração do certificado PFX
const PFX_PATH = path.join(process.cwd(), 'src/certs/ECOMOVI_27.pfx')
const PFX_PASSWORD = 'onzsoftware'

// Configuração do cliente OAuth
const OAUTH_CONFIG = {
  client_id: "00011112057314471000191",
  client_secret: "jJmM2RiZjUtY2NmZC00MTcyLWJkMmQtM",
  grant_type: "client_credentials"
}

let accessToken: string | null = null
let tokenExpiration: number | null = null

// Função para obter o token de acesso
const getAccessToken = async () => {
  try {
    // Verificar se o token ainda é válido
    if (accessToken && tokenExpiration && Date.now() < tokenExpiration) {
      logger.debug('Using cached access token', { 
        expiresIn: Math.floor((tokenExpiration - Date.now()) / 1000) 
      });
      return accessToken
    }

    logger.info('Obtaining new access token')

    // Verificar se o arquivo PFX existe
    if (!fs.existsSync(PFX_PATH)) {
      logger.error('PFX file not found', { path: PFX_PATH });
      throw new Error('Certificado PFX não encontrado');
    }

    const pfxBuffer = fs.readFileSync(PFX_PATH)
    
    const httpsAgent = new https.Agent({
      pfx: pfxBuffer,
      passphrase: PFX_PASSWORD,
      rejectUnauthorized: false
    })

    logger.debug('Making OAuth request', { 
      url: `${API_URL}/oauth/token`,
      config: { ...OAUTH_CONFIG, client_secret: '***' }
    });

    const response = await axios.post(
      `${API_URL}/oauth/token`,
      OAUTH_CONFIG,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        httpsAgent
      }
    )

    accessToken = response.data.access_token
    // Definir expiração 5 minutos antes do tempo real para garantir renovação
    tokenExpiration = Date.now() + ((response.data.expires_in - 300) * 1000)

    logger.info('New access token obtained', {
      expiresIn: response.data.expires_in,
      tokenLength: accessToken.length
    })

    return accessToken
  } catch (error) {
    logger.error('Error obtaining access token', {
      error: {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        config: {
          url: error.config?.url,
          headers: error.config?.headers,
          data: error.config?.data
        }
      }
    })
    throw new Error(`Erro ao obter token de acesso: ${error.message}`);
  }
}

// Configuração do agente HTTPS com certificado PFX
const getHttpsAgent = () => {
  if (!fs.existsSync(PFX_PATH)) {
    logger.error('PFX file not found when creating HTTPS agent', { path: PFX_PATH });
    throw new Error('Certificado PFX não encontrado');
  }

  const pfxBuffer = fs.readFileSync(PFX_PATH)
  return new https.Agent({
    pfx: pfxBuffer,
    passphrase: PFX_PASSWORD,
    rejectUnauthorized: false
  })
}

// Configuração do Axios com interceptor para token
const axiosInstance = axios.create({
  timeout: 10000,
  httpsAgent: getHttpsAgent()
})

// Adiciona interceptor para incluir o token em todas as requisições
axiosInstance.interceptors.request.use(
  async (config) => {
    if (!config.headers.Authorization) {
      const token = await getAccessToken()
      config.headers.Authorization = `Bearer ${token}`
    }
    
    logger.debug("Enviando requisição", {
      url: config.url,
      method: config.method,
      headers: {
        ...config.headers,
        Authorization: '***'
      },
      data: config.data
    })
    
    return config
  },
  (error) => {
    logger.error("Erro na requisição", { 
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack
      }
    })
    return Promise.reject(error)
  }
)

axiosInstance.interceptors.response.use(
  (response) => {
    logger.debug("Resposta recebida", {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    })
    return response
  },
  (error) => {
    logger.error("Erro na resposta", {
      message: error.message,
      code: error.code,
      response: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      },
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      },
      stack: error.stack
    })
    return Promise.reject(error)
  }
)

interface PixCreateData {
  amount: number
  correlationID: string
  description?: string
  expiresIn?: number
  customerInfo?: {
    name?: string
    document?: string
  }
}

interface PixRefundData {
  correlationID: string
  amount: number
  reason?: string
}

interface PixListReceivedParams {
  inicio: string
  fim: string
  txid?: string
  cpf?: string
  cnpj?: string
  paginacao: {
    pagina: number // Changed from paginaAtual
    itensPorPagina: number
  }
}

const formatCNPJ = (cnpj: string): string => {
  // Remove todos os caracteres não numéricos
  return cnpj.replace(/\D/g, '').padStart(14, '0');
}

const createPix = async (data: PixCreateData) => {
  try {
    logger.info("Iniciando criação de cobrança PIX", {
      correlationID: data.correlationID,
      amount: data.amount
    })

    const payload = {
      calendario: {
        expiracao: data.expiresIn || 3600
      },
      devedor: data.customerInfo ? {
        cnpj: formatCNPJ(data.customerInfo.document || ''),
        nome: data.customerInfo.name
      } : undefined,
      valor: {
        original: data.amount.toFixed(2),
        modalidadeAlteracao: 1
      },
      chave: PIX_KEY,
      solicitacaoPagador: data.description || "Pagamento PIX",
      infoAdicionais: [
        {
          nome: "correlationID",
          valor: data.correlationID
        }
      ]
    }

    logger.debug("Payload da requisição PIX", { payload })

    const response = await axiosInstance.post(`${API_URL}/cob`, payload)

    logger.info("Cobrança PIX criada com sucesso", {
      correlationID: data.correlationID,
      txid: response.data.txid,
      status: response.data.status
    })

    return {
      qrCode: response.data.pixCopiaECola,
      qrCodeImage: response.data.imagemQrcode,
      paymentLinkUrl: response.data.location,
      expiresAt: response.data.calendario.criacao,
      txid: response.data.txid
    }
  } catch (error) {
    logger.error("Erro ao criar cobrança PIX", {
      error: {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        },
        stack: error.stack
      },
      requestData: {
        correlationID: data.correlationID,
        amount: data.amount,
        description: data.description
      }
    })
    throw new Error(`Erro ao criar cobrança PIX: ${error.message}`);
  }
}

const getPixStatus = async (txid: string) => {
  try {
    const response = await axiosInstance.get(`${API_URL}/cob/${txid}`)

    const statusMap = {
      ATIVA: "pending",
      CONCLUIDA: "completed",
      REMOVIDA_PELO_USUARIO_RECEBEDOR: "cancelled",
      REMOVIDA_PELO_PSP: "cancelled",
    }

    return {
      status: statusMap[response.data.status] || "pending",
      paidAmount: response.data.valor?.pago || 0,
      paidAt: response.data.pix?.[0]?.horario,
    }
  } catch (error) {
    logger.error("Erro ao consultar status PIX", {
      error: {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        stack: error.stack
      },
      txid
    })
    throw new Error(`Erro ao consultar status PIX: ${error.message}`);
  }
}

const listReceivedPix = async (params: PixListReceivedParams) => {
  try {
    // Construct query parameters according to API requirements
    const queryParams = new URLSearchParams({
      inicio: params.inicio,
      fim: params.fim,
      'paginacao.pagina': params.paginacao.pagina.toString(),
      'paginacao.itensPorPagina': params.paginacao.itensPorPagina.toString()
    });

    if (params.txid) queryParams.append('txid', params.txid);
    if (params.cpf) queryParams.append('cpf', params.cpf);
    if (params.cnpj) queryParams.append('cnpj', params.cnpj);

    const response = await axiosInstance.get(`${API_URL}/pix?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    logger.error("Erro ao listar PIX recebidos", {
      error: {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        stack: error.stack
      },
      params
    });
    throw new Error(`Erro ao listar PIX recebidos: ${error.message}`);
  }
}

const getPix = async (e2eid: string) => {
  try {
    const response = await axiosInstance.get(`${API_URL}/pix/${e2eid}`);
    return response.data;
  } catch (error) {
    logger.error("Erro ao consultar PIX", {
      error: {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        stack: error.stack
      },
      e2eid
    });
    throw new Error(`Erro ao consultar PIX: ${error.message}`);
  }
}

const refundPix = async (data: PixRefundData) => {
  try {
    logger.info("Iniciando reembolso PIX", {
      correlationID: data.correlationID,
      amount: data.amount
    })

    const payload = {
      valor: data.amount.toFixed(2),
      motivo: data.reason || "Reembolso solicitado"
    }

    const response = await axiosInstance.post(
      `${API_URL}/v2/pix/${data.correlationID}/devolucao`,
      payload
    )

    logger.info("Reembolso PIX criado com sucesso", {
      correlationID: data.correlationID,
      status: response.data.status
    })

    return {
      id: response.data.id,
      status: response.data.status,
      amount: response.data.valor
    }
  } catch (error) {
    logger.error("Erro ao criar reembolso PIX", {
      error: {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        stack: error.stack
      },
      requestData: {
        correlationID: data.correlationID,
        amount: data.amount
      }
    })
    throw new Error(`Erro ao criar reembolso PIX: ${error.message}`);
  }
}

// Função para testar a conexão
const testConnection = async () => {
  try {
    logger.info("Testando conexão com o servidor", { url: API_URL })

    const token = await getAccessToken()
    logger.info("Token de acesso obtido com sucesso")

    const response = await axiosInstance.get(`${API_URL}/cob`)

    logger.info("Conexão bem-sucedida", {
      status: response.status,
      data: response.data,
    })

    return true
  } catch (error) {
    logger.error("Erro ao testar conexão", {
      error: {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        config: error.config,
        stack: error.stack
      }
    })

    return false
  }
}

export const onzClient = {
  pix: {
    create: createPix,
    status: getPixStatus,
    refund: refundPix,
    listReceived: listReceivedPix,
    get: getPix
  },
  test: testConnection,
  getAccessToken
}