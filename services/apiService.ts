
import { SGPContract, SGPInvoice, SGPFiscalInvoice, SGPTrafficResponse, SGPUnlockResponse, SGPRadiusResult, SGPTicketResponse, SGPMaintenance, BrasilAPIAddress, SGPServiceOrder, DeezerTrack } from '../types';

const BASE_URL = 'https://citrn.sgp.net.br/api/central';
// Token provided for the Fiscal Invoice API and URA API
const FISCAL_APP_NAME = 'apicitmax';
const FISCAL_APP_TOKEN = '032ae0e7-7ce0-4391-a509-650573057d34';

// --- CONFIGURAÇÃO DE TESTE DE VELOCIDADE ---
const SPEEDTEST_PING_URL_PRIMARY = 'https://speedtest.citmax.com.br'; 
const SPEEDTEST_PING_URL_FALLBACK = 'https://www.google.com/generate_204'; 
const SPEEDTEST_DOWNLOAD_URL = 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Snake_River_%285mb%29.jpg'; 
const SPEEDTEST_FILE_SIZE_BITS = 5 * 1024 * 1024 * 8; 

export class APIService {
  
  private static getCleanCpf(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }

  /**
   * Search for music on Deezer using JSONP.
   * This is the official way to consume Deezer API on client-side to avoid CORS issues.
   */
  static async searchDeezer(query: string): Promise<DeezerTrack[]> {
    return new Promise((resolve, reject) => {
      // Create a unique callback name
      const callbackName = 'deezer_jsonp_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      
      // Create the script tag
      const script = document.createElement('script');
      
      // Define the global callback function that Deezer will execute
      (window as any)[callbackName] = (data: any) => {
        // Cleanup
        delete (window as any)[callbackName];
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }

        // Process Data
        if (data && data.data) {
          resolve(data.data as DeezerTrack[]);
        } else {
          // If query returns empty or error structure
          resolve([]);
        }
      };

      // Handle script loading errors
      script.onerror = () => {
        delete (window as any)[callbackName];
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        reject(new Error('Falha na conexão com Deezer via JSONP'));
      };

      // Construct URL with JSONP output
      const targetUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5&output=jsonp&callback=${callbackName}`;
      
      script.src = targetUrl;
      document.body.appendChild(script);
    });
  }

  /**
   * Authenticates the user and retrieves their contracts.
   */
  static async login(cpfcnpj: string, senha: string): Promise<SGPContract[]> {
    const formData = new FormData();
    // Using cleaned CPF ensures consistency with other endpoints
    formData.append('cpfcnpj', APIService.getCleanCpf(cpfcnpj));
    formData.append('senha', senha);
    // Adding app/token to login might help with session context on backend
    formData.append('app', FISCAL_APP_NAME);
    formData.append('token', FISCAL_APP_TOKEN);

    try {
      const response = await fetch(`${BASE_URL}/contratos`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro na conexão: ${response.statusText}`);
      }

      const jsonResponse = await response.json();
      let rawContracts: any[] = [];

      if (jsonResponse.data && Array.isArray(jsonResponse.data.contratos)) {
        rawContracts = jsonResponse.data.contratos;
      } else if (jsonResponse.contratos && Array.isArray(jsonResponse.contratos)) {
        rawContracts = jsonResponse.contratos;
      } else if (Array.isArray(jsonResponse)) {
        rawContracts = jsonResponse;
      } else if (jsonResponse.id_contrato || jsonResponse.contrato) {
        rawContracts = [jsonResponse];
      } else if (jsonResponse.erro || jsonResponse.error) {
         throw new Error(jsonResponse.erro || jsonResponse.error);
      }

      if (rawContracts.length === 0) {
        return [];
      }

      return rawContracts.map(item => {
        const getStr = (val: any) => (val !== undefined && val !== null) ? String(val).trim() : '';

        const id = getStr(item.contrato || item.id_contrato || item.id || item.cod_contrato || '0');
        
        const razaoSocial = getStr(
          item.razaosocial || item.razao_social || item.nome || item.cliente || item.nome_cliente || 'Cliente CITmax'
        );

        let enderecoData = item.endereco_instalacao || {};
        if (!item.endereco_instalacao && item.logradouro) {
             enderecoData = item;
        }

        const logradouro = getStr(enderecoData.logradouro || item.endereco || item.rua || item.endereco_res || 'Endereço não informado');
        const numero = getStr(enderecoData.numero || item.numero || item.numero_res || 'S/N');
        const bairro = getStr(enderecoData.bairro || item.bairro || item.bairro_res);
        const cidade = getStr(enderecoData.cidade || item.cidade || item.cidade_res);
        const estado = getStr(enderecoData.uf || item.estado || item.uf_res);
        const cep = getStr(enderecoData.cep || item.cep || item.cep_res);

        let planParts: string[] = [];
        let totalValue = 0;

        if (item.planointernet) {
            planParts.push(item.planointernet);
            totalValue += parseFloat(item.planointernet_valor || 0);
        }
        if (item.planotv) {
            planParts.push(item.planotv);
            totalValue += parseFloat(item.planotv_valor || 0);
        }
        if (item.planotelefonia) {
            planParts.push(item.planotelefonia);
            totalValue += parseFloat(item.planotelefonia_valor || 0);
        }
        if (item.planomultimidia) {
            planParts.push(item.planomultimidia);
            totalValue += parseFloat(item.planomultimidia_valor || 0);
        }

        if (planParts.length === 0) {
            const genericPlan = getStr(item.plano || item.descricao_plano || item.nome_plano || item.pacote);
            if (genericPlan) planParts.push(genericPlan);
            
            const genericValue = parseFloat(item.valor || item.valor_mensal || item.valor_contrato || item.preco || 0);
            if (totalValue === 0) totalValue = genericValue;
        }

        const finalPlanName = planParts.join(' + ') || 'Plano Personalizado';
        const statusRaw = getStr(item.status || item.status_internet || item.situacao || 'Ativo');

        return {
          id_contrato: id,
          id_cliente: getStr(item.id_cliente || item.cliente_id),
          razao_social: razaoSocial,
          cnpj_cpf: getStr(item.cpfcnpj || item.cnpj_cpf || item.cpf || item.cnpj || cpfcnpj),
          email: getStr(item.email || item.email_cliente || item.email_contato),
          data_nascimento: getStr(item.data_nascimento || item.nascimento || item.data_nasc || item.datanascimento),
          contrato: id,
          status: statusRaw,
          data_cadastro: getStr(item.data_cadastro || item.data_ativacao),
          endereco: logradouro,
          numero: numero,
          bairro: bairro,
          cidade: cidade,
          estado: estado,
          cep: cep,
          plano: finalPlanName,
          valor: totalValue
        };
      }) as SGPContract[];

    } catch (error: any) {
      console.error("API Login Error:", error);
      throw error;
    }
  }

  /**
   * Sends the invoice to the customer's email.
   */
  static async sendInvoiceEmail(cpfcnpj: string, senha: string, contratoId: string | number, email: string): Promise<{ success: boolean, msg: string }> {
    const formData = new FormData();
    formData.append('cpfcnpj', APIService.getCleanCpf(cpfcnpj));
    formData.append('senha', senha);
    formData.append('contrato', String(contratoId));
    formData.append('email', email);

    try {
      const response = await fetch(`${BASE_URL}/envia2via/`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      // Some APIs return status 1 for success, others use boolean properties
      if (response.ok && (data.status === 1 || data.sucesso === true || data.msg?.toLowerCase().includes('sucesso'))) {
          return { success: true, msg: data.msg || 'E-mail enviado com sucesso.' };
      } else {
          return { success: false, msg: data.msg || 'Erro ao enviar e-mail.' };
      }
    } catch (error: any) {
      console.error("Error sending invoice email:", error);
      return { success: false, msg: error.message || 'Erro de conexão.' };
    }
  }

  /**
   * Fetches invoices (faturas) for a specific contract.
   * IMPLEMETS CACHE FALLBACK (ANTI-BLACKOUT)
   */
  static async getInvoices(cpfcnpj: string, senha: string, contratoId: string | number): Promise<SGPInvoice[]> {
    if (!contratoId || String(contratoId) === '0') return [];

    const cacheKey = `citmax_cache_invoices_${contratoId}`;

    const formData = new FormData();
    formData.append('cpfcnpj', APIService.getCleanCpf(cpfcnpj));
    formData.append('senha', senha);
    formData.append('contrato', String(contratoId));
    formData.append('app', FISCAL_APP_NAME);
    formData.append('token', FISCAL_APP_TOKEN);

    try {
      const response = await fetch(`${BASE_URL}/titulos/`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Falha ao buscar faturas: ${response.statusText}`);

      const data = await response.json();
      let rawInvoices: any[] = [];

      if (data && data.data && Array.isArray(data.data.faturas)) {
          rawInvoices = data.data.faturas;
      } else if (Array.isArray(data)) {
        rawInvoices = data;
      } else if (data && Array.isArray(data.titulos)) {
        rawInvoices = data.titulos;
      } else if (data && Array.isArray(data.faturas)) {
        rawInvoices = data.faturas;
      }

      const processedInvoices = rawInvoices.map((item: any) => ({
        id: item.id || item.id_titulo || item.numero_documento || Math.random(),
        vencimento: item.vencimento || item.data_vencimento || '',
        vencimento_atualizado: item.vencimento_atualizado,
        valor: item.valor || item.valor_titulo || item.valor_total || 0,
        valor_corrigido: item.valorcorrigido || item.valor_corrigido || item.valor,
        valor_pago: item.valor_pago || item.pago || 0,
        data_pagamento: item.data_pagamento || item.pagamento || null,
        situacao: item.status || item.situacao || (item.data_pagamento ? 'Pago' : 'Aberto'),
        linha_digitavel: item.linhadigitavel || item.linha_digitavel || item.codigo_barra || '',
        codigo_pix: item.codigopix || item.qr_code_pix || '',
        link_boleto: item.link_completo || item.link || item.url_imprimir || item.url || '',
        link_recibo: item.recibo || item.link_recibo || '',
        descricao: item.descricao || item.historico || 'Fatura Mensal'
      })).sort((a: any, b: any) => new Date(b.vencimento).getTime() - new Date(a.vencimento).getTime());

      // Save to Cache on Success
      localStorage.setItem(cacheKey, JSON.stringify(processedInvoices));
      
      return processedInvoices;

    } catch (error) {
      console.warn("API Invoice Failed, trying cache:", error);
      
      // Try Load from Cache
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
          try {
              const invoices = JSON.parse(cached);
              // Mark invoices as from cache if needed, or simply return them
              return invoices;
          } catch(e) {
              console.error("Cache parsing error", e);
          }
      }
      
      // If no cache, return empty array to prevent crash
      return [];
    }
  }

  /**
   * Fetches fiscal invoices (Notas Fiscais).
   */
  static async getFiscalInvoices(contractId: string | number): Promise<SGPFiscalInvoice[]> {
    const formData = new FormData();
    formData.append('app', FISCAL_APP_NAME);
    formData.append('token', FISCAL_APP_TOKEN);
    formData.append('contrato', String(contractId));

    try {
      const response = await fetch(`${BASE_URL}/notafiscal/list/`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Falha ao buscar notas fiscais');

      const jsonResponse = await response.json();
      let rawData: any[] = [];

      if (jsonResponse.status === 200 && Array.isArray(jsonResponse.data)) {
        rawData = jsonResponse.data;
      } else if (Array.isArray(jsonResponse)) {
        rawData = jsonResponse;
      }

      return rawData.map((item: any) => ({
        numero: item.numero,
        serie: item.serie,
        data_emissao: item.data_emissao,
        valor_total: item.valortotal || item.valor_total || 0,
        link_pdf: item.link,
        empresa_razao_social: item.empresa_razao_social,
        status: item.status,
        descricao: item.infcomp
      })).sort((a: any, b: any) => new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime());

    } catch (error) {
      console.error("Error fetching fiscal invoices:", error);
      return [];
    }
  }

  /**
   * Fetches traffic extract (Extrato de Uso).
   */
  static async getTrafficExtract(
    cpfcnpj: string, 
    senha: string, 
    contratoId: string | number,
    month: number,
    year: number
  ): Promise<SGPTrafficResponse | null> {
    const formData = new FormData();
    formData.append('cpfcnpj', APIService.getCleanCpf(cpfcnpj));
    formData.append('senha', senha);
    formData.append('contrato', String(contratoId));
    formData.append('ano', String(year));
    formData.append('mes', String(month).padStart(2, '0'));
    // Including app/token to avoid 403 Forbidden
    formData.append('app', FISCAL_APP_NAME);
    formData.append('token', FISCAL_APP_TOKEN);

    try {
      const response = await fetch(`${BASE_URL}/extratouso/`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Falha ao buscar extrato de tráfego');

      const jsonResponse = await response.json();
      if (jsonResponse.status === 200 && jsonResponse.data) {
        return jsonResponse.data as SGPTrafficResponse;
      }
      return null;
    } catch (error) {
      console.error("Error fetching traffic extract:", error);
      return null;
    }
  }

  /**
   * Fetches detailed connection diagnostics using the WS Radius API.
   * RETURNS ALL SESSIONS (History), not just the active one.
   * REQUEST METHOD: POST JSON Body
   * URL: https://citrn.sgp.net.br/ws/radius/radacct/list/all/
   */
  static async getConnectionDiagnostics(cpfcnpj: string, senha?: string, contratoId?: string | number): Promise<SGPRadiusResult[]> {
    // 1. Prepare Payload matching the curl request exactly
    const payload = {
        app: "apicitmax",
        token: "032ae0e7-7ce0-4391-a509-650573057d34",
        tipoconexao: "ppp",
        cpfcnpj: APIService.getCleanCpf(cpfcnpj)
    };

    try {
      const response = await fetch('https://citrn.sgp.net.br/ws/radius/radacct/list/all/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Radius Response Error:", response.status, errorText);
        throw new Error(`Radius API Error: ${response.status} - ${errorText}`);
      }

      const jsonResponse = await response.json();
      
      let services: any[] = [];
      
      // 3. Handle specific response structure
      if (jsonResponse.result && Array.isArray(jsonResponse.result)) {
          services = jsonResponse.result;
      } 
      else if (jsonResponse.data && Array.isArray(jsonResponse.data.result)) {
          services = jsonResponse.data.result;
      } 
      else if (jsonResponse.data && Array.isArray(jsonResponse.data)) {
          services = jsonResponse.data;
      } 
      else if (Array.isArray(jsonResponse)) {
          services = jsonResponse;
      }

      // 4. Flatten all 'radacct' sessions from all services found
      // This ensures we get the FULL history, not just the latest session per login
      const allSessions = services.flatMap((service: any) => {
          const sessions = Array.isArray(service.radacct) ? service.radacct : [];
          
          return sessions.map((session: any) => ({
              // Fields from the 'radacct' session object
              username: session.username || service.pppoe_login || '',
              acctstarttime: session.acctstarttime || new Date().toISOString(),
              acctstoptime: session.acctstoptime || null, 
              acctinputoctets: parseInt(session.acctinputoctets || 0), // Upload
              acctoutputoctets: parseInt(session.acctoutputoctets || 0), // Download
              acctterminatecause: session.acctterminatecause || null,
              nasipaddress: session.nasipaddress || '',
              framedipaddress: session.framedipaddress || service.ip || '',
              callingstationid: session.callingstationid || '', // MAC
              acctsessionid: session.acctsessionid || '',
              
              // Inherit fields from parent service object for context
              pppoe_login: service.pppoe_login || '',
              online: !session.acctstoptime, // If no stop time, it is the active session
              ip: session.framedipaddress || service.ip || '',
              mac: session.callingstationid || '',
              plano: service.plano, 
              endereco_logradouro: service.endereco_logradouro
          }));
      });

      // Sort by start time descending (newest first)
      return allSessions.sort((a, b) => 
        new Date(b.acctstarttime).getTime() - new Date(a.acctstarttime).getTime()
      );

    } catch (error) {
      console.error("Error fetching connection diagnostics:", error);
      throw error;
    }
  }

  /**
   * Unlock Service
   */
  static async unlockService(cpfcnpj: string, senha: string, contratoId: string | number): Promise<SGPUnlockResponse> {
    const formData = new FormData();
    formData.append('cpfcnpj', APIService.getCleanCpf(cpfcnpj));
    formData.append('senha', senha);
    formData.append('contrato', String(contratoId));

    try {
      const response = await fetch(`${BASE_URL}/promessapagamento/`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Falha na conexão ao tentar liberar serviço.');
      return await response.json();
    } catch (error) {
      console.error("Error unlocking service:", error);
      throw error;
    }
  }

  /**
   * Support Ticket
   */
  static async openSupportTicket(
    cpfcnpj: string,
    senha: string,
    contratoId: string | number,
    conteudo: string,
    contato: string,
    contatoNumero: string,
    ocorrenciaTipo: string
  ): Promise<SGPTicketResponse> {
    const payload = {
        app: FISCAL_APP_NAME,
        token: FISCAL_APP_TOKEN,
        contrato: contratoId,
        ocorrenciatipo: ocorrenciaTipo,
        conteudo: conteudo,
        observacao: `Contato: ${contato} | Tel: ${contatoNumero}`,
        notificar_cliente: 1
    };

    try {
      const response = await fetch(`https://citrn.sgp.net.br/api/ura/chamado/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Erro ao abrir chamado.');
      return await response.json();
    } catch (error) {
      console.error("Error opening ticket:", error);
      throw error;
    }
  }

  /**
   * Get list of Service Orders (Chamados)
   */
  static async getServiceOrders(cpfcnpj: string, senha: string, contratoId: string | number): Promise<SGPServiceOrder[]> {
    const formData = new FormData();
    formData.append('cpfcnpj', APIService.getCleanCpf(cpfcnpj));
    formData.append('senha', senha);
    formData.append('contrato', String(contratoId));
    formData.append('app', FISCAL_APP_NAME);
    formData.append('token', FISCAL_APP_TOKEN);

    try {
      const response = await fetch(`${BASE_URL}/chamado/list/`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Falha ao buscar chamados.');
      
      const json = await response.json();
      let rawData: any[] = [];

      if (json.data && Array.isArray(json.data)) rawData = json.data;
      else if (json.chamados && Array.isArray(json.chamados)) rawData = json.chamados;
      else if (Array.isArray(json)) rawData = json;

      // Helper to convert DD/MM/YYYY HH:MM:SS to JS Date Object for sorting
      const parsePtDate = (dateStr: string) => {
        if (!dateStr) return new Date(0);
        // Assuming format DD/MM/YYYY HH:MM:SS
        const [datePart, timePart] = dateStr.split(' ');
        if (!datePart) return new Date(0);
        
        const [day, month, year] = datePart.split('/');
        const [hour, minute, second] = timePart ? timePart.split(':') : ['00', '00', '00'];
        
        return new Date(
            parseInt(year), 
            parseInt(month) - 1, 
            parseInt(day), 
            parseInt(hour || '0'), 
            parseInt(minute || '0'), 
            parseInt(second || '0')
        );
      };

      const getStatusLabel = (item: any) => {
          if (item.oc_status_descricao) return item.oc_status_descricao;
          const s = parseInt(item.oc_status || item.status);
          switch(s) {
              case 0: return 'Aberta';
              case 1: return 'Encerrada';
              case 2: return 'Em Execução';
              case 3: return 'Pendente';
              default: return 'Desconhecido';
          }
      };

      return rawData.map((item: any) => ({
        id: item.oc_protocolo || item.id || item.codigo || Math.random(),
        protocolo: item.oc_protocolo || item.protocolo || 'S/N',
        assunto: item.oc_tipo_descricao || item.assunto || item.tipo || 'Suporte Técnico',
        data_abertura: item.oc_data_cadastro || item.data_abertura || '',
        status: getStatusLabel(item),
        data_fechamento: item.oc_data_encerramento || item.data_fechamento,
        mensagem: item.oc_conteudo || item.mensagem || item.descricao,
        tecnico: item.os_tecnico_responsavel || item.tecnico || ''
      })).sort((a: any, b: any) => parsePtDate(b.data_abertura).getTime() - parsePtDate(a.data_abertura).getTime());

    } catch (error) {
      console.error("Error fetching tickets:", error);
      return [];
    }
  }

  /**
   * Fetch Address from BrasilAPI by CEP
   */
  static async getAddressByCep(cep: string): Promise<BrasilAPIAddress | null> {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
      if (!response.ok) throw new Error('CEP não encontrado');
      return await response.json();
    } catch (e) {
      console.error("Erro ao buscar CEP:", e);
      return null;
    }
  }

  /**
   * Fetch Maintenance Notices
   */
  static async getMaintenanceNotices(): Promise<SGPMaintenance[]> {
    const url = `https://citrn.sgp.net.br/api/ura/manutencao/list/?app=${FISCAL_APP_NAME}&token=${FISCAL_APP_TOKEN}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
         console.warn("API de Manutenção retornou erro:", response.status);
         return [];
      }
      
      const json = await response.json();
      
      // Determine array location based on potential API structures
      let list = [];
      if (Array.isArray(json)) list = json;
      else if (json.data && Array.isArray(json.data)) list = json.data;
      else if (json.manutencoes && Array.isArray(json.manutencoes)) list = json.manutencoes;
      else if (json.result && Array.isArray(json.result)) list = json.result;
      
      return list.map((item: any) => ({
        id: item.id || item.codigo || Math.random(),
        titulo: item.titulo || item.assunto || 'Aviso de Manutenção',
        mensagem: item.mensagem || item.descricao || item.texto || 'Manutenção programada na rede.',
        data_inicio: item.data_inicio || item.inicio || item.datainicio,
        previsao: item.previsao || item.fim || item.data_fim || item.datafim,
        bairros_afetados: item.bairros || item.locais || item.afetados || ''
      }));

    } catch (e) {
      console.error("Erro ao buscar avisos de manutenção:", e);
      return [];
    }
  }

  /**
   * Measure Connection Quality
   */
  static async measureConnectionQuality(): Promise<{ latency: number, downloadSpeedMbps: number, server: string }> {
    const startTime = Date.now();
    let serverUsed = 'Detectando...';
    
    try {
        await fetch(SPEEDTEST_PING_URL_PRIMARY, { mode: 'no-cors', cache: 'no-store' });
        serverUsed = 'CITmax (170.82.255.251)';
    } catch(e) {
        try {
            await fetch(SPEEDTEST_PING_URL_FALLBACK, { mode: 'no-cors', cache: 'no-store' });
            serverUsed = 'Google (Fallback)';
        } catch(e2) {
            serverUsed = 'Localhost (Erro)';
        }
    }
    
    const latency = Date.now() - startTime;
    const downloadStart = Date.now();
    
    try {
        await fetch(`${SPEEDTEST_DOWNLOAD_URL}?t=${Date.now()}`, { mode: 'cors', cache: 'no-store' });
    } catch(e) {
        await fetch(`https://www.google.com/images/branding/googlelogo/2x/googlelogo_light_color_272x92dp.png?t=${Date.now()}`, { mode: 'no-cors' });
    }
    const durationSeconds = (Date.now() - downloadStart) / 1000;
    const speedMbps = (SPEEDTEST_FILE_SIZE_BITS / durationSeconds) / (1024 * 1024);

    return {
        latency,
        downloadSpeedMbps: speedMbps > 0 ? parseFloat(speedMbps.toFixed(2)) : 0,
        server: serverUsed
    };
  }

  static bytesToGB(bytes: number): string {
    if (!bytes || isNaN(bytes)) return '0,00 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(2).replace('.', ',') + ' GB';
  }

  static formatCurrency(value: string | number): string {
    if (value === undefined || value === null) return 'R$ 0,00';
    let num = typeof value === 'string' ? parseFloat(value.replace('R$', '').trim().replace(/\./g, '').replace(',', '.')) : value;
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  }

  static formatDate(dateString: string): string {
    if (!dateString) return '--/--/----';
    try {
      if (dateString.includes('T')) dateString = dateString.split('T')[0];
      if (dateString.includes(' ')) dateString = dateString.split(' ')[0];
      // Check if it's DD/MM/YYYY
      if (dateString.includes('/') && dateString.split('/').length === 3) return dateString;
      
      const parts = dateString.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return new Intl.DateTimeFormat('pt-BR').format(new Date(dateString));
    } catch (e) {
      return dateString;
    }
  }

  static formatDuration(seconds: number): string {
      if (!seconds) return '0m';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
  }
}
