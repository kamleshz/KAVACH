import rateLimit from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const authAttemptStore = new Map();

const cleanupExpiredAuthEntries = () => {
  const now = Date.now();
  for (const [key, value] of authAttemptStore.entries()) {
    if (
      !value?.timestamps?.length &&
      (!value?.blockedUntil || value.blockedUntil <= now)
    ) {
      authAttemptStore.delete(key);
      continue;
    }

    value.timestamps = (value.timestamps || []).filter(
      (ts) => now - ts < FIFTEEN_MINUTES,
    );
    if (value.blockedUntil && value.blockedUntil <= now) {
      value.blockedUntil = 0;
    }

    if (!value.timestamps.length && !value.blockedUntil) {
      authAttemptStore.delete(key);
    } else {
      authAttemptStore.set(key, value);
    }
  }
};

const getRequestIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded)) return forwarded[0];
  return (forwarded || req.ip || "").toString().split(",")[0].trim();
};

const getAuthKey = (req, email = "") =>
  `${getRequestIp(req)}::${String(email || "")
    .trim()
    .toLowerCase()}`;

const getOrCreateAuthState = (key) => {
  cleanupExpiredAuthEntries();
  const state = authAttemptStore.get(key) || {
    timestamps: [],
    consecutiveFailures: 0,
    blockedUntil: 0,
  };
  authAttemptStore.set(key, state);
  return state;
};

const buildRateLimitResponse = (message) => ({
  message,
  error: true,
  success: false,
});

export const apiLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildRateLimitResponse("Too many requests. Please try again later."),
});

export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildRateLimitResponse(
    "Too many authentication attempts from this IP. Please try again after 15 minutes.",
  ),
});

export const authAccountLimiter = (req, res, next) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  if (!email) return next();

  const key = getAuthKey(req, email);
  const state = getOrCreateAuthState(key);
  const now = Date.now();

  if (state.blockedUntil && state.blockedUntil > now) {
    const retryAfter = Math.ceil((state.blockedUntil - now) / 1000);
    res.setHeader("Retry-After", retryAfter);
    return res
      .status(429)
      .json(
        buildRateLimitResponse(
          `Too many login attempts for this account. Retry after ${retryAfter} seconds.`,
        ),
      );
  }

  if ((state.timestamps || []).length >= 5) {
    state.blockedUntil = now + FIFTEEN_MINUTES;
    res.setHeader("Retry-After", Math.ceil(FIFTEEN_MINUTES / 1000));
    return res
      .status(429)
      .json(
        buildRateLimitResponse(
          "Too many login attempts for this account. Please try again after 15 minutes.",
        ),
      );
  }

  const delayMs = Math.min(
    Math.max(state.consecutiveFailures - 1, 0) * 1500,
    8000,
  );
  if (!delayMs) return next();

  return setTimeout(next, delayMs);
};

export const registerAuthAttemptSuccess = (req, email = "") => {
  const key = getAuthKey(req, email);
  const state = getOrCreateAuthState(key);
  state.timestamps = [];
  state.consecutiveFailures = 0;
  state.blockedUntil = 0;
  authAttemptStore.set(key, state);
};

export const registerAuthAttemptFailure = (req, email = "") => {
  const key = getAuthKey(req, email);
  const state = getOrCreateAuthState(key);
  const now = Date.now();
  state.timestamps.push(now);
  state.timestamps = state.timestamps.filter(
    (ts) => now - ts < FIFTEEN_MINUTES,
  );
  state.consecutiveFailures += 1;

  if (state.timestamps.length >= 5) {
    state.blockedUntil = now + FIFTEEN_MINUTES;
  }

  authAttemptStore.set(key, state);
};
