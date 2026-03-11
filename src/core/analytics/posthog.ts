import PostHog from 'posthog-react-native';

export const posthog = new PostHog('phc_BbW36YNBI1i7kiWMfSkUjDZr49HVd18ikqm9GkI3xj7', {
  host: 'https://eu.posthog.com', // Change if using EU instance
  captureAppLifecycleEvents: true,
});

export const trackAnalyticsEvent = (
  eventName: string,
  properties?: Record<string, any>
) => {
  posthog.capture(eventName, properties);
};

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  posthog.identify(userId, properties);
};

export const resetAnalytics = () => {
  posthog.reset();
};
