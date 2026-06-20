import { NextFunction, Request, Response } from "express";
import { createClient } from "redis";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

type Counter = {
  count: number;
  resetAt: number;
};

const counters = new Map<string, Counter>();
const MAX_MEMORY_COUNTERS = 10_000;
let redisClientPromise: Promise<ReturnType<typeof createClient>> | null = null;

const getRedisClient = async () => {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisClientPromise) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on("error", () => {
      // Rate limiting falls back to the local process map below.
    });
    redisClientPromise = client.connect().then(() => client);
  }

  return redisClientPromise;
};

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const firstForwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0];

  return (firstForwardedIp || req.socket.remoteAddress || "unknown").trim();
};

export const createRateLimit = ({ windowMs, max, keyPrefix }: RateLimitOptions) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${keyPrefix}:${getClientIp(req)}`;

    try {
      const redis = await getRedisClient();
      if (redis) {
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.pExpire(key, windowMs);
        }

        if (count > max) {
          const ttl = await redis.pTTL(key);
          res.setHeader("Retry-After", Math.max(1, Math.ceil(ttl / 1000)).toString());
          return res.status(429).json({ error: "Too many requests" });
        }

        return next();
      }
    } catch {
      // Keep a bounded in-memory fallback if Redis is temporarily unavailable.
    }

    if (counters.size >= MAX_MEMORY_COUNTERS) {
      for (const [counterKey, counter] of counters) {
        if (counter.resetAt <= now || counters.size >= MAX_MEMORY_COUNTERS) {
          counters.delete(counterKey);
        }

        if (counters.size < MAX_MEMORY_COUNTERS) {
          break;
        }
      }
    }

    const current = counters.get(key);

    if (!current || current.resetAt <= now) {
      counters.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000).toString());
      return res.status(429).json({ error: "Too many requests" });
    }

    return next();
  };
