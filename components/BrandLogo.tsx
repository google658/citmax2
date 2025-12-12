
import React from 'react';
import { useAdmin } from '../contexts/AdminContext';

interface BrandLogoProps {
  variant: 'white' | 'color';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ variant, className = "h-10" }) => {
  let configLogoUrl: string | undefined;
  
  try {
      const admin = useAdmin();
      if (admin && admin.config) {
          configLogoUrl = admin.config.logoUrl;
      }
  } catch (e) {
      // Fallback silencioso se o contexto falhar
  }

  // Lógica de URL
  const isCustomConfig = configLogoUrl && (
      configLogoUrl.startsWith('http') || 
      configLogoUrl.startsWith('data:') || 
      configLogoUrl.startsWith('blob:')
  );

  const src = isCustomConfig 
      ? configLogoUrl!
      : (variant === 'white' ? './logo-white.png' : './logo.png');

  return (
    <img 
      src={src} 
      alt="CITmax Logo" 
      className={`${className} w-auto object-contain select-none`}
      onError={(e) => {
         // Se a imagem falhar (404), apenas diminui a opacidade mas não quebra
         (e.target as HTMLImageElement).style.opacity = "0.5"; 
      }}
    />
  );
};
