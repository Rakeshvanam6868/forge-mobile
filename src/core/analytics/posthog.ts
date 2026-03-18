import { Platform } from 'react-native';
import PostHog from 'posthog-react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com';

const noopClient = {
  capture: () => {},
  identify: () => {},
  reset: () => {},
};

export const posthog =
  apiKey && apiKey.length > 0
    ? new PostHog(apiKey, {
        host,
        captureAppLifecycleEvents: true,
      })
    : (noopClient as unknown as PostHog);

export const trackAnalyticsEvent = (
  eventName: string,
  properties?: Record<string, any>
) => {
  const enriched = {
    ...(properties ?? {}),
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
  };
  posthog.capture(eventName, enriched);
};

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  posthog.identify(userId, properties);
};

export const resetAnalytics = () => {
  posthog.reset();
};
