
import React, { useState, useEffect } from 'react';
import { LoyaltyService } from '../services/loyaltyService';
import { PartnerSession, PartnerBenefit } from '../types';
import { 
  Store, 
  UserCheck, 
  PlusCircle, 
  QrCode, 
  LogOut, 
  Loader2, 
  CheckCircle,
  Ticket,
  Search
} from 'lucide-react';

interface PartnerPortalProps {
  onLogout: () => void;
}

export const PartnerPortal: React.FC<PartnerPortalProps> = ({ onLogout }) => {
  const [partner, setPartner] = useState<PartnerSession | null>(null);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Dashboard State
  const [view, setView] = useState<'validate' | 'create'>('validate');
  const [userCode, setUserCode] = useState('');
  const [selectedBenefitId, setSelectedBenefitId] = useState('');
  const [validationResult, setValidationResult] = useState<{success: boolean, msg: string} | null>(null);
  const [myBenefits, setMyBenefits] = useState<PartnerBenefit[]>([]);

  // Create Benefit State
  const [newBenefit, setNewBenefit] = useState<Partial<PartnerBenefit>>({
      title: '',
      description: '',
      type: 'loyalty',
      loyaltyMaxStamps: 10,
      loyaltyReward: ''
  });

  useEffect(() => {
      if (partner) {
          loadBenefits();
      }
  }, [partner]);

  const loadBenefits = async () => {
      const all = await LoyaltyService.getBenefits();
      setMyBenefits(all.filter(b => b.partnerId === partner?.id && b.type === 'loyalty'));
  };

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setLoginError('');
      
      // Simulate network delay
      setTimeout(async () => {
          const session = await LoyaltyService.loginPartner(email, password);
          if (session) {
              setPartner(session);
          } else {
              setLoginError('Credenciais inválidas. Tente email: pizza@parceiro.com / senha: 123');
          }
          setLoading(false);
      }, 800);
  };

  const handleValidate = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedBenefitId || !userCode) {
          alert("Selecione a campanha e digite o código do cliente.");
          return;
      }

      setLoading(true);
      // Wait for async validation
      LoyaltyService.validateConsumption(userCode, selectedBenefitId).then(result => {
          setValidationResult(result);
          setLoading(false);
          if(result.success) setUserCode(''); // Clear input on success
      });
  };

  const handleCreateBenefit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!partner) return;

      const benefit: PartnerBenefit = {
          id: `b_${Date.now()}`, // Ignored by Supabase
          partnerId: partner.id,
          partnerName: partner.name,
          title: newBenefit.title!,
          description: newBenefit.description!,
          type: newBenefit.type as any,
          loyaltyMaxStamps: Number(newBenefit.loyaltyMaxStamps),
          loyaltyReward: newBenefit.loyaltyReward,
          discountValue: newBenefit.discountValue,
          category: 'food', 
          color: 'bg-indigo-600'
      };

      await LoyaltyService.createBenefit(benefit);
      alert('Benefício criado com sucesso!');
      setNewBenefit({ title: '', description: '', type: 'loyalty', loyaltyMaxStamps: 10, loyaltyReward: '' });
      loadBenefits();
  };

  if (!partner) {
      return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-['Montserrat']">
              <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                  <div className="bg-indigo-600 p-8 text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Store className="w-8 h-8 text-white" />
                      </div>
                      <h1 className="text-2xl font-bold text-white font-['Righteous']">Portal do Parceiro</h1>
                      <p className="text-indigo-200 text-sm">Clube de Vantagens CITmax</p>
                  </div>
                  <div className="p-8">
                      <form onSubmit={handleLogin} className="space-y-4">
                          {loginError && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{loginError}</p>}
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
                              <input 
                                  type="email" 
                                  value={email}
                                  onChange={e => setEmail(e.target.value)}
                                  className="w-full p-3 border rounded-xl outline-none focus:border-indigo-600"
                                  placeholder="loja@exemplo.com"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
                              <input 
                                  type="password" 
                                  value={password}
                                  onChange={e => setPassword(e.target.value)}
                                  className="w-full p-3 border rounded-xl outline-none focus:border-indigo-600"
                                  placeholder="••••••"
                              />
                          </div>
                          <button 
                              type="submit" 
                              disabled={loading}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
                          >
                              {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Acessar Loja'}
                          </button>
                      </form>
                      <button onClick={onLogout} className="w-full text-center text-slate-400 text-sm mt-6 hover:text-slate-600">
                          Voltar ao App
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-['Montserrat']">
          <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                      <Store className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                      <h1 className="font-bold text-slate-800 leading-tight">{partner.name}</h1>
                      <p className="text-xs text-slate-500">Gestão de Benefícios</p>
                  </div>
              </div>
              <button onClick={() => { setPartner(null); onLogout(); }} className="text-slate-400 hover:text-red-500">
                  <LogOut className="w-6 h-6" />
              </button>
          </header>

          <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6">
              
              {/* Navigation Tabs */}
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                  <button 
                      onClick={() => setView('validate')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${view === 'validate' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                      <UserCheck className="w-4 h-4" /> Validar Cliente
                  </button>
                  <button 
                      onClick={() => setView('create')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${view === 'create' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                      <PlusCircle className="w-4 h-4" /> Criar Oferta
                  </button>
              </div>

              {view === 'validate' && (
                  <div className="space-y-6 animate-in slide-in-from-left-4">
                      
                      {validationResult && (
                          <div className={`p-4 rounded-xl flex items-start gap-3 ${validationResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {validationResult.success ? <CheckCircle className="w-6 h-6 shrink-0"/> : <LogOut className="w-6 h-6 shrink-0 rotate-45"/>}
                              <div>
                                  <h3 className="font-bold">{validationResult.success ? 'Sucesso!' : 'Erro'}</h3>
                                  <p className="text-sm">{validationResult.msg}</p>
                              </div>
                              <button onClick={() => setValidationResult(null)} className="ml-auto opacity-50 hover:opacity-100"><LogOut className="w-4 h-4 rotate-45"/></button>
                          </div>
                      )}

                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                              <QrCode className="w-5 h-5 text-indigo-600" /> Registrar Consumo
                          </h2>
                          
                          <form onSubmit={handleValidate} className="space-y-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selecione a Campanha</label>
                                  <select 
                                      value={selectedBenefitId}
                                      onChange={e => setSelectedBenefitId(e.target.value)}
                                      className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:border-indigo-600"
                                  >
                                      <option value="">Selecione...</option>
                                      {myBenefits.map(b => (
                                          <option key={b.id} value={b.id}>{b.title}</option>
                                      ))}
                                  </select>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código do Cliente</label>
                                  <div className="relative">
                                      <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                                      <input 
                                          type="text" 
                                          value={userCode}
                                          onChange={e => setUserCode(e.target.value.toUpperCase())}
                                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl outline-none focus:border-indigo-600 font-mono text-lg uppercase tracking-widest placeholder:tracking-normal placeholder:font-sans"
                                          placeholder="Ex: 123-ABC"
                                      />
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1">Peça para o cliente mostrar o código no app dele.</p>
                              </div>

                              <button 
                                  type="submit"
                                  disabled={loading}
                                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                              >
                                  {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Confirmar Presença'}
                              </button>
                          </form>
                      </div>
                  </div>
              )}

              {view === 'create' && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in slide-in-from-right-4">
                      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Ticket className="w-5 h-5 text-indigo-600" /> Novo Benefício
                      </h2>
                      <form onSubmit={handleCreateBenefit} className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título da Oferta</label>
                              <input 
                                  type="text" 
                                  value={newBenefit.title}
                                  onChange={e => setNewBenefit({...newBenefit, title: e.target.value})}
                                  className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:border-indigo-600"
                                  placeholder="Ex: Fidelidade Pizza"
                                  required
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Regras / Descrição</label>
                              <textarea 
                                  value={newBenefit.description}
                                  onChange={e => setNewBenefit({...newBenefit, description: e.target.value})}
                                  className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:border-indigo-600 h-24 resize-none"
                                  placeholder="Ex: A cada 10 pizzas, ganhe uma brotinho doce."
                                  required
                              />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                  <select 
                                      value={newBenefit.type}
                                      onChange={e => setNewBenefit({...newBenefit, type: e.target.value as any})}
                                      className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:border-indigo-600"
                                  >
                                      <option value="loyalty">Cartão Fidelidade</option>
                                      <option value="discount">Desconto Simples</option>
                                  </select>
                              </div>
                              {newBenefit.type === 'loyalty' && (
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qtd. Selos</label>
                                      <input 
                                          type="number" 
                                          value={newBenefit.loyaltyMaxStamps}
                                          onChange={e => setNewBenefit({...newBenefit, loyaltyMaxStamps: Number(e.target.value)})}
                                          className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:border-indigo-600"
                                          min="3" max="20"
                                      />
                                  </div>
                              )}
                          </div>

                          {newBenefit.type === 'loyalty' && (
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prêmio Final</label>
                                  <input 
                                      type="text" 
                                      value={newBenefit.loyaltyReward}
                                      onChange={e => setNewBenefit({...newBenefit, loyaltyReward: e.target.value})}
                                      className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:border-indigo-600"
                                      placeholder="Ex: 1 Pizza Grátis"
                                      required
                                  />
                              </div>
                          )}

                          {newBenefit.type === 'discount' && (
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor do Desconto</label>
                                  <input 
                                      type="text" 
                                      value={newBenefit.discountValue}
                                      onChange={e => setNewBenefit({...newBenefit, discountValue: e.target.value})}
                                      className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:border-indigo-600"
                                      placeholder="Ex: 10% OFF ou R$ 15,00"
                                      required
                                  />
                              </div>
                          )}

                          <button 
                              type="submit"
                              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-colors"
                          >
                              Cadastrar Oferta
                          </button>
                      </form>
                  </div>
              )}

          </main>
      </div>
  );
};
