
import { AppConfig } from '../types';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (Mesmas chaves usadas no LoyaltyService)
const SUPABASE_URL = 'https://slewlfkfqgyxvdivpjzh.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_ZtKA-fh_LmFrChjqLZcj2A_WJVZlDpG'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STORAGE_KEY = 'citmax_app_config';
const DB_TABLE = 'app_config'; // Nome da tabela no Supabase
const CONFIG_ID = 'global_settings'; // ID fixo para buscar a única linha de config

export const ConfigService = {
  /**
   * Carrega configurações do Supabase (Tabela 'app_config')
   */
  loadConfig: async (): Promise<AppConfig | null> => {
    try {
      // 1. Tenta buscar do Supabase com timeout de 3s para não travar o app
      const fetchPromise = supabase
        .from(DB_TABLE)
        .select('config_json')
        .eq('id', CONFIG_ID)
        .single();
        
      // Timeout wrapper
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (data && data.config_json) {
        // Atualiza cache local
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.config_json));
        return data.config_json as AppConfig;
      }

      if (error && error.code !== 'PGRST116') { // Ignora erro de "não encontrado"
          console.warn("Erro ao ler config do Supabase:", error);
      }

    } catch (error) {
      console.warn("Supabase offline ou erro de conexão. Usando cache local.", error);
    }

    // 2. Fallback: LocalStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
          return JSON.parse(saved);
      } catch(e) { return null; }
    }
    return null;
  },

  /**
   * Salva configurações no Supabase
   * Retorna true se salvou (local ou nuvem), false apenas se falhar tudo crítico
   */
  saveConfig: async (config: AppConfig): Promise<boolean> => {
    let savedLocal = false;
    
    // 1. Salva localmente primeiro (otimismo)
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        savedLocal = true;
    } catch (e) {
        console.error("Erro localStorage:", e);
    }

    // 2. Tenta salvar no Supabase (Upsert)
    try {
      const { error } = await supabase
        .from(DB_TABLE)
        .upsert({ 
            id: CONFIG_ID, 
            config_json: config,
            updated_at: new Date().toISOString()
        });

      if (error) {
        // Se a tabela não existir ou erro de RLS, vai cair aqui
        console.warn("Falha ao salvar no Supabase (ignorando pois salvou local):", error.message);
        return savedLocal; // Retorna true se salvou localmente, mesmo com erro no banco
      }
      return true;

    } catch (e) {
      console.error("Falha ao persistir configuração no Supabase:", e);
      return savedLocal;
    }
  },

  /**
   * Upload de imagem para o Supabase Storage (Bucket 'app-assets')
   */
  uploadImage: async (file: File): Promise<string> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('app-assets') 
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('app-assets')
            .getPublicUrl(filePath);

        return data.publicUrl;

    } catch (error) {
        console.warn("Upload Supabase falhou, usando Base64 fallback.", error);
        // Fallback: Base64
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
    }
  }
};
