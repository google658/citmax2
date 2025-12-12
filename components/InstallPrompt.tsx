
import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // Check for iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
        // Show iOS prompt after a small delay
        setTimeout(() => setShowPrompt(true), 5000);
    }

    // Capture the install prompt for Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // Custom Event to trigger modal manually from Menu
    const handleManualTrigger = () => {
        setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('openInstallModal', handleManualTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('openInstallModal', handleManualTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    } else {
        // Fallback instructions for when browser prevents programmatic trigger
        alert("Para instalar, toque no menu do seu navegador (3 pontinhos ou Compartilhar) e selecione 'Adicionar à Tela de Início' ou 'Instalar Aplicativo'.");
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-500 font-['Montserrat']">
      <div className="bg-[#036271] dark:bg-[#02343f] rounded-2xl p-5 shadow-2xl border border-[#00c896]/30 relative overflow-hidden text-white max-w-md mx-auto">
        
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00c896] rounded-full opacity-10 blur-2xl -translate-y-1/2 translate-x-1/2"></div>
        
        <button 
          onClick={() => setShowPrompt(false)}
          className="absolute top-2 right-2 p-2 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
           <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
              <Smartphone className="w-8 h-8 text-[#00c896]" />
           </div>
           
           <div className="flex-1">
              <h3 className="font-bold text-lg leading-tight mb-1">Instalar App CITmax</h3>
              <p className="text-sm text-white/80 mb-4">
                 Acesse suas faturas e suporte muito mais rápido, direto da tela inicial.
              </p>

              {isIOS ? (
                  <div className="bg-black/20 rounded-xl p-3 text-sm space-y-2 border border-white/5">
                      <p className="flex items-center gap-2">
                          1. Toque em Compartilhar <Share className="w-4 h-4 text-blue-400" />
                      </p>
                      <p className="flex items-center gap-2">
                          2. Selecione "Adicionar à Tela de Início" <PlusSquare className="w-4 h-4 text-white" />
                      </p>
                  </div>
              ) : (
                  <button 
                    onClick={handleInstallClick}
                    className="w-full bg-[#00c896] hover:bg-[#00b084] text-[#036271] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#00c896]/20"
                  >
                    <Download className="w-5 h-5" />
                    {deferredPrompt ? 'Instalar Agora' : 'Ver Instruções'}
                  </button>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
