import Redis from "ioredis";
import logger from "../utils/logger.js";

const memoryStore = new Map();

class CacheService {
  static client = null;
  static queueConnection = null;
  static isMemoryFallback = false;

  static getClient() {
    if (this.client) return this.client;

    if (!process.env.REDIS_URL) {
      this.isMemoryFallback = true;
      logger.warn(
        "[Redis] REDIS_URL not configured. Using in-memory cache fallback.",
      );
      return null;
    }

    this.client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.client.on("error", (error) => {
      logger.error({ error: error.message }, "[Redis] Cache connection error");
    });

    return this.client;
  }

  static getQueueConnection() {
    if (this.queueConnection) return this.queueConnection;
    if (!process.env.REDIS_URL) return null;

    this.queueConnection = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.queueConnection.on("error", (error) => {
      logger.error({ error: error.message }, "[Redis] Queue connection error");
    });

    return this.queueConnection;
  }

  static async getCache(key) {
    const client = this.getClient();
    if (!client) {
      const entry = memoryStore.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        memoryStore.delete(key);
        return null;
      }
      return entry.value;
    }

    const value = await client.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  static async setCache(key, value, ttlSeconds = 300) {
    const client = this.getClient();
    if (!client) {
      memoryStore.set(key, {
        value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
      });
      return value;
    }

    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await client.set(key, serialized, "EX", ttlSeconds);
    } else {
      await client.set(key, serialized);
    }
    return value;
  }

  static async invalidateCache(pattern) {
    if (!pattern) return;

    const matchPattern = pattern.includes("*") ? pattern : `*${pattern}*`;
    const client = this.getClient();
    if (!client) {
      for (const key of memoryStore.keys()) {
        if (matchPattern === "*" || key.includes(pattern) || pattern === key) {
          memoryStore.delete(key);
        }
      }
      return;
    }

    const keys = await this.listKeys(matchPattern);
    if (keys.length) {
      await client.del(keys);
    }
  }

  static async listKeys(pattern) {
    const client = this.getClient();
    const normalizedPattern = pattern || "*";

    if (!client) {
      return Array.from(memoryStore.keys()).filter((key) => {
        if (normalizedPattern === "*") return true;
        const needle = normalizedPattern.replaceAll("*", "");
        return !needle || key.includes(needle);
      });
    }

    const keys = [];
    for await (const key of client.scanIterator({
      match: normalizedPattern,
      count: 100,
    })) {
      keys.push(key);
    }
    return keys;
  }

  static ttl = {
    dashboard: 60 * 5,
    reports: 60 * 30,
    analytics: 60 * 5,
    compliance: 60 * 5,
  };
}

export default CacheService;
