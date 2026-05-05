import * as Sentry from "@sentry/node";
import logger from "../utils/logger.js";

let sentryEnabled = false;

export const initSentry = (app) => {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    logger.info(
      "[Sentry] SENTRY_DSN not configured. Monitoring template loaded in noop mode.",
    );
    return { enabled: false };
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
  });

  sentryEnabled = true;

  if (app) {
    app.use((req, res, next) => {
      Sentry.setTag("correlationId", req.correlationId || "unknown");
      Sentry.setUser(req.userId ? { id: String(req.userId) } : null);
      next();
    });
  }

  logger.info("[Sentry] Monitoring initialized");
  return { enabled: true };
};

export const captureServerException = (error, context = {}) => {
  if (!sentryEnabled) return;

  Sentry.withScope((scope) => {
    Object.entries(context || {}).forEach(([key, value]) => {
      scope.setContext(key, typeof value === "object" ? value : { value });
    });
    Sentry.captureException(error);
  });
};

export const isSentryEnabled = () => sentryEnabled;

export default Sentry;
