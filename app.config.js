export default {
  expo: {
    name: 'surfSUP',
    slug: 'surfSUP',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.surfsup.app'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.surfsup.app'
    },
    web: {
      favicon: './assets/favicon.png'
    },
    extra: {
      // Firebase configuration temporarily disabled
      // firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      // firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      // firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      // firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      // firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      // firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      // firebaseMeasurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      eas: {
        projectId: "f2bb1207-a627-4127-9621-85b3da79b6e3"
      }
    }
  }
}; 