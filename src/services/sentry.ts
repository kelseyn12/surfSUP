/**
 * Sentry crash reporting wrapper.
 *
 * STATUS: Activated 2026-06-23. @sentry/react-native is installed (via
 * `npx @sentry/wizard@latest -i reactNative`), native iOS/Android setup is
 * complete, and a real captured error was confirmed in the Sentry dashboard.
 *
 * Setup note for reference: the wizard does more than installing the package —
 * it also patches app.json (Expo plugin), adds/updates metro.config.js for
 * source maps, and writes ios/sentry.properties + android/sentry.properties
 * (auth tokens — must stay gitignored, never commit). A clean rebuild
 * (`npx expo run:ios` / `run:android`) is required after the native pods
 * change; a plain Metro reload is not enough.
 *
 * EXPO_PUBLIC_SENTRY_DSN must be set in .env for initializeSentry() to do
 * anything — without it this is a no-op even with SENTRY_ENABLED = true.
 */

const SENTRY_ENABLED = true;

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