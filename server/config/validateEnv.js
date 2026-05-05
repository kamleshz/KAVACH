import { z } from "zod";

const frontendUrlsSchema = z
  .string()
  .min(1, "FRONTEND_URL is required")
  .transform((value, ctx) => {
    const rawUrls = value.split(",");
    const urls = rawUrls.map((url) => url.trim());

    if (!urls.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "FRONTEND_URL must contain at least one URL",
      });
      return z.NEVER;
    }

    urls.forEach((url, index) => {
      if (!url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `FRONTEND_URL contains an empty value at position ${index + 1}`,
        });
      }
    });

    urls.forEach((url) => {
      if (!url) return;

      if (url === "*") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Wildcard FRONTEND_URL values are not allowed",
        });
        return;
      }

      try {
        new URL(url);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid frontend URL: ${url}`,
        });
      }
    });

    return urls;
  });

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.string().min(1),
    FRONTEND_URL: frontendUrlsSchema,
    MONGODB_URI: z.string().min(1).optional(),
    MONGO_URI: z.string().min(1).optional(),
    SECRET_KEY_ACCESS_TOKEN: z.string().min(16),
    SECRET_KEY_REFRESH_TOKEN: z.string().min(16),
    MAIL_USER: z.string().min(1),
    MAIL_PASS: z.string().min(1),
    CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().min(1).optional(),
    REDIS_URL: z.string().url().optional(),
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (!env.MONGODB_URI && !env.MONGO_URI) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MONGODB_URI"],
        message: "Either MONGODB_URI or MONGO_URI is required",
      });
    }
  });

export const validateEnvironment = (env = process.env) => {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return parsed.data;
};
