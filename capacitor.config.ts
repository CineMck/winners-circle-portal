import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neuluma.winnerscircle',
  appName: "Winner's Circle",
  webDir: 'public',
  server: {
    url: 'https://winners-circle-portal-production.up.railway.app',
    cleartext: false,
  },
};

export default config;
