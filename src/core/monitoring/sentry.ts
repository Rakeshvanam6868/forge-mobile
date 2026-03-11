import * as Sentry from '@sentry/react-native';

export const initSentry = () => {
  Sentry.init({
    dsn: 'https://ba53e8a3355919247f670903e33144f0@o4511024523509760.ingest.de.sentry.io/4511024572072016', // Set DSN from Sentry Dashboard
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
