import * as Sentry from "@sentry/node";
import logger from "../utils/logger.js";

let sentryEnabled = false;

export const initSentry = () => {
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

  logger.info("[Sentry] Monitoring initialized");
  return { enabled: true };
};

export const bindSentryRequestContext = (req, res, next) => {
  if (!sentryEnabled) return next();

  Sentry.setTag("correlationId", req.correlationId || "unknown");
  Sentry.setContext("request", {
    method: req.method,
    path: req.originalUrl,
  });
  Sentry.setUser(req.userId ? { id: String(req.userId) } : null);
  next();
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
