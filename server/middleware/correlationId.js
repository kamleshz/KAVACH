import { randomUUID } from "crypto";
import { createRequestLogger } from "../utils/logger.js";

export const correlationIdMiddleware = (req, res, next) => {
  const headerCorrelationId = req.headers["x-correlation-id"];
  const correlationId =
    typeof headerCorrelationId === "string" && headerCorrelationId.trim()
      ? headerCorrelationId.trim()
      : randomUUID();

  req.correlationId = correlationId;
  req.log = createRequestLogger({
    correlationId,
    method: req.method,
    path: req.originalUrl,
  });

  res.setHeader("X-Correlation-Id", correlationId);
  next();
};

export const requestLoggerMiddleware = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    req.log?.info({
      type: "http_request",
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
};
