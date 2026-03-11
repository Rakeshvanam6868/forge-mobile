import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/features/auth/hooks/useAuth';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PostHogProvider } from 'posthog-react-native';
import { posthog } from './src/core/analytics/posthog';
import * as Sentry from '@sentry/react-native';
import { initSentry } from './src/core/monitoring/sentry';

initSentry();

const queryClient = new QueryClient();

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
