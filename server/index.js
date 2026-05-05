import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { EventEmitter } from "events";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import hpp from "hpp";
import connectDB from "./config/connectDB.js";
import authRouter from "./routes/auth.route.js";
import clientRouter from "./routes/client.route.js";
import adminRouter from "./routes/admin.route.js";
import userRouter from "./routes/user.route.js";
import aiRouter from "./routes/ai.route.js";
import analysisRouter from "./routes/analysis.route.js";
import reportRouter from "./routes/report.route.js";
import notificationRouter from "./routes/notification.route.js";
import { seedRoles } from "./utils/roleSeeder.js";
import { initAuditCron } from "./cron/auditCron.js";
import logger from "./utils/logger.js";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { requireDb } from "./middleware/dbReady.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { validateEnvironment } from "./config/validateEnv.js";
import {
  correlationIdMiddleware,
  requestLoggerMiddleware,
} from "./middleware/correlationId.js";
import { initSentry } from "./config/sentry.js";
import { sanitizeInput } from "./middleware/sanitizeInput.js";

const envCandidates = [
  path.join(process.cwd(), "server", ".env"),
  path.join(process.cwd(), ".env"),
];
const envPath = envCandidates.find((p) => fs.existsSync(p));
dotenv.config(envPath ? { path: envPath, override: true } : { override: true });
if (envPath) {
  logger.info(`[Startup] Loaded environment from: ${envPath}`);
} else {
  logger.warn(`[Startup] No .env file found in expected locations`);
}

const validatedEnv = validateEnvironment(process.env);

const app = express();
app.set("trust proxy", 1); // Trust first proxy (Render/Vercel) for secure cookies
initSentry(app);

// Ensure uploads directory exists at startup
try {
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`[Startup] Created uploads directory at: ${uploadDir}`);
  } else {
    logger.info(`[Startup] Uploads directory exists at: ${uploadDir}`);
  }
} catch (error) {
  logger.error(
    `[Startup] Failed to create uploads directory: ${error.message}`,
  );
}

// Debug Environment Variables
if (!process.env.SECRET_KEY_ACCESS_TOKEN) {
  logger.error(
    "CRITICAL: SECRET_KEY_ACCESS_TOKEN is missing in environment variables!",
  );
}
if (!process.env.MONGODB_URI) {
  logger.error("CRITICAL: MONGODB_URI is missing in environment variables!");
}
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  logger.error(
    "CRITICAL: CLOUDINARY configuration is missing in environment variables!",
  );
}

const realtimeEmitter = new EventEmitter();
app.set("realtimeEmitter", realtimeEmitter);
const allowedOrigins = validatedEnv.FRONTEND_URL.map((o) => o.trim());

if (validatedEnv.NODE_ENV !== "production") {
  console.log("Allowed origins:", allowedOrigins);
}

app.use(
  cors({
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    origin: (origin, callback) => {
      if (validatedEnv.NODE_ENV !== "production") {
        console.log("Incoming origin:", origin);
      }

      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
  }),
);
app.use(correlationIdMiddleware);
app.use(requestLoggerMiddleware);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(sanitizeInput);
app.use(hpp());
app.use("/api", apiLimiter);

const PORT = process.env.PORT || 8080;

app.get("/", (request, response) => {
  response.json({
    message: "Server is running " + PORT,
  });
});

app.get("/api/health", (req, res) => {
  const state = mongoose.connection.readyState;
  const dbStatus =
    state === 1
      ? "connected"
      : state === 2
        ? "connecting"
        : state === 0
          ? "disconnected"
          : "unknown";
  const healthy = dbStatus === "connected";
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    db: dbStatus,
    env: "validated",
    uptime: process.uptime(),
    correlationId: req.correlationId,
  });
});

app.use("/api", requireDb);

app.use("/api/auth", authRouter);
app.use("/api/client", clientRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/ai", aiRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/reports", reportRouter);
app.use("/api/notification", notificationRouter);

// Global Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

connectDB()
  .then(async () => {
    try {
      await seedRoles();
      initAuditCron();
      app.listen(PORT, "0.0.0.0", () => {
        logger.info(`Server is running ${PORT}`);
      });
    } catch (startupError) {
      logger.error("Error during startup sequence:", startupError);
    }
  })
  .catch((err) => {
    logger.error(
      "CRITICAL: Database connection failed. Server starting in limited mode.",
      err,
    );
    // Start server anyway to provide health check and logs
    app.listen(PORT, "0.0.0.0", () => {
      logger.info(`Server started (LIMITED MODE - NO DB) on ${PORT}`);
    });
  });
