import type { CapacitorConfig } from '@capacitor/cli';

// The Android app is a native shell around the live site: every merge to main (which
// redeploys Render) updates the app at once, with no new store release. A store release
// is only needed when something in android/ changes (icon, permissions, name, version).
const config: CapacitorConfig = {
  appId: 'com.ronikov.app',
  appName: 'RONIKOV',
  // Required by Capacitor even though the app loads server.url; holds the Vite build.
  webDir: 'dist',
  server: {
    url: 'https://ronikov.onrender.com',
    cleartext: false,
  },
  android: {
    backgroundColor: '#00553c',
  },
};

export default config;
