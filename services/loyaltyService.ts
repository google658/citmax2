
import { PartnerBenefit, UserLoyaltyCard, PartnerSession } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ==============================================================================
// PASSO 2: CONEXÃO COM O BANCO DE DADOS (SUPABASE)
// ==============================================================================

// 1. PROJECT URL:
const SUPABASE_URL = 'https://slewlfkfqgyxvdivpjzh.supabase.co'; 

// 2. ANON / PUBLISHABLE KEY:
const SUPABASE_ANON_KEY = 'sb_publishable_ZtKA-fh_LmFrChjqLZcj2A_WJVZlDpG'; 

// ==============================================================================

// --- MOCK DATA (Fallback se não houver Supabase configurado) ---
const BENEFITS_KEY = 'citmax_benefits_data';
const LOYALTY_CARDS_KEY = 'citmax_loyalty_cards';
const PARTNERS_KEY = 'citmax_partners_data'; // New key for partners

const INITIAL_PARTNERS = [
    { id: 'p1', name: 'Pizzaria do João', email: 'pizza@parceiro.com', password: '123' },
    { id: 'p2', name: 'Barbearia VIP', email: 'barba@parceiro.com', password: '123' },
    { id: 'p3', name: 'Farmácia Central', email: 'farma@parceiro.com', password: '123' }
];

const INITIAL_BENEFITS: PartnerBenefit[] = [
    {
        id: 'b1',
        partnerId: 'p1',
        partnerName: 'Pizzaria do João',
        title: 'Fidelidade Pizza',
        description: 'Junte 10 selos e ganhe uma Pizza Grande.',
        type: 'loyalty',
        loyaltyMaxStamps: 10,
        loyaltyReward: '1 Pizza Grande Grátis',
        category: 'food',
        color: 'bg-orange-500'
    },
    {
        id: 'b2',
        partnerId: 'p2',
        partnerName: 'Barbearia VIP',
        title: 'Corte com Desconto',
        description: '20% de desconto no corte de cabelo e barba.',
        type: 'discount',
        discountValue: '20% OFF',
        category: 'services',
        color: 'bg-slate-800'
    },
    {
        id: 'b3',
        partnerId: 'p3',
        partnerName: 'Farmácia Central',
        title: 'Clube Saúde',
        description: 'A cada R$ 50,00 em compras, ganhe 1 selo.',
        type: 'loyalty',
        loyaltyMaxStamps: 5,
        loyaltyReward: 'Vale Compras R$ 20,00',
        category: 'health',
        color: 'bg-red-600'
    }
];

// Inicializa o Supabase se as chaves estiverem preenchidas
let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase Conectado com Sucesso!");
    } catch (e) {
        console.warn("Falha ao conectar Supabase", e);
    }
} else {
    console.warn("Chaves do Supabase não configuradas. Usando modo de teste (Mock).");
}

export const LoyaltyService = {
    
    isSupabaseEnabled: () => !!supabase,

    // --- GESTÃO DE PARCEIROS (ADMIN) ---

    getPartners: async (): Promise<any[]> => {
        // Tenta buscar no banco primeiro
        if (supabase) {
            const { data, error } = await supabase.from('partners').select('*');
            if (!error && data) return data;
            console.warn("Falha ao buscar parceiros no Supabase (usando local):", error?.message);
        }
        
        // Fallback: LocalStorage
        const saved = localStorage.getItem(PARTNERS_KEY);
        return saved ? JSON.parse(saved) : INITIAL_PARTNERS;
    },

    registerPartner: async (name: string, email: string, password: string): Promise<boolean> => {
        let savedToCloud = false;
        
        // 1. Tenta salvar na nuvem
        if (supabase) {
            const { error } = await supabase.from('partners').insert({ name, email, password });
            if (!error) savedToCloud = true;
            else console.warn("Erro ao salvar parceiro na nuvem:", error.message);
        }

        // 2. Se salvou na nuvem, ok. Se falhou (ou não tem nuvem), salva local.
        if (savedToCloud) return true;

        // Lógica Local (Fallback)
        const saved = localStorage.getItem(PARTNERS_KEY);
        const partners = saved ? JSON.parse(saved) : INITIAL_PARTNERS;

        if (partners.find((p: any) => p.email === email)) {
            throw new Error("E-mail já cadastrado (Local).");
        }

        const newPartner = {
            id: `p_${Date.now()}`,
            name,
            email,
            password
        };

        const updated = [...partners, newPartner];
        localStorage.setItem(PARTNERS_KEY, JSON.stringify(updated));
        return true;
    },

    deletePartner: async (id: string): Promise<void> => {
        if (supabase) {
            const { error } = await supabase.from('partners').delete().eq('id', id);
            if (!error) return; // Se deletou na nuvem, retorna
        }

        // Fallback Local
        const saved = localStorage.getItem(PARTNERS_KEY);
        const partners = saved ? JSON.parse(saved) : INITIAL_PARTNERS;
        const updated = partners.filter((p: any) => p.id !== id);
        localStorage.setItem(PARTNERS_KEY, JSON.stringify(updated));
    },

    // --- LOGIN DO PARCEIRO ---
    loginPartner: async (email: string, password: string): Promise<PartnerSession | null> => {
        if (supabase) {
            // Busca o parceiro no banco real
            const { data, error } = await supabase
                .from('partners')
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .single();
            
            if (data && !error) return { id: data.id, name: data.name, email: data.email };
        }

        // Login Fallback (LocalStorage + Mock)
        // Precisamos buscar a lista ATUALIZADA (getPartners já faz o fallback de leitura)
        const partners = await LoyaltyService.getPartners();
        const partner = partners.find((p: any) => p.email === email && p.password === password);
        
        if (partner) {
            return { id: partner.id, name: partner.name, email: partner.email };
        }
        return null;
    },

    // --- BUSCAR BENEFÍCIOS ---
    getBenefits: async (): Promise<PartnerBenefit[]> => {
        if (supabase) {
            const { data, error } = await supabase.from('benefits').select(`
                *,
                partners (name)
            `);
            
            if (!error && data) {
                return data.map((b: any) => ({
                    id: b.id,
                    partnerId: b.partner_id,
                    partnerName: b.partners?.name || 'Parceiro',
                    title: b.title,
                    description: b.description,
                    type: b.type,
                    loyaltyMaxStamps: b.max_stamps,
                    loyaltyReward: b.reward,
                    discountValue: b.discount_value,
                    category: 'food', 
                    color: 'bg-indigo-600'
                }));
            }
        }

        const saved = localStorage.getItem(BENEFITS_KEY);
        return saved ? JSON.parse(saved) : INITIAL_BENEFITS;
    },

    // --- CRIAR NOVO BENEFÍCIO ---
    createBenefit: async (benefit: PartnerBenefit) => {
        let savedToCloud = false;
        if (supabase) {
            const { error } = await supabase.from('benefits').insert({
                partner_id: benefit.partnerId,
                title: benefit.title,
                description: benefit.description,
                type: benefit.type,
                max_stamps: benefit.loyaltyMaxStamps,
                reward: benefit.loyaltyReward,
                discount_value: benefit.discountValue
            });
            if (!error) savedToCloud = true;
        }

        if (savedToCloud) return;

        const current = await LoyaltyService.getBenefits();
        const updated = [benefit, ...current];
        localStorage.setItem(BENEFITS_KEY, JSON.stringify(updated));
    },

    // --- BUSCAR CARTÕES DO USUÁRIO ---
    getUserCards: async (userId: string): Promise<UserLoyaltyCard[]> => {
        if (supabase) {
            const { data, error } = await supabase.from('user_cards').select(`
                *,
                benefits (
                    title,
                    reward,
                    max_stamps,
                    partners (name)
                )
            `).eq('user_id', userId);

            if (!error && data) {
                return data.map((c: any) => ({
                    id: c.id,
                    benefitId: c.benefit_id,
                    partnerName: c.benefits?.partners?.name || 'Parceiro',
                    currentStamps: c.current_stamps,
                    maxStamps: c.benefits?.max_stamps || 10,
                    reward: c.benefits?.reward || 'Prêmio',
                    history: [],
                    isRedeemed: c.is_redeemed
                }));
            }
        }

        const allCards = JSON.parse(localStorage.getItem(LOYALTY_CARDS_KEY) || '{}');
        return allCards[userId] || [];
    },

    // --- CRIAR/OBTER CARTÃO (QUANDO USUÁRIO CLICA EM PARTICIPAR) ---
    getOrCreateCard: async (userId: string, benefit: PartnerBenefit): Promise<UserLoyaltyCard> => {
        if (supabase) {
            // Verifica se já existe
            const { data: existing, error: fetchError } = await supabase.from('user_cards')
                .select('*')
                .eq('user_id', userId)
                .eq('benefit_id', benefit.id)
                .single();

            if (!fetchError && existing) {
                 // Busca detalhes do beneficio para retornar objeto completo
                 // Para simplificar no cloud, assumimos dados locais do benefit passado
                 return {
                    id: existing.id,
                    benefitId: benefit.id,
                    partnerName: benefit.partnerName,
                    currentStamps: existing.current_stamps,
                    maxStamps: benefit.loyaltyMaxStamps || 10,
                    reward: benefit.loyaltyReward || '',
                    history: [],
                    isRedeemed: existing.is_redeemed
                };
            }

            // Cria novo cartão zerado
            const { data, error } = await supabase.from('user_cards').insert({
                user_id: userId,
                benefit_id: benefit.id,
                current_stamps: 0
            }).select().single();

            if (!error && data) {
                return {
                    id: data.id,
                    benefitId: benefit.id,
                    partnerName: benefit.partnerName,
                    currentStamps: 0,
                    maxStamps: benefit.loyaltyMaxStamps || 10,
                    reward: benefit.loyaltyReward || '',
                    history: [],
                    isRedeemed: false
                };
            }
        }

        // Fallback Local
        const allCards = JSON.parse(localStorage.getItem(LOYALTY_CARDS_KEY) || '{}');
        const userCards: UserLoyaltyCard[] = allCards[userId] || [];
        
        let card = userCards.find(c => c.benefitId === benefit.id);
        
        if (!card) {
            card = {
                id: `${userId}_${benefit.id}_${Date.now()}`,
                benefitId: benefit.id,
                partnerName: benefit.partnerName,
                currentStamps: 0,
                maxStamps: benefit.loyaltyMaxStamps || 10,
                reward: benefit.loyaltyReward || 'Prêmio',
                history: [],
                isRedeemed: false
            };
            userCards.push(card);
            allCards[userId] = userCards;
            localStorage.setItem(LOYALTY_CARDS_KEY, JSON.stringify(allCards));
        }
        return card;
    },

    // --- VALIDAR CONSUMO (USADO PELO LOJISTA) ---
    validateConsumption: async (userCode: string, benefitId: string): Promise<{ success: boolean, msg: string, newStamps?: number }> => {
        const [userId] = userCode.split('-');
        if (!userId) return { success: false, msg: 'Código inválido.' };

        if (supabase) {
            // 1. Busca cartão do usuário
            const { data: card, error } = await supabase.from('user_cards')
                .select('*')
                .eq('user_id', userId)
                .eq('benefit_id', benefitId)
                .single();
            
            // 2. Busca regras da campanha
            const { data: benefit } = await supabase.from('benefits').select('*').eq('id', benefitId).single();

            if (!error && card && benefit) {
                let currentStamps = 0;
                
                if (card.current_stamps >= benefit.max_stamps) {
                    return { success: false, msg: 'Cartela cheia! O cliente deve resgatar o prêmio antes.' };
                }
                currentStamps = card.current_stamps + 1;
                
                await supabase.from('user_cards').update({
                    current_stamps: currentStamps,
                    is_redeemed: currentStamps >= benefit.max_stamps
                }).eq('id', card.id);

                return { 
                    success: true, 
                    msg: currentStamps >= benefit.max_stamps ? `Cartela Completa! Prêmio: ${benefit.reward}` : 'Selo adicionado!',
                    newStamps: currentStamps 
                };
            }
            
            if (!card && benefit) {
                 // Criar cartao se nao existe no momento do consumo
                 const { data: newCard } = await supabase.from('user_cards').insert({
                    user_id: userId,
                    benefit_id: benefitId,
                    current_stamps: 1
                }).select().single();
                
                if (newCard) {
                    return { success: true, msg: 'Selo adicionado!', newStamps: 1 };
                }
            }
        }

        // Mock Logic (Fallback)
        try {
            const allCards = JSON.parse(localStorage.getItem(LOYALTY_CARDS_KEY) || '{}');
            const userCards: UserLoyaltyCard[] = allCards[userId] || [];
            
            const cardIndex = userCards.findIndex(c => c.benefitId === benefitId);
            
            if (cardIndex === -1) {
                const benefits = await LoyaltyService.getBenefits();
                const benefit = benefits.find(b => b.id === benefitId);
                if (!benefit) return { success: false, msg: 'Benefício não encontrado.' };
                
                const newCard: UserLoyaltyCard = {
                    id: `${userId}_${benefitId}_${Date.now()}`,
                    benefitId: benefitId,
                    partnerName: benefit.partnerName,
                    currentStamps: 1, 
                    maxStamps: benefit.loyaltyMaxStamps || 10,
                    reward: benefit.loyaltyReward || '',
                    history: [{ date: new Date().toISOString(), action: 'add' }],
                    isRedeemed: false
                };
                userCards.push(newCard);
                allCards[userId] = userCards;
                localStorage.setItem(LOYALTY_CARDS_KEY, JSON.stringify(allCards));
                return { success: true, msg: 'Cartão criado e 1º selo adicionado!', newStamps: 1 };
            }

            const card = userCards[cardIndex];

            if (card.currentStamps < card.maxStamps) {
                card.currentStamps += 1;
                card.history.push({ date: new Date().toISOString(), action: 'add' });
                
                if (card.currentStamps === card.maxStamps) {
                    card.isRedeemed = true;
                }

                userCards[cardIndex] = card;
                allCards[userId] = userCards;
                localStorage.setItem(LOYALTY_CARDS_KEY, JSON.stringify(allCards));
                
                return { 
                    success: true, 
                    msg: card.isRedeemed ? `Parabéns! O cliente completou a cartela: ${card.reward}` : 'Selo adicionado com sucesso!', 
                    newStamps: card.currentStamps 
                };
            } else {
                return { success: false, msg: 'Esta cartela já está completa/resgatada. O cliente deve iniciar uma nova.' };
            }

        } catch (e) {
            return { success: false, msg: 'Erro ao processar validação.' };
        }
    }
};
