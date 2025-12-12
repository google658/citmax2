
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.citmax.central',
  appName: 'CITmax',
  webDir: 'dist', // Se estiver usando Vite é 'dist', se for Create-React-App mude para 'build'
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#036271",
      showSpinner: true,
      spinnerColor: "#00c896"
    }
  }
};

export default config;
