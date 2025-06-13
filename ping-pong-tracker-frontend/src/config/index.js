const config = {
  appName: import.meta.env.VITE_APP_NAME || 'Ping-Pong Score Tracker',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  environment: import.meta.env.VITE_APP_ENV || 'development',
  isDevelopment: import.meta.env.VITE_APP_ENV === 'development',
  isProduction: import.meta.env.VITE_APP_ENV === 'production',
  isTest: import.meta.env.VITE_APP_ENV === 'test',
  
  // Firebase config
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  },
  
  // Feature flags
  features: {
    enableNotifications: import.meta.env.VITE_FEATURE_NOTIFICATIONS === 'true',
    enableRealTimeUpdates: import.meta.env.VITE_FEATURE_REALTIME === 'true'
  }
};

export default config;
