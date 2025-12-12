
import React, { useState, useEffect } from 'react';
import { APIService } from '../services/apiService';
import { SGPContract } from '../types';
import { Loader2, AlertCircle, ArrowRight, Settings, Sun, Moon, Monitor, Check, Store, Download, Smartphone } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useTheme } from '../ThemeContext';
import { useAdmin } from '../contexts/AdminContext';

interface LoginFormProps {
  onLoginSuccess: (contracts: SGPContract[], cpfCnpj: string, password?: string) => void;
  onAdminClick?: () => void;
  onPartnerClick?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onAdminClick, onPartnerClick }) => {
  const { theme, setTheme } = useTheme();
  const { config } = useAdmin(); // Use admin context to get download links
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for saved credentials on mount
  useEffect(() => {
      const savedAuth = localStorage.getItem('citmax_auth');
      if (savedAuth) {
          try {
              const { u, p } = JSON.parse(atob(savedAuth));
              if (u && p) {
                  setCpfCnpj(u);
                  setPassword(p);
              }
          } catch (e) {}
      }
  }, []);

  const handleLoginLogic = async (user: string, pass: string, save: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const contracts = await APIService.login(user, pass);
      
      if (!contracts || contracts.length === 0) {
        throw new Error('Nenhum contrato encontrado para este usuário.');
      }

      // Save or Clear Credentials
      if (save) {
          const authString = btoa(JSON.stringify({ u: user, p: pass }));
          localStorage.setItem('citmax_auth', authString);
      } else {
          localStorage.removeItem('citmax_auth');
      }
      
      onLoginSuccess(contracts, user, pass);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('Failed to fetch')) {
        setError('Erro de conexão. O servidor pode estar bloqueando o acesso via navegador (CORS) ou está indisponível.');
      } else {
        setError(err.message || 'Falha ao realizar login. Verifique suas credenciais.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpfCnpj || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    handleLoginLogic(cpfCnpj, password, rememberMe);
  };

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('auto');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-5 h-5" />;
    if (theme === 'dark') return <Moon className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-[#036271] dark:bg-[#011e24] relative overflow-hidden transition-colors duration-500">
      
      {/* Theme Toggle (Top Right) */}
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={toggleTheme}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors shadow-lg"
          title="Alternar Tema"
        >
          {getThemeIcon()}
        </button>
      </div>

      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-[#00c896] opacity-10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#008B87] opacity-20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

      <div className="w-full max-w-md bg-white dark:bg-[#02343f] rounded-3xl shadow-2xl overflow-hidden z-10 transition-colors duration-300 border border-transparent dark:border-[#00c896]/20">
        <div className="bg-[#036271] dark:bg-[#01252b] p-10 text-center border-b border-[#008B87]/30 relative flex flex-col items-center justify-center transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00c896] to-[#008B87]"></div>
          
          <div className="mb-4 transform hover:scale-105 transition-transform duration-500">
             <BrandLogo variant="white" className="h-20" />
          </div>
          
          <p className="text-[#00c896] font-medium text-sm tracking-wide uppercase mt-2">Central do Assinante</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[#036271] dark:text-[#00c896] mb-2">
                CPF ou CNPJ
              </label>
              <input
                type="text"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-[#00c896] focus:border-[#00c896] outline-none transition-all bg-slate-50 dark:bg-[#01252b] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#036271] dark:text-[#00c896] mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-[#00c896] focus:border-[#00c896] outline-none transition-all bg-slate-50 dark:bg-[#01252b] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center justify-between">
                <button 
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-[#036271] dark:hover:text-[#00c896] transition-colors"
                >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                        rememberMe 
                        ? 'bg-[#00c896] border-[#00c896]' 
                        : 'border-slate-300 dark:border-slate-500'
                    }`}>
                        {rememberMe && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    Manter conectado
                </button>

                <a 
                    href="https://citrn.sgp.net.br/accounts/central/recuperar_senha/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-[#036271] dark:text-[#00c896] hover:text-[#008B87] font-semibold transition-colors"
                >
                    Esqueci a senha
                </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00c896] hover:bg-[#008B87] text-[#036271] font-bold text-lg py-4 px-4 rounded-xl transition-all shadow-lg shadow-[#00c896]/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  Acessar
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Download Buttons Section */}
          {(config.apkUrl || config.iosUrl) && (
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-[#00c896]/20 space-y-3">
                  <p className="text-center text-xs font-bold text-slate-400 uppercase mb-2">Baixar Aplicativo</p>
                  <div className="flex gap-2">
                      {config.apkUrl && (
                          <a 
                            href={config.apkUrl}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                          >
                              <Smartphone className="w-4 h-4" /> Android
                          </a>
                      )}
                      {config.iosUrl && (
                          <a 
                            href={config.iosUrl}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                          >
                              <Store className="w-4 h-4" /> iPhone (iOS)
                          </a>
                      )}
                  </div>
              </div>
          )}

          <div className="mt-8 flex justify-center gap-4">
            {onPartnerClick && (
              <button 
                onClick={onPartnerClick}
                className="text-xs text-slate-300 dark:text-slate-500 hover:text-white dark:hover:text-slate-300 transition-colors flex items-center justify-center gap-1"
              >
                <Store className="w-3 h-3" /> Área do Parceiro
              </button>
            )}
            {onAdminClick && (
              <button 
                onClick={onAdminClick}
                className="text-xs text-slate-300 dark:text-slate-500 hover:text-white dark:hover:text-slate-300 transition-colors flex items-center justify-center gap-1"
              >
                <Settings className="w-3 h-3" /> Painel Admin
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center z-10">
        <p className="text-white/80 dark:text-white/60 text-sm font-medium">Conecte-se com o mundo através da CITmax.</p>
        <p className="text-white/40 dark:text-white/30 text-xs mt-2">© 2024 CITmax Tecnologia</p>
      </div>
    </div>
  );
};
