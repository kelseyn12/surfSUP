// Import Firebase first to ensure it's initialized
import './src/config/firebase';

import { useEffect } from 'react';
import { View } from 'react-native';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';
import { initializeSpotService } from './src/services/spotService';
import { firestoreCleanupStaleCheckIns } from './src/services/firestore';
import { initializeSentry, wrapWithSentry } from './src/services/sentry';

// Initialize Sentry before any rendering
initializeSentry();

function AppRoot() {
  useEffect(() => {
    initializeSpotService();
    firestoreCleanupStaleCheckIns();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <View style={{ flex: 1 }}>
          <OfflineBanner />
          <AppNavigator />
        </View>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default wrapWithSentry(AppRoot);
