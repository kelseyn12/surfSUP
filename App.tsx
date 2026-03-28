// Import Firebase first to ensure it's initialized
import './src/config/firebase';

import { useEffect } from 'react';
import { View } from 'react-native';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';
import { initializeSpotService } from './src/services/spotService';
import { initializeSentry, wrapWithSentry } from './src/services/sentry';

// Initialize Sentry before any rendering
initializeSentry();

function AppRoot() {
  useEffect(() => {
    // Fire-and-forget: loads spots from Firestore/cache in the background.
    // Falls back to bundled spots.json automatically if unavailable.
    initializeSpotService();
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
