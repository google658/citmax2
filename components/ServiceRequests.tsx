
import React, { useState, useEffect } from 'react';
import { SGPContract, SGPServiceOrder } from '../types';
import { APIService } from '../services/apiService';
import { 
  ArrowLeft, 
  MapPin, 
  User, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  CreditCard,
  Banknote,
  Search,
  Truck,
  ClipboardList,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface ServiceRequestsProps {
  contract: SGPContract;
  userCpfCnpj: string;
  userPassword?: string;
  onBack: () => void;
}

type RequestType = 'menu' | 'address_change' | 'ownership_transfer' | 'ticket_list';
type AddressChangeStep = 'info' | 'form' | 'success';

export const ServiceRequests: React.FC<ServiceRequestsProps> = ({ contract, userCpfCnpj, userPassword, onBack }) => {
  const [view, setView] = useState<RequestType>('menu');
  
  // Address Change State
  const [step, setStep] = useState<AddressChangeStep>('info');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [error, setError] = useState('');
  const [protocol, setProtocol] = useState('');

  // Ticket List State
  const [tickets, setTickets] = useState<SGPServiceOrder[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    pontoReferencia: '',
    contatoNome: '',
    contatoTelefone: ''
  });

  useEffect(() => {
    if (view === 'ticket_list') {
      fetchTickets();
    }
  }, [view]);

  const fetchTickets = async () => {
    if (!userPassword) return;
    setIsLoadingTickets(true);
    try {
      const data = await APIService.getServiceOrders(userCpfCnpj, userPassword, contract.id_contrato);
      setTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const handleCepBlur = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      setIsSearchingCep(true);
      const address = await APIService.getAddressByCep(cep);
      setIsSearchingCep(false);
      
      if (address) {
        setFormData(prev => ({
          ...prev,
          logradouro: address.street,
          bairro: address.neighborhood,
          cidade: address.city,
          uf: address.state
        }));
      }
    }
  };

  const handleSubmitAddressChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPassword) return;
    
    // Basic validation
    if (!formData.cep || !formData.logradouro || !formData.numero || !formData.bairro || !formData.contatoTelefone) {
        setError("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    setIsLoading(true);
    setError('');

    const message = `
SOLICITAÇÃO DE MUDANÇA DE ENDEREÇO
----------------------------------
Taxa de R$ 50,00 aceita pelo cliente.

NOVO ENDEREÇO:
CEP: ${formData.cep}
Logradouro: ${formData.logradouro}, Nº ${formData.numero}
Complemento: ${formData.complemento}
Bairro: ${formData.bairro}
Cidade/UF: ${formData.cidade}/${formData.uf}
Ponto de Ref.: ${formData.pontoReferencia}

CONTATO PARA AGENDAMENTO:
Nome: ${formData.contatoNome || contract.razao_social}
Tel: ${formData.contatoTelefone}
    `.trim();

    try {
      const response = await APIService.openSupportTicket(
        userCpfCnpj,
        userPassword,
        contract.id_contrato,
        message,
        formData.contatoNome || contract.razao_social,
        formData.contatoTelefone,
        '13' // ID 13: Mudança de Endereço
      );

      if (response.protocolo) {
        setProtocol(response.protocolo);
        setStep('success');
      } else {
        throw new Error(response.msg || "Erro ao abrir solicitação.");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao processar solicitação. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderMenu = () => (
    <div className="space-y-4 animate-in slide-in-from-right-4">
      <h2 className="text-xl font-bold text-[#036271] dark:text-white mb-6">Selecione o serviço desejado</h2>

      <button 
        onClick={() => setView('ticket_list')}
        className="w-full bg-white dark:bg-[#02343f] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-[#00c896]/10 flex items-center justify-between group hover:border-[#00c896] transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Meus Chamados</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Ver solicitações abertas e finalizadas</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-[#00c896]" />
      </button>

      <button 
        onClick={() => setView('address_change')}
        className="w-full bg-white dark:bg-[#02343f] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-[#00c896]/10 flex items-center justify-between group hover:border-[#00c896] transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Mudança de Endereço</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Solicitar transferência de local</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-[#00c896]" />
      </button>

      <button 
        onClick={() => setView('ownership_transfer')}
        className="w-full bg-white dark:bg-[#02343f] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-[#00c896]/10 flex items-center justify-between group hover:border-[#00c896] transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Troca de Titularidade</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Transferir contrato para outra pessoa</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-[#00c896]" />
      </button>
    </div>
  );

  const getStatusStyles = (status: string) => {
      const s = status.toLowerCase();
      if (s.includes('aberta') || s.includes('aberto')) {
          return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      }
      if (s.includes('encerrada') || s.includes('fechado')) {
          return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      }
      if (s.includes('execução') || s.includes('execucao')) {
          return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      }
      if (s.includes('pendente')) {
          return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
      }
      return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  const renderTicketList = () => {
    if (isLoadingTickets) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#00c896] mb-2" />
          <p>Buscando chamados...</p>
        </div>
      );
    }

    if (tickets.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white dark:bg-[#02343f] rounded-3xl shadow-sm border border-slate-200 dark:border-[#00c896]/10">
           <ClipboardList className="w-12 h-12 text-slate-200 dark:text-slate-600 mb-2" />
           <p className="font-semibold">Nenhum chamado encontrado</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-in slide-in-from-right-4">
        <h2 className="text-xl font-bold text-[#036271] dark:text-white mb-4">Meus Chamados</h2>
        {tickets.map(ticket => {
          const statusClass = getStatusStyles(ticket.status);
          const isOpen = ticket.status.toLowerCase().includes('aberta') || ticket.status.toLowerCase().includes('pendente');

          return (
            <div key={ticket.id} className="bg-white dark:bg-[#02343f] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-[#00c896]/10 relative overflow-hidden group hover:shadow-md transition-all">
               <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isOpen ? 'bg-[#00c896]' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
               
               <div className="pl-2">
                 <div className="flex justify-between items-center mb-3">
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${statusClass}`}>
                      {ticket.status}
                    </span>
                    <span className="text-xs text-slate-400 font-mono tracking-wide">#{ticket.protocolo}</span>
                 </div>
                 
                 <h3 className="font-bold text-slate-800 dark:text-white mb-2 text-base leading-snug">
                    {ticket.assunto}
                 </h3>
                 
                 <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Abertura: <strong>{ticket.data_abertura}</strong>
                    </span>
                    {ticket.data_fechamento && (
                      <span className="text-slate-400 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Fechado: {ticket.data_fechamento}
                      </span>
                    )}
                 </div>

                 {ticket.mensagem && (
                   <div className="bg-slate-50 dark:bg-[#01252b] p-3 rounded-xl border border-slate-100 dark:border-white/5 mt-2">
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {ticket.mensagem}
                      </p>
                   </div>
                 )}
               </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAddressChange = () => {
    if (step === 'info') {
      return (
        <div className="bg-white dark:bg-[#02343f] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-[#00c896]/10 animate-in fade-in zoom-in">
          <div className="w-16 h-16 bg-[#00c896]/10 dark:bg-[#00c896]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-[#00c896]" />
          </div>
          <h2 className="text-2xl font-bold text-[#036271] dark:text-white text-center mb-2">Mudança de Endereço</h2>
          <p className="text-center text-slate-600 dark:text-slate-300 mb-6">
            Você está solicitando a transferência do seu ponto de internet para um novo local.
          </p>

          <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-orange-800 dark:text-orange-400 text-sm">Taxa de Deslocamento</h4>
                <p className="text-sm text-orange-700 dark:text-orange-300/80 mt-1">
                  Este serviço possui uma taxa de <strong>R$ 50,00</strong> referente ao custo técnico e de materiais.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase">Formas de Pagamento (Ao Técnico)</h4>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Cartão
              </span>
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <Banknote className="w-3 h-3" /> Dinheiro
              </span>
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Pix
              </span>
            </div>
          </div>

          <button 
            onClick={() => setStep('form')}
            className="w-full py-4 bg-[#00c896] hover:bg-[#008B87] text-[#036271] font-bold rounded-xl shadow-lg shadow-[#00c896]/20 transition-all text-lg"
          >
            Concordar e Continuar
          </button>
        </div>
      );
    }

    if (step === 'form') {
      return (
        <form onSubmit={handleSubmitAddressChange} className="bg-white dark:bg-[#02343f] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-[#00c896]/10 animate-in slide-in-from-right-4">
          <h2 className="text-xl font-bold text-[#036271] dark:text-white mb-4">Novo Endereço</h2>
          
          {error && (
            <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/30">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">CEP</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.cep}
                  onChange={e => setFormData({...formData, cep: e.target.value})}
                  onBlur={handleCepBlur}
                  className="w-full p-3 bg-slate-50 dark:bg-[#01252b] border border-slate-200 dark:border-[#00c896]/20 rounded-xl outline-none focus:border-[#00c896] dark:text-white transition-colors"
                  placeholder="00000-000"
                  maxLength={9}
                />
                {isSearchingCep && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="w-5 h-5 text-[#00c896] animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Logradouro</label>
                <input 
                  type="text" 
                  value={formData.logradouro}
                  onChange={e => setFormData({...formData, logradouro: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-[#01252b] border border-slate-200 dark:border-[#00c896]/20 rounded-xl outline-none focus:border-[#00c896] dark:text-white transition-colors"
                  placeholder="Rua, Av..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Número</label>
                <input 
                  type="text" 
                  value={formData.numero}
                  onChange={e => setFormData({...formData, numero: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-[#01252b] border border-slate-200 dark:border-[#00c896]/20 rounded-xl outline-none focus:border-[#00c896] dark:text-white transition-colors"
                  placeholder="123"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Bairro</label>
              <input 
                type="text" 
                value={formData.bairro}
                onChange={e => setFormData({...formData, bairro: e.target.value})}
                className="w-full p-3 bg-slate-50 dark:bg-[#01252b] border border-slate-200 dark:border-[#00c896]/20 rounded-xl outline-none focus:border-[#00c896] dark:text-white transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Complemento</label>
                <input 
                  type="text" 
                  value={formData.complemento}
                  onChange={e => setFormData({...formData, complemento: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-[#01252b] border border-slate-200 dark:border-[#00c896]/20 rounded-xl outline-none focus:border-[#00c896] dark:text-white transition-colors"
                  placeholder="Apt, Bloco"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cidade</label>
                <input 
                  type="text" 
                  value={formData.cidade}
                  onChange={e => setFormData({...formData, cidade: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-[#01252b] border border-slate-200 dark:border-[#00c896]/20 rounded-xl outline-none focus:border-[#00c896] dark:text-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Ponto de Referência</label>
              <input 
                type="text" 
                value={formData.pontoReferencia}
                onChange={e => setFormData({...formData, pontoReferencia: e.target.value})}
                className="w-full p-3 bg-slate-50 dark:bg-[#01252b] border border-slate-200 dark:border-[#00c896]/20 rounded-xl outline-none focus:border-[#00c896] dark:text-white transition-colors"
                placeholder="Ex: Próximo ao mercado..."
              />
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-[#00c896]/10">
              <h3 className="text-sm font-bold text-[#036271] dark:text-white mb-3">Contato para Agendamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome Responsável</label>
                    <input 
                        type="text" 
                        value={formData.contatoNome}
                        onChange={e => setFormData({...formData, contatoNome: e.target.value})}
                        className="w-full p-3 bg-slate-50 dark:bg-[#01252b] border border-slate-200 dark:border-[#00c896]/20 rounded-xl outline-none focus:border-[#00c896] dark:text-white transition-colors"
                        placeholder={contract.razao_social}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Telefone / WhatsApp *</label>
                    <input 
                        type="tel" 
                        value={formData.contatoTelefone}
                        onChange={e => setFormData({...formData, contatoTelefone: e.target.value})}
                        className="w-full p-3 bg-slate-50 dark:bg-[#01252b] border border-slate-200 dark:border-[#00c896]/20 rounded-xl outline-none focus:border-[#00c896] dark:text-white transition-colors"
                        placeholder="(00) 90000-0000"
                        required
                    />
                 </div>
              </div>
            </div>

            <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-[#00c896] hover:bg-[#008B87] text-[#036271] font-bold rounded-xl shadow-lg shadow-[#00c896]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Solicitação (R$ 50,00)'}
                </button>
            </div>
          </div>
        </form>
      );
    }

    if (step === 'success') {
       return (
        <div className="bg-white dark:bg-[#02343f] p-8 rounded-3xl shadow-lg border-t-8 border-green-500 text-center space-y-6 w-full animate-in fade-in slide-in-from-bottom-4">
            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            
            <div>
                <h2 className="text-2xl font-bold text-[#036271] dark:text-white">Solicitação Recebida!</h2>
                <p className="text-slate-600 dark:text-slate-300 mt-2">Nossa equipe entrará em contato em breve para agendar a visita técnica.</p>
            </div>

            <div className="bg-slate-50 dark:bg-[#01252b] p-4 rounded-xl text-left text-sm border border-slate-200 dark:border-white/10">
                <p className="text-slate-500 dark:text-slate-400 mb-1">Protocolo:</p>
                <p className="font-mono font-bold text-slate-800 dark:text-white tracking-wider text-lg">{protocol}</p>
                
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                       A taxa de R$ 50,00 deverá ser paga diretamente ao técnico no momento da execução do serviço.
                    </p>
                </div>
            </div>

            <button 
                onClick={onBack}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
            >
                Voltar ao Início
            </button>
        </div>
       );
    }
    return null;
  };

  const renderOwnershipTransfer = () => (
    <div className="bg-white dark:bg-[#02343f] p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-[#00c896]/10 animate-in fade-in zoom-in">
       <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-purple-600 dark:text-purple-400" />
       </div>
       <h2 className="text-2xl font-bold text-[#036271] dark:text-white text-center mb-4">Troca de Titularidade</h2>
       
       <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          <p>Para transferir o contrato para o nome de outra pessoa, é necessário comparecer à nossa loja física ou entrar em contato com o suporte para envio de documentação.</p>
          
          <div className="bg-slate-50 dark:bg-[#01252b] p-4 rounded-xl border border-slate-200 dark:border-[#00c896]/20">
             <h4 className="font-bold text-slate-800 dark:text-white mb-2">Documentos Necessários (Novo Titular):</h4>
             <ul className="list-disc pl-5 space-y-1">
                <li>RG e CPF (ou CNH)</li>
                <li>Comprovante de Residência</li>
                <li>Ser maior de 18 anos</li>
             </ul>
          </div>
          
          <p className="font-medium text-center">
             O titular atual não deve possuir débitos pendentes.
          </p>
       </div>

       <div className="mt-8 flex flex-col gap-3">
          <button 
            onClick={() => onBack()} // In real app, maybe open chat
            className="w-full py-3 bg-[#00c896] hover:bg-[#008B87] text-[#036271] font-bold rounded-xl shadow-lg shadow-[#00c896]/20 transition-all"
          >
             Falar com Atendente
          </button>
          <button 
            onClick={() => setView('menu')}
            className="w-full py-3 bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium"
          >
             Voltar
          </button>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#01252b] flex flex-col font-['Montserrat'] transition-colors duration-300">
      {/* Header */}
      <div className="bg-[#036271] p-6 shadow-lg sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => view === 'menu' ? onBack() : setView('menu')}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-['Righteous'] text-white">Solicitações</h1>
            <p className="text-[#00c896] text-xs">Serviços Administrativos</p>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-xl mx-auto w-full p-6">
         {view === 'menu' && renderMenu()}
         {view === 'address_change' && renderAddressChange()}
         {view === 'ownership_transfer' && renderOwnershipTransfer()}
         {view === 'ticket_list' && renderTicketList()}
      </main>
    </div>
  );
};
