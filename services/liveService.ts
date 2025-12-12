
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { allTools, BASE_INSTRUCTION } from './geminiService';
import { APIService } from './apiService';

// Audio format utilities (copied from guidelines)
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export class LiveService {
  private ai: GoogleGenAI;
  private nextStartTime = 0;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputNode: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private stream: MediaStream | null = null;
  private sessionPromise: Promise<any> | null = null;
  private userCredentials: { cpfCnpj: string, password?: string, contractId: string | number } | null = null;
  private onVisualContent?: (type: string, title: string, content: string, secondary?: string) => void;
  private currentContext: string = '';

  constructor() {
    const apiKey = process.env.API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  // Configura a integração com o painel do carro e SMARTWATCH
  private updateCarMediaDisplay(state: 'speaking' | 'listening' | 'idle') {
    if (!('mediaSession' in navigator)) return;

    // Textos otimizados para telas pequenas (Apple Watch / Galaxy Watch)
    let title = "CITmax";
    let artist = "Aguardando...";
    let playbackState: MediaSessionPlaybackState = "none";

    if (state === 'speaking') {
        title = "Maxxi (IA)";
        artist = "Falando...";
        playbackState = "playing";
    } else if (state === 'listening') {
        title = "Maxxi (IA)";
        artist = "Ouvindo...";
        playbackState = "paused";
    }

    navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: artist,
        album: "Central do Assinante",
        // Tamanhos variados garantem que o ícone apareça nítido no relógio (96x96) e no carro (512x512)
        artwork: [
            { src: './icon.svg', sizes: '96x96', type: 'image/svg+xml' },
            { src: './icon.svg', sizes: '128x128', type: 'image/svg+xml' },
            { src: './icon.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: './icon.svg', sizes: '256x256', type: 'image/svg+xml' },
            { src: './icon.svg', sizes: '384x384', type: 'image/svg+xml' },
            { src: './icon.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
    });

    navigator.mediaSession.playbackState = playbackState;

    // Handlers
    navigator.mediaSession.setActionHandler('stop', () => {
        this.stop();
    });
    try {
        // 'hangup' é suportado por alguns wearables para encerrar chamadas VoIP
        navigator.mediaSession.setActionHandler('hangup' as any, () => {
            this.stop();
        });
    } catch (e) {
        console.warn("MediaSession action 'hangup' not supported");
    }
  }

  private getTimeBasedGreeting(context: string): string {
    const now = new Date();
    const hour = now.getHours();
    
    // Extract Name
    const nameMatch = context.match(/Nome: (.*?)\n/);
    const firstName = nameMatch ? nameMatch[1].split(' ')[0] : 'Cliente';

    // Extract Birthdate logic
    const birthMatch = context.match(/Data Nascimento: (.*?)\n/);
    let birthdayMsg = "";
    
    if (birthMatch && birthMatch[1] && birthMatch[1] !== 'Não informado') {
        const birthStr = birthMatch[1].trim(); 
        try {
            const birthDate = new Date(birthStr);
            if (!isNaN(birthDate.getTime())) {
                const today = new Date();
                const [bYear, bMonth, bDay] = birthStr.split(/[-/]/).map(Number);
                if (bMonth === (today.getMonth() + 1) && bDay === today.getDate()) {
                    birthdayMsg = " E meus parabéns! Feliz aniversário! Muita saúde e paz pra você.";
                }
            }
        } catch (e) {
            console.error("Error parsing date", e);
        }
    }

    let period = 'Boa noite';
    if (hour >= 5 && hour < 12) period = 'Bom dia';
    else if (hour >= 12 && hour < 18) period = 'Boa tarde';

    return `${period}, ${firstName}!${birthdayMsg} Aqui é o Maxxi. Como posso ajudar?`;
  }

  async start(
    context: string,
    credentials: { cpfCnpj: string, password?: string, contractId: string | number },
    onStatusChange: (status: 'connecting' | 'connected' | 'speaking' | 'listening') => void,
    onVisualContent?: (type: string, title: string, content: string, secondary?: string) => void
  ) {
    this.userCredentials = credentials;
    this.onVisualContent = onVisualContent;
    this.currentContext = context;
    
    onStatusChange('connecting');
    this.updateCarMediaDisplay('idle');

    // Initialize Audio Contexts
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);
    this.nextStartTime = this.outputAudioContext.currentTime;

    try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
        console.error("Microphone access denied", e);
        throw new Error("Permissão de microfone negada.");
    }

    const specificGreeting = this.getTimeBasedGreeting(context);

    const finalSystemInstruction = `${BASE_INSTRUCTION}

=== DADOS DO CLIENTE EM TEMPO REAL ===
${context}

=== INSTRUÇÃO DE INÍCIO DE CHAMADA (PRIORIDADE MÁXIMA) ===
Você está em uma chamada de voz ao vivo.
ASSIM QUE A CONEXÃO INICIAR, VOCÊ DEVE FALAR IMEDIATAMENTE A SEGUINTE FRASE (com tom natural e acolhedor):
"${specificGreeting}"

Não diga "Olá" duas vezes. Use exatamente a frase acima. Depois aguarde o cliente falar.`;

    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          onStatusChange('connected');
          this.updateCarMediaDisplay('listening');
          this.setupAudioInput();
          // We rely on the system instruction to trigger the greeting, no manual send needed.
        },
        onmessage: async (message: LiveServerMessage) => {
          // Handle Audio Output
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio && this.outputAudioContext) {
            onStatusChange('speaking');
            this.updateCarMediaDisplay('speaking');
            
            this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
            
            const audioBuffer = await decodeAudioData(
              decode(base64Audio),
              this.outputAudioContext,
              24000,
              1
            );
            
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputNode!);
            
            source.addEventListener('ended', () => {
              this.sources.delete(source);
              if (this.sources.size === 0) {
                  onStatusChange('listening');
                  this.updateCarMediaDisplay('listening');
              }
            });

            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
          }

          // Handle Tool Calls (Function Calling)
          if (message.toolCall) {
             this.handleToolCall(message.toolCall);
          }

          // Handle Interruption
          if (message.serverContent?.interrupted) {
            this.stopAudioPlayback();
            onStatusChange('listening');
            this.updateCarMediaDisplay('listening');
          }
        },
        onerror: (e) => console.error("Live API Error:", e),
        onclose: () => console.log("Live API Closed"),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          // Using 'Charon' for a male/deep voice
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
        },
        systemInstruction: finalSystemInstruction,
        tools: allTools,
      },
    });
  }

  private setupAudioInput() {
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;

    this.inputNode = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createBlob(inputData);
      
      this.sessionPromise?.then((session: any) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.inputNode.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private stopAudioPlayback() {
    this.sources.forEach(source => source.stop());
    this.sources.clear();
    this.nextStartTime = this.outputAudioContext?.currentTime || 0;
  }

  private async handleToolCall(toolCall: any) {
      if (!this.userCredentials) return;

      for (const fc of toolCall.functionCalls) {
          const args = fc.args;
          let result: any = "Função executada.";

          try {
              if (fc.name === 'sendInvoiceEmail') {
                  let targetEmail = args.email;
                  if (!targetEmail && this.currentContext) {
                      const match = this.currentContext.match(/Email: (.*?)(?:\n|$)/);
                      if (match) targetEmail = match[1].trim();
                  }

                  if (!targetEmail || targetEmail === 'Não cadastrado') {
                      result = "Erro: E-mail não encontrado no cadastro.";
                  } else {
                      const res = await APIService.sendInvoiceEmail(this.userCredentials.cpfCnpj, this.userCredentials.password || '', this.userCredentials.contractId, targetEmail);
                      result = res.msg;
                      
                      // Also trigger visual update
                      if (this.onVisualContent) {
                          this.onVisualContent('status', 'E-mail Enviado', res.msg, targetEmail);
                      }
                  }
              } else if (fc.name === 'showVisualInfo') {
                  if (this.onVisualContent) {
                      this.onVisualContent(args.viewType, args.title, args.content, args.secondaryContent);
                  }
                  result = "Tela atualizada com sucesso.";
              } else if (fc.name === 'checkInvoices') {
                  const invoices = await APIService.getInvoices(this.userCredentials.cpfCnpj, this.userCredentials.password || '', this.userCredentials.contractId);
                  const open = invoices.filter((i: any) => !i.situacao?.toLowerCase().includes('pago'));
                  result = open.length > 0 
                    ? `Encontrei ${open.length} faturas abertas. A primeira vence em ${open[0].vencimento}, valor ${open[0].valor}. Código Pix: ${open[0].codigo_pix}`
                    : "Não há faturas pendentes.";
              } else if (fc.name === 'checkConnection') {
                  const conns = await APIService.getConnectionDiagnostics(this.userCredentials.cpfCnpj, this.userCredentials.password, this.userCredentials.contractId);
                  const active = conns.find((c:any) => c.online);
                  result = active ? "O cliente está online agora." : "O equipamento parece estar offline.";
              } else if (fc.name === 'unlockTrust') {
                  await APIService.unlockService(this.userCredentials.cpfCnpj, this.userCredentials.password || '', this.userCredentials.contractId);
                  result = "Desbloqueio de confiança solicitado com sucesso.";
              } else if (fc.name === 'openSupportTicket') {
                  await APIService.openSupportTicket(
                      this.userCredentials.cpfCnpj, 
                      this.userCredentials.password || '', 
                      this.userCredentials.contractId,
                      args.conteudo,
                      args.contato,
                      args.contato_numero,
                      args.ocorrenciatipo
                  );
                  result = "Chamado aberto com sucesso.";
              } else if (fc.name === 'searchDeezer') {
                  const tracks = await APIService.searchDeezer(args.query);
                  if (tracks && tracks.length > 0) {
                      const bestMatch = tracks[0];
                      // Trigger Visual Update in Car Mode
                      if (this.onVisualContent) {
                          this.onVisualContent(
                              'music', 
                              bestMatch.title, 
                              bestMatch.artist.name, 
                              JSON.stringify({ 
                                  cover: bestMatch.album.cover_big || bestMatch.album.cover_medium, 
                                  link: bestMatch.link 
                              })
                          );
                      }
                      
                      // Update Car Metadata for Music
                      if ('mediaSession' in navigator) {
                          navigator.mediaSession.metadata = new MediaMetadata({
                              title: bestMatch.title,
                              artist: bestMatch.artist.name,
                              album: bestMatch.album.title,
                              artwork: [{ src: bestMatch.album.cover_medium, sizes: '256x256', type: 'image/jpeg' }]
                          });
                      }

                      result = `Encontrei a música ${bestMatch.title} de ${bestMatch.artist.name}. Coloquei na tela para você.`;
                  } else {
                      result = "Não encontrei essa música no Deezer.";
                  }
              }
          } catch (e: any) {
              result = "Erro ao executar: " + e.message;
          }

          this.sessionPromise?.then((session: any) => {
              session.sendToolResponse({
                  functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result: result }
                  }
              });
          });
      }
  }

  stop() {
    // Reset Car Display
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = "none";
    }

    // Close session
    this.sessionPromise?.then((s: any) => s.close());
    this.sessionPromise = null;

    // Stop Audio
    this.stopAudioPlayback();
    this.inputNode?.disconnect();
    this.processor?.disconnect();
    
    // Stop Stream
    this.stream?.getTracks().forEach(t => t.stop());
    
    // Close Contexts
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
  }
}
