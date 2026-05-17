import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { validateEnvironment } from "../config/validateEnv.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const firebaseKeyPath = path.join(projectRoot, "config", "serviceAccountKey.json");

const print = (message) => {
  process.stdout.write(`${message}\n`);
};

const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
};

const warn = (message) => {
  process.stdout.write(`${message}\n`);
};

const validateRequiredEnv = () => {
  try {
    const env = validateEnvironment(process.env);
    print("PASS env validation");

    if (env.NODE_ENV !== "production") {
      warn(`WARN NODE_ENV is '${env.NODE_ENV}', expected 'production' for a real production preflight`);
    }

    if (!process.env.REDIS_URL) {
      warn("WARN REDIS_URL is missing; report queue and shared cache will fall back or be disabled");
    }

    return true;
  } catch (error) {
    fail(`FAIL env validation: ${error.message}`);
    return false;
  }
};

const validateSecretsStrength = () => {
  const checks = [
    ["SECRET_KEY_ACCESS_TOKEN", process.env.SECRET_KEY_ACCESS_TOKEN],
    ["SECRET_KEY_REFRESH_TOKEN", process.env.SECRET_KEY_REFRESH_TOKEN],
  ];

  let ok = true;
  for (const [name, value] of checks) {
    if (!value || value.length < 32) {
      fail(`FAIL ${name} should be at least 32 characters for production`);
      ok = false;
    }
  }

  if (ok) {
    print("PASS secret length check");
  }

  return ok;
};

const validateOptionalIntegrations = () => {
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    print("PASS Cloudinary env present");
  } else {
    warn("WARN Cloudinary env is incomplete; document/image uploads may fail");
  }

  if (fs.existsSync(firebaseKeyPath)) {
    print("PASS Firebase service account file present");
  } else {
    warn("WARN Firebase serviceAccountKey.json missing; push/upload integrations may be disabled");
  }

  if (process.env.SENTRY_DSN) {
    print("PASS Sentry DSN configured");
  } else {
    warn("WARN SENTRY_DSN missing; production crash monitoring will be limited");
  }

  if (process.env.MAIL_FROM || process.env.MAIL_USER) {
    print("PASS mail sender configuration present");
  } else {
    warn("WARN mail sender configuration missing");
  }
};

const main = () => {
  const envOk = validateRequiredEnv();
  const secretsOk = validateSecretsStrength();
  validateOptionalIntegrations();

  if (!envOk || !secretsOk) {
    fail("Production preflight failed");
    return;
  }

  print("Production preflight passed");
};

main();
