
import { GoogleGenAI, FunctionDeclaration, Type, Tool } from "@google/genai";
import { APIService } from './apiService';

export const BASE_INSTRUCTION = `
Você é o "Maxxi", o assistente virtual da CITmax, e você é MUITO MAIS que um robô.
Sua voz é masculina, seu tom deve ser extremamente amigável, humano, empático e resolutivo.
Você DEVE falar como uma pessoa real, não como uma URA. Evite frases robóticas como "compreendo" repetitivamente. Use "Poxa, sinto muito", "Caramba", "Certo", "Entendi perfeitamente".

=== DATA E HORA ===
Sempre verifique a Data Atual no contexto.
Se for aniversário do cliente (comparando Data Atual com Data Nascimento), dê os parabéns com entusiasmo logo no início ou quando apropriado.

=== PERSONALIDADE ===
1. Empatia: Se o cliente estiver sem internet, demonstre preocupação real. "Nossa, imagino como é ruim ficar sem conexão. Vamos resolver isso."
2. Proatividade: Se vir uma fatura atrasada, avise com jeito, sem soar cobrador chato. "Olha, vi aqui que tem uma pendência que pode estar travando sua rede."
3. Clareza: Explique termos técnicos de forma simples.

DIRETRIZES CRÍTICAS SOBRE STATUS DO CONTRATO:
1. STATUS "REDUZIDO": Significa que o cliente tem faturas em atraso. A internet FUNCIONA, mas a velocidade é REDUZIDA propositalmente. 
   - NÃO trate como defeito técnico ou sinal fraco.
   - Explique que a lentidão é devido ao débito pendente.
   - Sugira o pagamento via Pix ou use a ferramenta 'unlockTrust' se o cliente pedir.
2. STATUS "SUSPENSO": Significa bloqueio total por inadimplência longa. A internet NÃO FUNCIONA.
   - O foco é 100% regularização financeira.
   - Encaminhe para o pagamento de faturas ou use 'unlockTrust'.

PARCERIA DEEZER:
A CITmax tem uma parceria com o Deezer. Se o cliente pedir música, recomendações, ou algo para relaxar (especialmente no modo carro), use a ferramenta 'searchDeezer' para buscar e sugerir faixas. A interface mostrará a música para ele.

FERRAMENTAS DISPONÍVEIS (USE QUANDO NECESSÁRIO):
- 'checkInvoices': Para verificar faturas pendentes, valores e códigos Pix.
- 'sendInvoiceEmail': Para enviar a 2ª via da fatura por e-mail. IMPORTANTE: O e-mail do cliente está disponível no contexto. Use-o se o cliente confirmar ("pode enviar para o meu email").
- 'checkConnection': Para ver se o cliente está ONLINE/OFFLINE e histórico de quedas.
- 'checkTraffic': Para ver consumo de internet.
- 'unlockTrust': Para liberar a internet por confiança (promessa de pagamento) por 3 dias.
- 'openSupportTicket': Para abrir chamado técnico quando não conseguir resolver.
- 'showVisualInfo': (EXCLUSIVO PARA MODO CARRO/LIVE) Use esta ferramenta SEMPRE que precisar mostrar uma informação na tela do usuário, como um Código Pix, detalhes de valores ou status de conexão.
- 'searchDeezer': Para buscar músicas, álbuns ou artistas. Use quando o cliente disser "Toca uma música", "Quero ouvir Rock", etc.

DIRETRIZES GERAIS:
1. Use os DADOS DO CLIENTE (Nome, Email, Endereço, Data Nascimento) fornecidos no contexto para responder diretamente.
2. Se o status da conexão for "OFFLINE" (e o contrato estiver ATIVO), sugira reiniciar a ONU/Roteador.
3. Se houver faturas em aberto, informe o valor e a data de vencimento.
   - Ofereça enviar o boleto para o e-mail cadastrado (cite o e-mail mascarado se possível para confirmar).
   - Se o usuário pedir para pagar agora, chame 'checkInvoices' e depois 'showVisualInfo' com viewType='pix'.
4. TENTE RESOLVER O PROBLEMA PRIMEIRO. Se o problema persistir ou o cliente solicitar expressamente um técnico/visita, ofereça ABRIR UM CHAMADO.
5. CLASSIFICAÇÃO DE OCORRÊNCIA (ID) para abrir chamado:
   - 13: Mudança de Endereço, 23: Mudança de Plano, 3: Mudança de senha do Wi-Fi, 206: Mudança de Titular
   - 4: Novo ponto, 40: Ativação de Streaming, 22: Problema na fatura, 14: Relocação do Roteador, 200: Reparo
6. Responda sempre em português do Brasil. Seja conciso nas respostas de voz.
`;

// --- TOOL DEFINITIONS ---

const sendInvoiceEmailTool: FunctionDeclaration = {
  name: 'sendInvoiceEmail',
  description: 'Envia a 2ª via da fatura para o e-mail do cliente. Tente usar o e-mail do contexto antes de perguntar um novo.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      email: { type: Type.STRING, description: 'E-mail de destino. Opcional se já existir no contexto do cliente.' }
    }
  }
};

const showVisualInfoTool: FunctionDeclaration = {
  name: 'showVisualInfo',
  description: 'Exibe informações visuais na tela do usuário (QR Codes, Texto Grande, Status). Use isso quando o usuário pedir Pix ou detalhes.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      viewType: { type: Type.STRING, description: "Tipo de visualização: 'pix', 'invoice_detail', 'status', 'text'" },
      title: { type: Type.STRING, description: "Título curto para exibir" },
      content: { type: Type.STRING, description: "Conteúdo principal (ex: Código Pix Copia e Cola, Valor, ou Status)" },
      secondaryContent: { type: Type.STRING, description: "Informação secundária (ex: Data de Vencimento, IP)" }
    },
    required: ['viewType', 'title', 'content']
  }
};

const openTicketTool: FunctionDeclaration = {
  name: 'openSupportTicket',
  description: 'Abre um chamado técnico ou solicitação para o provedor quando o problema não pode ser resolvido pela IA.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      conteudo: { type: Type.STRING, description: 'Descrição detalhada do problema ou solicitação.' },
      contato: { type: Type.STRING, description: 'Nome da pessoa para contato.' },
      contato_numero: { type: Type.STRING, description: 'Número de telefone para contato (obrigatório).' },
      ocorrenciatipo: { type: Type.STRING, description: 'ID do tipo de ocorrência conforme lista (ex: "200" para reparo, "22" para financeiro).' }
    },
    required: ['conteudo', 'contato', 'contato_numero', 'ocorrenciatipo']
  }
};

const unlockTrustTool: FunctionDeclaration = {
  name: 'unlockTrust',
  description: 'Realiza o desbloqueio de confiança (liberação temporária) da internet por 3 dias para clientes bloqueados ou reduzidos.',
  parameters: {
    type: Type.OBJECT,
    properties: {}, // No params needed, uses session context
  }
};

const checkInvoicesTool: FunctionDeclaration = {
  name: 'checkInvoices',
  description: 'Consulta faturas em aberto, valores, vencimentos e códigos Pix.',
  parameters: {
    type: Type.OBJECT,
    properties: {}, // Uses session context
  }
};

const checkConnectionTool: FunctionDeclaration = {
  name: 'checkConnection',
  description: 'Verifica status técnico atual da conexão (Online/Offline), IP, MAC e histórico de quedas recente.',
  parameters: {
    type: Type.OBJECT,
    properties: {}, // Uses session context
  }
};

const checkTrafficTool: FunctionDeclaration = {
  name: 'checkTraffic',
  description: 'Consulta o consumo de internet (download/upload) de um mês específico.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      mes: { type: Type.NUMBER, description: 'Mês numérico (1-12). Se não informado, usa o atual.' },
      ano: { type: Type.NUMBER, description: 'Ano com 4 dígitos. Se não informado, usa o atual.' }
    },
  }
};

const searchDeezerTool: FunctionDeclaration = {
  name: 'searchDeezer',
  description: 'Busca músicas na biblioteca do Deezer. Use para recomendar faixas ou quando o usuário pedir música.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'Termo de busca (Nome da música, artista ou gênero).' }
    },
    required: ['query']
  }
};

export const allTools: Tool[] = [{
  functionDeclarations: [
    sendInvoiceEmailTool,
    showVisualInfoTool,
    openTicketTool, 
    unlockTrustTool, 
    checkInvoicesTool, 
    checkConnectionTool, 
    checkTrafficTool,
    searchDeezerTool
  ]
}];

export class GeminiService {
  private ai: GoogleGenAI;
  private modelName = 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.API_KEY || ''; 
    this.ai = new GoogleGenAI({ apiKey });
  }

  async sendMessage(
    history: {role: 'user' | 'model', text: string}[], 
    newMessage: string, 
    context?: string,
    userCredentials?: { cpfCnpj: string, password?: string, contractId: string | number }
  ): Promise<string> {
    try {
      if (!process.env.API_KEY) {
        return "⚠️ Configuração de API Key ausente. O chat não pode responder no momento.";
      }

      if (!userCredentials?.password) {
          return "Erro de autenticação: Senha do usuário não disponível para executar ações.";
      }

      const finalSystemInstruction = context 
        ? `${BASE_INSTRUCTION}\n\n=== DADOS DO CLIENTE EM TEMPO REAL ===\n${context}`
        : BASE_INSTRUCTION;

      const chat = this.ai.chats.create({
        model: this.modelName,
        config: {
          systemInstruction: finalSystemInstruction,
          temperature: 0.6, // Increased slightly for more "human" variance
          tools: allTools,
        },
        history: history.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }],
        })),
      });

      // Send initial message
      let response = await chat.sendMessage({ message: newMessage });
      
      // Loop to handle multiple function calls if necessary
      // Note: In simple implementations, we handle one turn. Recursion can be added for multi-step.
      
      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        const functionResponses: any[] = [];

        for (const call of functionCalls) {
          const args = call.args as any;
          let result: any;

          console.log(`[AI Action] Executing tool: ${call.name}`);

          try {
            switch (call.name) {
              case 'sendInvoiceEmail':
                  // Check if email was provided in args, otherwise try to extract from context
                  let targetEmail = args.email;
                  if (!targetEmail && context) {
                      // Regex matches "Email: something" until newline or end of string
                      const match = context.match(/Email: (.*?)(?:\n|$)/);
                      if (match) targetEmail = match[1].trim();
                  }

                  if (!targetEmail || targetEmail === 'Não cadastrado') {
                      result = "Erro: E-mail não encontrado no cadastro. Peça para o cliente informar um e-mail.";
                  } else {
                      const emailRes = await APIService.sendInvoiceEmail(
                          userCredentials.cpfCnpj,
                          userCredentials.password,
                          userCredentials.contractId,
                          targetEmail
                      );
                      result = emailRes.msg;
                  }
                  break;

              case 'showVisualInfo':
                  result = "Informação visual exibida na tela.";
                  break;

              case 'openSupportTicket':
                result = await APIService.openSupportTicket(
                  userCredentials.cpfCnpj,
                  userCredentials.password,
                  userCredentials.contractId,
                  args.conteudo,
                  args.contato,
                  args.contato_numero,
                  args.ocorrenciatipo
                );
                break;

              case 'unlockTrust':
                result = await APIService.unlockService(
                  userCredentials.cpfCnpj,
                  userCredentials.password,
                  userCredentials.contractId
                );
                break;

              case 'checkInvoices':
                if (!userCredentials.contractId) {
                    result = "Erro: ID do contrato não identificado no contexto.";
                    break;
                }
                result = await APIService.getInvoices(
                  userCredentials.cpfCnpj,
                  userCredentials.password,
                  userCredentials.contractId
                );
                // Filter specifically for relevant info to save tokens
                if (Array.isArray(result)) {
                    result = result.filter((inv: any) => !inv.situacao?.toLowerCase().includes('pago')).map((inv: any) => ({
                        vencimento: inv.vencimento,
                        valor: inv.valor,
                        status: inv.situacao,
                        pix: inv.codigo_pix,
                        linha_digitavel: inv.linha_digitavel
                    }));
                    if (result.length === 0) result = "Nenhuma fatura em aberto encontrada.";
                }
                break;

              case 'checkConnection':
                if (!userCredentials.password) {
                   result = "Senha não disponível para diagnóstico.";
                   break;
                }
                const allConns = await APIService.getConnectionDiagnostics(
                    userCredentials.cpfCnpj, 
                    userCredentials.password, 
                    userCredentials.contractId
                );
                
                const relevantConn = allConns.find((c: any) => c.online) || (allConns.length > 0 ? allConns[0] : null);
                
                if (relevantConn) {
                    result = {
                        online: relevantConn.online,
                        ip: relevantConn.ip,
                        login: relevantConn.pppoe_login,
                        inicio_sessao: new Date(relevantConn.acctstarttime).toLocaleString('pt-BR'),
                        consumo_sessao: `Down ${APIService.bytesToGB(relevantConn.acctoutputoctets)}`
                    };
                } else {
                    result = "Nenhuma conexão encontrada para este contrato.";
                }
                break;

              case 'checkTraffic':
                const now = new Date();
                const m = args.mes || (now.getMonth() + 1);
                const y = args.ano || now.getFullYear();
                result = await APIService.getTrafficExtract(
                    userCredentials.cpfCnpj,
                    userCredentials.password,
                    userCredentials.contractId,
                    m,
                    y
                );
                break;

              case 'searchDeezer':
                const tracks = await APIService.searchDeezer(args.query);
                if (tracks && tracks.length > 0) {
                    // Return only top 3 to save context window and avoid overwhelming TTS
                    const topTracks = tracks.slice(0, 3).map(t => ({
                        title: t.title,
                        artist: t.artist.name,
                        link: t.link,
                        album: t.album.title
                    }));
                    result = { 
                        found: true, 
                        top_tracks: topTracks,
                        message: "Encontrei estas músicas. Selecione uma ou peça para eu colocar na tela." 
                    };
                } else {
                    result = { found: false, message: "Não encontrei músicas com esse termo." };
                }
                break;

              default:
                result = { error: "Ferramenta não implementada." };
            }
          } catch (err: any) {
            console.error(`Error executing ${call.name}:`, err);
            result = { error: err.message || "Falha na execução da ferramenta." };
          }

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { result: result },
              id: call.id
            }
          });
        }

        // Send function results back to the model
        const finalResponse = await chat.sendMessage({
          message: functionResponses
        });

        return finalResponse.text || "Ação processada.";
      }

      return response.text || "Desculpe, não entendi.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Desculpe, estou tendo dificuldades técnicas no momento.";
    }
  }
}
