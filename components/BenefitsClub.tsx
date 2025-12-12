
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Tag, ExternalLink, Percent, ShoppingBag, Coffee, Ticket, Star, QrCode, X, CheckCircle } from 'lucide-react';
import { LoyaltyService } from '../services/loyaltyService';
import { PartnerBenefit, UserLoyaltyCard } from '../types';

interface BenefitsClubProps {
  onBack: () => void;
}

export const BenefitsClub: React.FC<BenefitsClubProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'discounts' | 'loyalty'>('discounts');
  const [benefits, setBenefits] = useState<PartnerBenefit[]>([]);
  const [myCards, setMyCards] = useState<UserLoyaltyCard[]>([]);
  const [userCode, setUserCode] = useState<string | null>(null); // Validation Code Modal

  // Simulate User ID (In real app, comes from Auth/Contract)
  const fakeUserId = "12345";

  useEffect(() => {
      loadData();
  }, []);

  const loadData = async () => {
      // Load all benefits
      const allBenefits = await LoyaltyService.getBenefits();
      setBenefits(allBenefits);

      // Load user cards
      const cards = await LoyaltyService.getUserCards(fakeUserId);
      setMyCards(cards);
  };

  const handleStartLoyalty = async (benefit: PartnerBenefit) => {
      const card = await LoyaltyService.getOrCreateCard(fakeUserId, benefit);
      setMyCards(prev => {
          // Prevent duplicate in state
          if (prev.find(c => c.id === card.id)) return prev;
          return [...prev, card];
      });
      setActiveTab('loyalty');
  };

  const generateValidationCode = (benefitId: string) => {
      // Generate a simple code: USERID-TIMESTAMP (Simulated)
      // In real app, this might be signed by backend
      const code = `${fakeUserId}-${Date.now().toString().slice(-4)}`;
      setUserCode(code);
  };

  const getIcon = (category: string) => {
      switch(category) {
          case 'food': return <Coffee className="w-6 h-6 text-white" />;
          case 'services': return <Tag className="w-6 h-6 text-white" />;
          case 'leisure': return <Ticket className="w-6 h-6 text-white" />;
          case 'health': return <Star className="w-6 h-6 text-white" />;
          default: return <ShoppingBag className="w-6 h-6 text-white" />;
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#01252b] flex flex-col font-['Montserrat'] transition-colors duration-300">
      
      {/* Validation Modal */}
      {userCode && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center relative">
                  <button onClick={() => setUserCode(null)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                      <X className="w-5 h-5 text-slate-600" />
                  </button>
                  
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Validar Consumo</h3>
                  <p className="text-slate-500 text-sm mb-6">Mostre este código ao lojista para ganhar seu selo.</p>
                  
                  <div className="bg-slate-100 p-6 rounded-2xl border-2 border-dashed border-slate-300 mb-4">
                      <p className="font-mono text-3xl font-bold tracking-widest text-[#036271]">{userCode.split('-')[0]}</p>
                      <p className="text-xs text-slate-400 mt-1">Token Temporário</p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-bold">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Aguardando validação...
                  </div>
              </div>
          </div>
      )}

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
            <h1 className="text-2xl font-bold font-['Righteous'] text-white flex items-center gap-2">
              <Percent className="w-6 h-6 text-[#00c896]" />
              Clube de Vantagens
            </h1>
            <p className="text-[#00c896] text-xs mt-1">
              Economia local e recompensas
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#02343f] border-b border-slate-200 dark:border-[#00c896]/20">
          <div className="max-w-4xl mx-auto flex">
              <button 
                onClick={() => setActiveTab('discounts')}
                className={`flex-1 py-4 text-sm font-bold border-b-4 transition-colors ${activeTab === 'discounts' ? 'border-[#00c896] text-[#036271] dark:text-[#00c896]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                  Cupons & Descontos
              </button>
              <button 
                onClick={() => setActiveTab('loyalty')}
                className={`flex-1 py-4 text-sm font-bold border-b-4 transition-colors ${activeTab === 'loyalty' ? 'border-[#00c896] text-[#036271] dark:text-[#00c896]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                  Meus Cartões Fidelidade
              </button>
          </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6">
        
        {activeTab === 'discounts' && (
            <div className="space-y-6 animate-in slide-in-from-left-4">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <h2 className="text-2xl font-bold mb-2 font-['Righteous']">Ofertas da Região</h2>
                    <p className="text-white/90 text-sm max-w-xs">
                        Valorize o comércio local. Use seus cupons exclusivos.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {benefits.filter(b => b.type === 'discount' || (b.type === 'loyalty' && !myCards.find(c => c.benefitId === b.id))).map(benefit => (
                        <div key={benefit.id} className="bg-white dark:bg-[#02343f] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-[#00c896]/10 flex items-start gap-4 group hover:shadow-md transition-all">
                            <div className={`w-14 h-14 ${benefit.color || 'bg-slate-500'} rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
                                {getIcon(benefit.category)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{benefit.category}</span>
                                    <span className="bg-[#00c896]/10 text-[#008B87] dark:text-[#00c896] text-xs font-bold px-2 py-1 rounded-full">
                                        {benefit.discountValue || 'Fidelidade'}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg mt-1">{benefit.partnerName}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                                    {benefit.description}
                                </p>
                                
                                {benefit.type === 'loyalty' ? (
                                    <button 
                                        onClick={() => handleStartLoyalty(benefit)}
                                        className="mt-4 w-full py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Star className="w-3 h-3" /> Iniciar Cartão
                                    </button>
                                ) : (
                                    <button className="mt-4 w-full py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                        Pegar Cupom <ExternalLink className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'loyalty' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
                {myCards.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Star className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-bold text-slate-600 dark:text-slate-300">Você ainda não tem cartões.</p>
                        <p className="text-sm">Vá na aba "Cupons" e inicie um plano fidelidade.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {myCards.map(card => {
                            const progress = (card.currentStamps / card.maxStamps) * 100;
                            const isComplete = card.currentStamps >= card.maxStamps;

                            return (
                                <div key={card.id} className="bg-white dark:bg-[#02343f] rounded-3xl overflow-hidden shadow-md border border-slate-100 dark:border-[#00c896]/10 relative group">
                                    {/* Card Header */}
                                    <div className="bg-[#036271] p-4 text-white flex justify-between items-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#00c896] rounded-full opacity-20 translate-x-1/2 -translate-y-1/2"></div>
                                        <div className="relative z-10">
                                            <h3 className="font-bold text-lg font-['Righteous']">{card.partnerName}</h3>
                                            <p className="text-xs text-[#00c896]">Prêmio: {card.reward}</p>
                                        </div>
                                        <div className="relative z-10 font-mono text-2xl font-bold">
                                            {card.currentStamps}/{card.maxStamps}
                                        </div>
                                    </div>

                                    {/* Stamps Grid */}
                                    <div className="p-6">
                                        <div className="grid grid-cols-5 gap-3 mb-6">
                                            {Array.from({ length: card.maxStamps }).map((_, i) => (
                                                <div 
                                                    key={i} 
                                                    className={`aspect-square rounded-full flex items-center justify-center border-2 transition-all ${
                                                        i < card.currentStamps 
                                                        ? 'bg-[#00c896] border-[#00c896] text-[#036271] shadow-sm scale-100' 
                                                        : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-300 scale-90'
                                                    }`}
                                                >
                                                    {i < card.currentStamps ? <Star className="w-4 h-4 fill-current" /> : <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></div>}
                                                </div>
                                            ))}
                                        </div>

                                        {isComplete ? (
                                            <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-3 rounded-xl text-center font-bold text-sm mb-4 border border-green-200 dark:border-green-800 flex items-center justify-center gap-2">
                                                <CheckCircle className="w-5 h-5" /> Cartela Completa! Resgate seu prêmio.
                                            </div>
                                        ) : (
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-6">
                                                <div className="h-full bg-[#00c896] transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        )}

                                        <button 
                                            onClick={() => generateValidationCode(card.benefitId)}
                                            className="w-full py-3 bg-[#036271] hover:bg-[#024d59] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                        >
                                            <QrCode className="w-5 h-5" />
                                            {isComplete ? 'Validar Resgate' : 'Validar Consumo'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

      </main>
    </div>
  );
};
