// Import Firebase first to ensure it's initialized
import './src/config/firebase';

import { View } from 'react-native';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';

export default function App() {
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
