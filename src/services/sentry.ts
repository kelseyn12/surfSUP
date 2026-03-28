/**
 * Sentry crash reporting wrapper.
 *
 * To activate:
 *   1. npx expo install @sentry/react-native
 *   2. Add EXPO_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz to .env
 *   3. Set SENTRY_ENABLED = true below
 *
 * Until the package is installed keep SENTRY_ENABLED = false — all calls are no-ops.
 */

const SENTRY_ENABLED = false; // flip to true after installing @sentry/react-native

let Sentry: any = null;

if (SENTRY_ENABLED) {
  try {
    Sentry = require('@sentry/react-native');
  } catch {
    console.warn('[Sentry] @sentry/react-native not installed');
  }
}

export const initializeSentry = (): void => {
  if (!Sentry) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) { console.warn('[Sentry] EXPO_PUBLIC_SENTRY_DSN not set'); return; }

  Sentry.init({
    dsn,
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    environment: __DEV__ ? 'development' : 'production',
  });

  if (__DEV__) console.log('[Sentry] Initialized');
};

/** Wrap the root App component for automatic JS error capture. */
export const wrapWithSentry = (component: any): any => {
  if (!Sentry) return component;
  return Sentry.wrap(component);
};

/** Manually capture an exception (e.g. from ErrorBoundary). */
export const captureException = (error: Error, context?: Record<string, any>): void => {
  if (!Sentry) return;
  Sentry.captureException(error, { extra: context });
};

/** Add context tags visible in the Sentry dashboard. */
export const setUserContext = (userId: string | null): void => {
  if (!Sentry) return;
  Sentry.setUser(userId ? { id: userId } : null);
};
