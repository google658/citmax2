
import React, { useState, useEffect } from 'react';
import { SGPContract, SGPRadiusResult } from '../types';
import { APIService } from '../services/apiService';
import { 
  ArrowLeft, 
  Wifi, 
  WifiOff,
  Activity, 
  Loader2, 
  Clock, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Hash,
  Globe,
  AlertTriangle,
  BarChart2,
  List
} from 'lucide-react';

interface ConnectionHistoryProps {
  contract: SGPContract;
  userCpfCnpj: string;
  userPassword?: string;
  onBack: () => void;
}

export const ConnectionHistory: React.FC<ConnectionHistoryProps> = ({ contract, userCpfCnpj, userPassword, onBack }) => {
  const [activeSession, setActiveSession] = useState<SGPRadiusResult | null>(null);
  const [history, setHistory] = useState<SGPRadiusResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDiagnostics();
  }, [contract.id_contrato, userCpfCnpj]);

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all sessions (active and history)
      const results = await APIService.getConnectionDiagnostics(userCpfCnpj, userPassword, contract.id_contrato);
      
      console.log("History Found:", results.length);

      if (results.length === 0) {
        setError("Nenhuma sessão de conexão encontrada para este CPF.");
        setActiveSession(null);
        setHistory([]);
        return;
      }

      // Filter logic: Filter by Plan first to ensure we aren't showing data from another contract on the same CPF
      let filteredResults = results;
      if (contract.plano) {
          const contractPlan = contract.plano.toLowerCase().trim();
          const matches = results.filter(r => r.plano && r.plano.toLowerCase().trim() === contractPlan);
          if (matches.length > 0) filteredResults = matches;
      }

      // 1. Find the Active Session (online = true)
      const current = filteredResults.find(r => r.online) || filteredResults[0]; // Fallback to most recent if none online
      
      // 2. Set History (excluding the one displayed as active if it's the very first one, or keep all)
      // Let's keep all in history list, but maybe style the active one differently
      setHistory(filteredResults);
      setActiveSession(current);

    } catch (err: any) {
      console.error("Failed to load connection diagnostics", err);
      if (err.message && err.message.includes('Failed to fetch')) {
        setError("Erro de Rede (CORS): O navegador bloqueou a conexão direta com a API da Central. Tente usar o App Nativo ou verifique as permissões.");
      } else {
        setError(err.message || "Falha ao buscar diagnóstico.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare Chart Data (Last 10 sessions)
  // Reverse logic: API returns newest first. We want Left=Oldest, Right=Newest for chart.
  const chartData = [...history].slice(0, 15).reverse(); 
  const maxBytes = Math.max(...chartData.map(d => Math.max(d.acctinputoctets, d.acctoutputoctets)), 1024 * 1024); // Min 1MB base

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#01252b] flex flex-col font-['Montserrat'] transition-colors duration-300">
      {/* Header */}
      <div className="bg-[#036271] p-6 shadow-lg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-['Righteous'] text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#00c896]" />
              Minha Conexão
            </h1>
            <p className="text-[#00c896] text-xs mt-1">Contrato #{contract.id_contrato}</p>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#00c896] mb-2" />
            <p>Analisando conexão...</p>
          </div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center h-auto text-slate-400 bg-white dark:bg-[#02343f] rounded-3xl shadow-sm border border-red-200 dark:border-red-900/30 text-center p-6">
             <AlertTriangle className="w-12 h-12 text-red-400 mb-2 mx-auto" />
             <p className="font-semibold text-slate-600 dark:text-slate-300 text-lg mb-2">Ops!</p>
             <p className="text-sm text-red-500 max-w-md">{error}</p>
             <button 
                onClick={fetchDiagnostics}
                className="mt-4 px-4 py-2 bg-[#036271] text-white rounded-lg text-sm font-bold"
             >
                Tentar Novamente
             </button>
           </div>
        ) : !activeSession ? (
           <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white dark:bg-[#02343f] rounded-3xl shadow-sm border border-slate-200 dark:border-[#00c896]/10 text-center p-6">
             <WifiOff className="w-12 h-12 text-slate-200 dark:text-slate-600 mb-2 mx-auto" />
             <p className="font-semibold text-slate-600 dark:text-slate-300">Nenhuma conexão ativa encontrada.</p>
             <p className="text-sm mt-2 text-slate-500 dark:text-slate-400">Verifique se o seu equipamento está ligado.</p>
           </div>
        ) : (
          <>
            {/* Status Card */}
            <div className="bg-white dark:bg-[#02343f] rounded-3xl p-6 shadow-md border-l-8 overflow-hidden relative transition-colors"
                 style={{ borderLeftColor: activeSession.online ? '#00c896' : '#94a3b8' }}>
                
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide shadow-sm ${
                                activeSession.online 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                                {activeSession.online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                                {activeSession.online ? 'Online Agora' : 'Desconectado'}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 text-xs font-mono bg-slate-100 dark:bg-black/20 px-2 py-1.5 rounded border border-slate-200 dark:border-white/5">
                                Login: {activeSession.pppoe_login}
                            </span>
                        </div>
                        
                        <h2 className="text-xl md:text-2xl font-bold text-[#036271] dark:text-white mb-4 leading-tight">
                            {activeSession.plano || contract.plano || 'Plano de Internet'}
                        </h2>

                        <div className="flex flex-wrap gap-4 text-sm bg-slate-50 dark:bg-[#036271]/20 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <Globe className="w-4 h-4 text-[#00c896]" />
                                <span className="font-medium">IP:</span> 
                                <span className="font-mono">{activeSession.ip || 'Não atribuído'}</span>
                            </div>
                            <div className="w-px h-4 bg-slate-300 dark:bg-white/10 hidden sm:block"></div>
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <Hash className="w-4 h-4 text-[#00c896]" />
                                <span className="font-medium">MAC:</span> 
                                <span className="font-mono text-xs">{activeSession.mac || '---'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Current Session Stats */}
            <div className="bg-white dark:bg-[#02343f] rounded-3xl shadow-sm border border-slate-100 dark:border-[#00c896]/10 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-[#036271] dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#00c896]" />
                        Sessão Atual
                    </h3>
                    <div className="text-xs text-slate-400">
                        ID: {activeSession.acctsessionid?.slice(0, 8)}...
                    </div>
                </div>
                
                <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 shadow-sm ${
                                activeSession.online ? 'bg-green-500 animate-pulse' : 'bg-slate-400'
                            }`}></div>
                            <div>
                                <p className="font-bold text-slate-700 dark:text-white text-sm">
                                    Iniciada em: {new Date(activeSession.acctstarttime).toLocaleString('pt-BR')}
                                </p>
                                
                                {activeSession.acctstoptime ? (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Terminou em: {new Date(activeSession.acctstoptime).toLocaleString('pt-BR')}
                                    </p>
                                ) : (
                                    <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5">
                                        Conexão ativa no momento
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                            <div className="text-center min-w-[70px]">
                                <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-0.5 font-bold uppercase tracking-wider text-[10px]">
                                    <ArrowDownCircle className="w-3 h-3" />
                                    Baixou
                                </div>
                                <span className="text-slate-700 dark:text-slate-200 font-mono font-bold text-lg">
                                    {APIService.bytesToGB(activeSession.acctoutputoctets)}
                                </span>
                            </div>
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                            <div className="text-center min-w-[70px]">
                                <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-0.5 font-bold uppercase tracking-wider text-[10px]">
                                    <ArrowUpCircle className="w-3 h-3" />
                                    Enviou
                                </div>
                                <span className="text-slate-700 dark:text-slate-200 font-mono font-bold text-lg">
                                    {APIService.bytesToGB(activeSession.acctinputoctets)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Consumption Chart */}
            {chartData.length > 0 && (
                <div className="bg-white dark:bg-[#02343f] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-[#00c896]/10">
                    <h3 className="font-bold text-[#036271] dark:text-white mb-6 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-[#00c896]" />
                        Consumo Recente (Histórico)
                    </h3>
                    
                    {/* FIXED: items-stretch to force full height for columns, pb-8 for label spacing */}
                    <div className="flex items-stretch gap-2 h-48 w-full overflow-x-auto pb-4 px-2">
                        {chartData.map((session, idx) => {
                            const downHeight = Math.max((session.acctoutputoctets / maxBytes) * 100, 2);
                            const upHeight = Math.max((session.acctinputoctets / maxBytes) * 100, 2);
                            const dateLabel = new Date(session.acctstarttime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                            
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 min-w-[30px] group relative h-full justify-end">
                                    {/* Bar Container: Flex-1 to fill available vertical space, Items-end to align bars to bottom */}
                                    <div className="w-full flex-1 flex justify-center items-end gap-1 border-b border-slate-100 dark:border-white/5 pb-1">
                                        {/* Download Bar */}
                                        <div 
                                            style={{ height: `${downHeight}%` }} 
                                            className="w-3 bg-green-500/80 rounded-t-sm group-hover:bg-green-500 transition-all shadow-sm"
                                        ></div>
                                        {/* Upload Bar */}
                                        <div 
                                            style={{ height: `${upHeight}%` }} 
                                            className="w-3 bg-blue-500/80 rounded-t-sm group-hover:bg-blue-500 transition-all shadow-sm"
                                        ></div>
                                    </div>
                                    
                                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{dateLabel}</span>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap shadow-lg">
                                        <p className="font-bold mb-1 border-b border-slate-600 pb-1">{new Date(session.acctstarttime).toLocaleString()}</p>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-green-400 flex items-center gap-1"><ArrowDownCircle className="w-3 h-3"/> {APIService.bytesToGB(session.acctoutputoctets)}</span>
                                            <span className="text-blue-400 flex items-center gap-1"><ArrowUpCircle className="w-3 h-3"/> {APIService.bytesToGB(session.acctinputoctets)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="flex justify-center gap-6 mt-2 text-xs font-medium">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <span className="w-3 h-3 bg-green-500 rounded-sm"></span> Download
                        </div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <span className="w-3 h-3 bg-blue-500 rounded-sm"></span> Upload
                        </div>
                    </div>
                </div>
            )}

            {/* History List */}
            <div className="bg-white dark:bg-[#02343f] rounded-3xl shadow-sm border border-slate-100 dark:border-[#00c896]/10 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-[#036271] dark:text-white flex items-center gap-2">
                        <List className="w-5 h-5 text-[#00c896]" />
                        Histórico Completo
                    </h3>
                </div>
                
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.map((session, idx) => {
                        // Calculate duration roughly
                        let duration = "Em andamento";
                        if (session.acctstoptime) {
                            const start = new Date(session.acctstarttime).getTime();
                            const end = new Date(session.acctstoptime).getTime();
                            const diffSeconds = (end - start) / 1000;
                            duration = APIService.formatDuration(diffSeconds);
                        }

                        return (
                            <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-[#036271]/20 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${session.online ? 'bg-green-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                            {new Date(session.acctstarttime).toLocaleString('pt-BR')}
                                        </span>
                                        <span className="text-xs text-slate-400 dark:text-slate-500 flex flex-wrap gap-2">
                                            {session.acctstoptime ? `Terminou: ${new Date(session.acctstoptime).toLocaleTimeString()}` : 'Online agora'}
                                            <span>•</span>
                                            Duração: {duration}
                                            {session.acctterminatecause && <span>• Causa: {session.acctterminatecause}</span>}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm pl-5 sm:pl-0">
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 uppercase">Down</p>
                                        <p className="font-bold text-slate-600 dark:text-slate-300">{APIService.bytesToGB(session.acctoutputoctets)}</p>
                                    </div>
                                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 uppercase">Up</p>
                                        <p className="font-bold text-slate-600 dark:text-slate-300">{APIService.bytesToGB(session.acctinputoctets)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
