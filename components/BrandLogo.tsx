
import React from 'react';
import { useAdmin } from '../contexts/AdminContext';

interface BrandLogoProps {
  variant: 'white' | 'color';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ variant, className = "h-10" }) => {
  const { config } = useAdmin();

  // Lógica Simplificada:
  // 1. Se tiver uma URL customizada (http/https/data) configurada no painel admin, usa ela.
  // 2. Caso contrário, usa DIRETAMENTE os arquivos PNG da raiz.
  
  const isCustomConfig = config.logoUrl && (
      config.logoUrl.startsWith('http') || 
      config.logoUrl.startsWith('data:') || 
      config.logoUrl.startsWith('blob:')
  );

  // Adicionamos um timestamp (Date.now) apenas se você precisar forçar a limpeza de cache,
  // mas por padrão vamos usar o caminho limpo ./logo.png
  const src = isCustomConfig 
      ? config.logoUrl 
      : (variant === 'white' ? './logo-white.png' : './logo.png');

  return (
    <img 
      src={src} 
      alt="CITmax Logo" 
      className={`${className} w-auto object-contain select-none`}
      // Removemos o onError que tentava carregar SVG
    />
  );
};
