import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neuluma.winnerscircle',
  appName: "Winner's Circle",
  webDir: 'public',
  server: {
    url: 'https://winners-circle-portal-production.up.railway.app',
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      // Show banner + play sound + bump badge even when the app is in the
      // foreground (iOS default is to suppress all of these). Same options
      // honored by @capacitor/push-notifications on Android too.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
