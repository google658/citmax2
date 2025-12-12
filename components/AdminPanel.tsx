
import React, { useState } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { ConfigService } from '../services/configService';
import { LoyaltyService } from '../services/loyaltyService';
import { 
  LogOut, 
  Image as ImageIcon, 
  Bell, 
  Settings, 
  Plus, 
  Trash2, 
  Loader2,
  Globe,
  Save,
  Smartphone,
  Download,
  Store
} from 'lucide-react';

interface AdminPanelProps {
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const { config, addBanner, removeBanner, sendNotification, resetToDefaults } = useAdmin();
  const [activeTab, setActiveTab] = useState<'banners' | 'push' | 'general' | 'partners'>('banners');
  const [isSaving, setIsSaving] = useState(false);

  // General Config State
  const [logoUrlInput, setLogoUrlInput] = useState(config.logoUrl || '');
  const [apkUrlInput, setApkUrlInput] = useState(config.apkUrl || '');
  const [iosUrlInput, setIosUrlInput] = useState(config.iosUrl || '');

  // Banner State
  const [bannerUrlInput, setBannerUrlInput] = useState('');
  
  // Push State
  const [pushTitle, setPushTitle] = useState('');
  const [pushMsg, setPushMsg] = useState('');

  // Partners State
  const [partners, setPartners] = useState<any[]>([]);
  
  const handleUpdateGeneral = async () => {
      setIsSaving(true);
      const newConfig = { 
          ...config, 
          logoUrl: logoUrlInput,
          apkUrl: apkUrlInput,
          iosUrl: iosUrlInput
      };
      await ConfigService.saveConfig(newConfig);
      // Force reload to apply logo changes immediately
      window.location.reload();
  };

  const handleFileProcess = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => Promise<void>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { 
            alert("A imagem é muito grande (>5MB).");
            return;
        }
        setIsSaving(true);
        try {
            const url = await ConfigService.uploadImage(file);
            await callback(url);
        } catch (error) {
            alert("Erro ao processar imagem.");
        } finally {
            setIsSaving(false);
        }
    }
  };

  const handleAddBannerUrl = async () => {
      if (!bannerUrlInput) return;
      setIsSaving(true);
      await addBanner({
          id: Date.now(),
          src: bannerUrlInput,
          alt: 'Banner Promocional',
          fallbackColor: 'bg-slate-800',
          fallbackText: 'NOVO'
      });
      setBannerUrlInput('');
      setIsSaving(false);
  };

  const handleAddBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileProcess(e, async (url) => {
          await addBanner({
              id: Date.now(),
              src: url,
              alt: 'Banner Promocional',
              fallbackColor: 'bg-slate-800',
              fallbackText: 'NOVO'
          });
      });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileProcess(e, async (url) => {
          setLogoUrlInput(url);
      });
  };

  const handleSendPush = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!pushTitle || !pushMsg) return;
      setIsSaving(true);
      await sendNotification(pushTitle, pushMsg);
      setPushTitle('');
      setPushMsg('');
      setIsSaving(false);
      alert('Notificação enviada com sucesso!');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Montserrat']">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white p-4 shadow-md flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-[#00c896] rounded-lg">
                <Settings className="w-5 h-5 text-[#036271]" />
            </div>
            <div>
                <h1 className="font-bold text-lg">Painel Administrativo</h1>
                <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-400">CITmax Supabase</p>
                    {isSaving && <span className="text-xs text-yellow-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Salvando...</span>}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs bg-white/10 px-3 py-1 rounded-full">
                <Globe className="w-3 h-3 text-green-400"/>
                <span className="text-white/80">Conectado ao DB</span>
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm font-bold">
                <LogOut className="w-4 h-4" /> Sair
            </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row max-w-7xl mx-auto w-full p-4 gap-6">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 flex flex-col gap-2">
            <button 
                onClick={() => setActiveTab('banners')}
                className={`p-4 rounded-xl text-left font-bold flex items-center gap-3 transition-all ${activeTab === 'banners' ? 'bg-[#036271] text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
                <ImageIcon className="w-5 h-5" /> Banners App
            </button>
            <button 
                onClick={() => setActiveTab('general')}
                className={`p-4 rounded-xl text-left font-bold flex items-center gap-3 transition-all ${activeTab === 'general' ? 'bg-[#036271] text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
                <Settings className="w-5 h-5" /> Aparência e Links
            </button>
            <button 
                onClick={() => setActiveTab('partners')}
                className={`p-4 rounded-xl text-left font-bold flex items-center gap-3 transition-all ${activeTab === 'partners' ? 'bg-[#036271] text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
                <Store className="w-5 h-5" /> Parceiros Clube
            </button>
            <button 
                onClick={() => setActiveTab('push')}
                className={`p-4 rounded-xl text-left font-bold flex items-center gap-3 transition-all ${activeTab === 'push' ? 'bg-[#036271] text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
                <Bell className="w-5 h-5" /> Notificações
            </button>

            <div className="mt-auto pt-8">
                <button onClick={resetToDefaults} className="w-full py-2 text-xs text-slate-400 hover:text-red-500 underline">
                    Restaurar Padrões de Fábrica
                </button>
            </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            
            {/* BANNERS TAB */}
            {activeTab === 'banners' && (
                <div className="space-y-6 animate-in fade-in">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Banners Promocionais</h2>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                        <label className="cursor-pointer bg-[#00c896] hover:bg-[#00a87e] text-[#036271] px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap">
                            <Plus className="w-5 h-5" /> Upload Imagem
                            <input type="file" accept="image/*" className="hidden" onChange={handleAddBannerFile} />
                        </label>
                        <span className="text-slate-400 text-sm font-bold">OU</span>
                        <div className="flex-1 flex gap-2 w-full">
                            <input 
                                type="text" 
                                placeholder="https://..." 
                                value={bannerUrlInput}
                                onChange={e => setBannerUrlInput(e.target.value)}
                                className="flex-1 px-4 py-2 rounded-xl border border-slate-300"
                            />
                            <button onClick={handleAddBannerUrl} className="bg-slate-200 px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-300">
                                Adicionar
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {config.banners.map((banner) => (
                            <div key={banner.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <div className="w-32 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                                    <img src={banner.src} alt="Banner" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-bold text-slate-700">Banner #{banner.id}</p>
                                    <p className="text-xs text-slate-400 font-mono truncate">{banner.src}</p>
                                </div>
                                <button onClick={() => removeBanner(banner.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* GENERAL / CONFIG TAB */}
            {activeTab === 'general' && (
                <div className="space-y-6 animate-in fade-in">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Configurações Gerais</h2>
                    
                    {/* Logo Section */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <h3 className="font-bold text-slate-700">Identidade Visual (Logo)</h3>
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="w-32 h-32 bg-slate-200 rounded-xl flex items-center justify-center border border-slate-300 overflow-hidden relative">
                                {logoUrlInput ? (
                                    <img src={logoUrlInput} className="w-full h-full object-contain p-2" alt="Preview" />
                                ) : (
                                    <ImageIcon className="w-10 h-10 text-slate-400" />
                                )}
                            </div>
                            <div className="flex-1 space-y-3 w-full">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1">URL da Logo</label>
                                    <input 
                                        type="text" 
                                        value={logoUrlInput}
                                        onChange={e => setLogoUrlInput(e.target.value)}
                                        className="w-full p-3 rounded-xl border border-slate-300 font-mono text-sm"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <label className="cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm transition-colors">
                                        <Plus className="w-4 h-4" /> Upload
                                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* App Downloads Section */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Download className="w-5 h-5 text-[#036271]" /> Links de Download do App
                        </h3>
                        <p className="text-sm text-slate-500">
                            Se você gerou um APK ou tem o app na loja, cole os links aqui para exibir na tela de login.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link APK Android (Direto/Store)</label>
                                <div className="relative">
                                    <Smartphone className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={apkUrlInput}
                                        onChange={e => setApkUrlInput(e.target.value)}
                                        className="w-full pl-9 p-3 rounded-xl border border-slate-300 font-mono text-sm"
                                        placeholder="https://bit.ly/meuapp-android"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link iOS (App Store)</label>
                                <div className="relative">
                                    <Smartphone className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={iosUrlInput}
                                        onChange={e => setIosUrlInput(e.target.value)}
                                        className="w-full pl-9 p-3 rounded-xl border border-slate-300 font-mono text-sm"
                                        placeholder="https://apps.apple.com/..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button 
                            onClick={handleUpdateGeneral}
                            disabled={isSaving}
                            className="bg-[#00c896] hover:bg-[#00a87e] text-[#036271] px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#00c896]/20 transition-all"
                        >
                            <Save className="w-5 h-5" /> Salvar Configurações
                        </button>
                    </div>
                </div>
            )}

            {/* PUSH TAB */}
            {activeTab === 'push' && (
                <div className="space-y-6 animate-in fade-in">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Enviar Notificação Push</h2>
                    <form onSubmit={handleSendPush} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 max-w-lg">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
                            <input 
                                type="text" 
                                value={pushTitle}
                                onChange={e => setPushTitle(e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-300"
                                placeholder="Aviso Importante"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mensagem</label>
                            <textarea 
                                value={pushMsg}
                                onChange={e => setPushMsg(e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-300 h-24 resize-none"
                                placeholder="Sua mensagem aqui..."
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className="w-full py-3 bg-[#036271] text-white font-bold rounded-xl flex items-center justify-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Bell className="w-5 h-5" />}
                            Enviar Disparo
                        </button>
                    </form>
                </div>
            )}

        </main>
      </div>
    </div>
  );
};
