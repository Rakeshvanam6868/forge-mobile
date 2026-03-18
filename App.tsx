import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/features/auth/hooks/useAuth';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PostHogProvider } from 'posthog-react-native';
import { posthog } from './src/core/analytics/posthog';
import * as Sentry from '@sentry/react-native';
import { initSentry } from './src/core/monitoring/sentry';
import { queryClient } from './src/core/query/client';

initSentry();

function App() {
  return (
    <PostHogProvider client={posthog} autocapture={false}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AuthProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </AuthProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </PostHogProvider>
  );
}

export default Sentry.wrap(App);
