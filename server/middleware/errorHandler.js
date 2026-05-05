import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import { captureServerException } from "../config/sentry.js";

export const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

export const errorHandler = (error, req, res, next) => {
  const statusCode = error?.statusCode || 500;
  const message = error?.message || "Internal Server Error";

  if (res.headersSent) {
    return next(error);
  }

  (req.log || logger).error(
    {
      statusCode,
      message,
      stack: error?.stack,
    },
    "[Unhandled Error]",
  );

  captureServerException(error, {
    request: {
      correlationId: req.correlationId,
      method: req.method,
      path: req.originalUrl,
      userId: req.userId,
    },
  });

  return res.status(statusCode).json({
    message,
    error: true,
    success: false,
    correlationId: req.correlationId,
    ...(process.env.NODE_ENV !== "production" && error?.stack
      ? { stack: error.stack }
      : {}),
  });
};
