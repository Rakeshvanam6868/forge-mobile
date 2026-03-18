import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const initSentry = () => {
  if (!dsn) {
    // In local/dev without DSN configured, skip initialization
    return;
  }

  Sentry.init({
    dsn,
    debug: false,
    tracesSampleRate: 1.0,
    _experiments: {
      profilesSampleRate: 1.0,
    },
    // Prevent PII from being sent to Sentry
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
};

export const captureError = (error: any, context?: Record<string, any>) => {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
};
