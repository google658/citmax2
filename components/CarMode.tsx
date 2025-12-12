
import React, { useState, useEffect, useRef } from 'react';
import { SGPContract } from '../types';
import { LiveService } from '../services/liveService';
import { APIService } from '../services/apiService';
import { 
  Wifi, 
  Mic, 
  Volume2, 
  Loader2, 
  X, 
  Radio, 
  ShieldCheck, 
  QrCode, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Car,
  Music,
  Bluetooth
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface CarModeProps {
  contract: SGPContract;
  userCpfCnpj: string;
  userPassword?: string;
  onClose: () => void;
}

export const CarMode: React.FC<CarModeProps> = ({ contract, userCpfCnpj, userPassword, onClose }) => {
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'connected' | 'listening' | 'speaking'>('idle');
  
  // Dynamic Content State
  const [viewType, setViewType] = useState('welcome');
  const [visualTitle, setVisualTitle] = useState('Bem-vindo ao Modo Carro');
  const [visualContent, setVisualContent] = useState('');
  const [visualSecondary, setVisualSecondary] = useState('');
  
  const liveService = useRef<LiveService | null>(null);
  const wakeLock = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Auto start voice on mount
    startVoiceSession();
    requestWakeLock();
    
    return () => {
        liveService.current?.stop();
        releaseWakeLock();
    };
  }, []);

  // --- HACK: Keep Alive Video Loop ---
  // Isso força o iOS/Android a manter a aba ativa e o áudio Bluetooth conectado
  // mesmo se o usuário bloquear a tela ou o app for para segundo plano.
  useEffect(() => {
      if (videoRef.current) {
          videoRef.current.play().catch(e => console.log("Silent video play failed (interaction needed)", e));
      }
  }, []);

  const requestWakeLock = async () => {
      try {
          if ('wakeLock' in navigator) {
              wakeLock.current = await (navigator as any).wakeLock.request('screen');
          }
      } catch (err) {
          console.log('Wake Lock denied or error:', err);
      }
  };

  const releaseWakeLock = () => {
      if (wakeLock.current) {
          wakeLock.current.release();
          wakeLock.current = null;
      }
  };

  const buildContext = async () => {
     let financialInfo = "Financeiro: Verificando...";
     let techInfo = "Conexão: Verificando...";

     try {
         if (userPassword) {
            const timeoutPromise = (promise: Promise<any>, ms: number) => {
                return new Promise((resolve, reject) => {
                    const timer = setTimeout(() => reject(new Error("Timeout")), ms);
                    promise.then(res => {
                        clearTimeout(timer);
                        resolve(res);
                    }).catch(err => {
                        clearTimeout(timer);
                        reject(err);
                    });
                });
            };

            const [invoicesResult, connResult] = await Promise.allSettled([
                APIService.getInvoices(userCpfCnpj, userPassword, contract.id_contrato),
                timeoutPromise(APIService.getConnectionDiagnostics(userCpfCnpj, userPassword, contract.id_contrato), 5000)
            ]);

            if (invoicesResult.status === 'fulfilled') {
                const invoices = invoicesResult.value;
                const openInvoices = invoices.filter(i => !i.situacao?.toLowerCase().includes('pago'));
                if (openInvoices.length > 0) {
                    financialInfo = `O cliente possui ${openInvoices.length} faturas abertas. Valor da mais antiga: ${APIService.formatCurrency(openInvoices[0].valor)}.`;
                } else {
                    financialInfo = "Financeiro em dia.";
                }
            } else {
                financialInfo = "Financeiro: Erro ao consultar.";
            }

            if (connResult.status === 'fulfilled') {
                const conns = connResult.value;
                if (Array.isArray(conns)) {
                    const active = conns.find(c => c.online);
                    techInfo = active ? "Cliente está Online." : "Cliente está Offline.";
                }
            } else {
                techInfo = "Status da conexão: Informação indisponível temporariamente.";
            }
         }
     } catch(e) { console.error(e); }

     return `
=== MODO CARRO / VIVA-VOZ ===
Data Atual: ${new Date().toISOString().split('T')[0]}
Cliente: ${contract.razao_social}
${financialInfo}
${techInfo}
INSTRUÇÃO: Seja extremamente breve. Respostas curtas. O usuário está dirigindo.
     `;
  };

  const startVoiceSession = async () => {
      const context = await buildContext();
      
      liveService.current = new LiveService();
      liveService.current.start(
          context,
          { cpfCnpj: userCpfCnpj, password: userPassword, contractId: contract.id_contrato },
          (status) => setVoiceStatus(status),
          (type, title, content, secondary) => {
              setViewType(type);
              setVisualTitle(title);
              setVisualContent(content);
              setVisualSecondary(secondary || '');
          }
      ).catch(err => {
          console.error(err);
          setVisualTitle("Erro no Microfone");
          setVisualContent("Toque na tela para permitir o áudio.");
      });
  };

  const renderVisualContent = () => {
      switch(viewType) {
          case 'music':
              let coverUrl = '';
              let linkUrl = '#';
              try {
                  const data = JSON.parse(visualSecondary);
                  coverUrl = data.cover;
                  linkUrl = data.link;
              } catch (e) {}

              return (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-slate-900 text-white animate-in zoom-in relative overflow-hidden">
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl"
                        style={{ backgroundImage: `url(${coverUrl})` }}
                      ></div>
                      
                      <div className="relative z-10 w-full flex flex-col items-center">
                          <div className="w-48 h-48 rounded-2xl shadow-2xl mb-6 overflow-hidden border-4 border-white/10">
                              {coverUrl ? (
                                  <img src={coverUrl} alt="Album Art" className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                      <Music className="w-20 h-20 text-slate-600" />
                                  </div>
                              )}
                          </div>
                          
                          <h2 className="text-3xl font-bold font-['Righteous'] mb-2 line-clamp-2">{visualTitle}</h2>
                          <p className="text-xl text-slate-300 font-medium mb-8">{visualContent}</p>
                          
                          <a 
                            href={linkUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-[#00c896] hover:bg-[#00b084] text-[#036271] px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-transform hover:scale-105 shadow-lg shadow-[#00c896]/30"
                          >
                              <Music className="w-5 h-5" />
                              Ouvir no Deezer
                          </a>
                      </div>
                  </div>
              );

          case 'pix':
              return (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-white rounded-3xl animate-in zoom-in">
                      <h2 className="text-2xl font-bold text-slate-800 mb-4">{visualTitle}</h2>
                      <div className="bg-slate-100 p-4 rounded-2xl border-4 border-slate-200 mb-4">
                         <QrCode className="w-48 h-48 text-slate-800" />
                      </div>
                      <p className="text-slate-500 font-mono text-xs break-all line-clamp-2 bg-slate-100 p-2 rounded w-full">
                          {visualContent}
                      </p>
                      {visualSecondary && <p className="mt-4 text-lg font-bold text-[#00c896]">{visualSecondary}</p>}
                  </div>
              );
          
          case 'status':
              return (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-slate-800 text-white rounded-3xl animate-in slide-in-from-right">
                      <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${visualContent.includes('Online') ? 'bg-green-500' : 'bg-red-500'}`}>
                          <Wifi className="w-16 h-16 text-white" />
                      </div>
                      <h2 className="text-3xl font-bold mb-2">{visualTitle}</h2>
                      <p className="text-xl opacity-80">{visualContent}</p>
                      {visualSecondary && (
                          <div className="mt-8 p-4 bg-white/10 rounded-xl w-full">
                              <p className="font-mono text-sm">{visualSecondary}</p>
                          </div>
                      )}
                  </div>
              );

          case 'invoice_detail':
               return (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-white rounded-3xl animate-in fade-in">
                      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                          <AlertTriangle className="w-12 h-12 text-red-500" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">{visualTitle}</h2>
                      <p className="text-4xl font-bold text-[#036271] my-4">{visualContent}</p>
                      <p className="text-slate-500 font-medium flex items-center gap-2">
                          <Clock className="w-5 h-5" /> {visualSecondary}
                      </p>
                  </div>
               );

          default:
              return (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                          <Bluetooth className="w-10 h-10 text-blue-400" />
                      </div>
                      <h1 className="text-4xl font-['Righteous'] text-slate-700 dark:text-white mb-4">
                          Conectado
                      </h1>
                      <p className="text-xl text-slate-500 dark:text-slate-400 max-w-sm">
                          O áudio está sendo transmitido para o som do seu carro.
                      </p>
                      <p className="text-sm text-slate-400 mt-4">
                          Mantenha esta tela aberta.
                      </p>
                  </div>
              );
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col">
       {/* HACK: Invisible Video to keep Audio Context Alive in Background */}
       <video 
         ref={videoRef}
         src="https://www.w3schools.com/html/mov_bbb.mp4" 
         playsInline 
         loop 
         muted 
         className="absolute w-1 h-1 opacity-0 pointer-events-none" 
       />

       {/* Top Bar */}
       <div className="h-20 bg-black/40 backdrop-blur-md flex items-center justify-between px-8 border-b border-white/10 shrink-0">
           <div className="flex items-center gap-4">
               <Car className="w-8 h-8 text-[#00c896]" />
               <span className="text-xl font-bold tracking-wide">CITmax Auto</span>
           </div>
           <button 
             onClick={onClose}
             className="bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2"
           >
               <X className="w-5 h-5" /> Sair
           </button>
       </div>

       {/* Split Screen Content */}
       <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
           
           {/* Left: Voice Interface (Active) */}
           <div className="w-full md:w-1/2 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 bg-gradient-to-b from-slate-800 to-slate-900 relative">
               
               {/* Visualizer Circle */}
               <div 
                 onClick={() => videoRef.current?.play()} // Fallback click to start audio if auto-play fails
                 className={`w-64 h-64 rounded-full border-8 flex items-center justify-center transition-all duration-500 relative cursor-pointer ${
                   voiceStatus === 'speaking' 
                   ? 'border-[#00c896] shadow-[0_0_80px_#00c896] scale-105' 
                   : voiceStatus === 'listening'
                     ? 'border-red-500 shadow-[0_0_40px_red]'
                     : 'border-slate-700'
               }`}>
                   {voiceStatus === 'connecting' ? (
                       <Loader2 className="w-24 h-24 text-slate-500 animate-spin" />
                   ) : voiceStatus === 'speaking' ? (
                       <Volume2 className="w-24 h-24 text-[#00c896] animate-bounce" />
                   ) : (
                       <Mic className={`w-24 h-24 ${voiceStatus === 'listening' ? 'text-red-500' : 'text-slate-600'}`} />
                   )}
               </div>

               <h2 className="mt-12 text-3xl font-['Righteous'] tracking-widest text-center px-4">
                    {voiceStatus === 'connecting' && "CONECTANDO..."}
                    {voiceStatus === 'connected' && "ONLINE"}
                    {voiceStatus === 'listening' && "OUVINDO..."}
                    {voiceStatus === 'speaking' && "FALANDO..."}
               </h2>
           </div>

           {/* Right: Dynamic Info Panel */}
           <div className="w-full md:w-1/2 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white relative overflow-hidden">
               {renderVisualContent()}
           </div>
       </div>
    </div>
  );
};
