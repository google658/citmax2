
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Permite acesso via IP da rede (Wi-Fi)
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
});
