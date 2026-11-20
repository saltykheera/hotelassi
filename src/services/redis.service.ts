import { Redis } from "ioredis";
import { HotelOffer } from "../types/hotel.types.js";
import { IHotelCacheRepository } from "../types/repository.types.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const DEFAULT_TTL_SECONDS = 300; // 5 minutes cache

export class RedisService implements IHotelCacheRepository {
  private client: Redis;
  private isConnected: boolean = false;
  private memoryFallback: Map<string, HotelOffer[]> = new Map();

  constructor(customClient?: Redis) {
    if (customClient) {
      this.client = customClient;
      this.isConnected = true;
    } else {
      this.client = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
        connectTimeout: 1500,
        retryStrategy(times) {
          if (times > 2) return null; // Stop retrying if Redis is not running locally
          return 500;
        },
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        logger.info("Connected to Redis server");
      });

      this.client.on("error", (err) => {
        this.isConnected = false;
        logger.debug({ err: err.message }, "Redis is currently offline; in-memory fallback active");
      });
    }
  }

  private getKeys(city: string) {
    const normalizedCity = city.trim().toLowerCase();
    return {
      normalizedCity,
      zsetKey: `hotels:zset:${normalizedCity}`,
      dataKey: `hotels:data:${normalizedCity}`,
    };
  }

  /**
   * Persists deduplicated hotel offers in Redis using Sorted Set and Hash
   */
  public async saveHotels(
    city: string,
    hotels: HotelOffer[],
    ttlSeconds: number = DEFAULT_TTL_SECONDS
  ): Promise<void> {
    const { normalizedCity, zsetKey, dataKey } = this.getKeys(city);

    try {
      const pipeline = this.client.pipeline();

      // Clear old city cache
      pipeline.del(zsetKey);
      pipeline.del(dataKey);

      if (hotels.length > 0) {
        for (const hotel of hotels) {
          // ZSET for native Redis price-range filtering: score = price, member = name
          pipeline.zadd(zsetKey, hotel.price, hotel.name);
          // HASH for fast O(1) payload retrieval by hotel name
          pipeline.hset(dataKey, hotel.name, JSON.stringify(hotel));
        }

        pipeline.expire(zsetKey, ttlSeconds);
        pipeline.expire(dataKey, ttlSeconds);
      }

      const results = await pipeline.exec();

      if (results) {
        for (const [err] of results) {
          if (err) throw err;
        }
      }

      logger.debug({ city, count: hotels.length, ttlSeconds }, "Saved hotels to Redis cache");
    } catch (err: any) {
      logger.warn(
        { city, count: hotels.length, error: err.message },
        "Redis unavailable; cached in in-memory fallback store"
      );
      this.memoryFallback.set(normalizedCity, hotels);
    }
  }

  /**
   * Queries hotels within price range natively inside Redis via ZRANGEBYSCORE
   */
  public async getHotelsByPriceRange(
    city: string,
    minPrice?: number,
    maxPrice?: number
  ): Promise<HotelOffer[]> {
    const { normalizedCity, zsetKey, dataKey } = this.getKeys(city);

    try {
      const minStr = minPrice !== undefined ? minPrice.toString() : "-inf";
      const maxStr = maxPrice !== undefined ? maxPrice.toString() : "+inf";

      // 1. In-Redis price filtering via Sorted Set
      const matchingHotelNames = await this.client.zrangebyscore(zsetKey, minStr, maxStr);

      if (!matchingHotelNames || matchingHotelNames.length === 0) {
        return [];
      }

      // 2. Fetch full objects from Hash using the filtered hotel names
      const rawOffers = await this.client.hmget(dataKey, ...matchingHotelNames);

      const offers: HotelOffer[] = [];
      for (const raw of rawOffers) {
        if (raw) {
          try {
            offers.push(JSON.parse(raw) as HotelOffer);
          } catch (parseErr) {
            logger.warn({ parseErr, raw }, "Failed to parse cached hotel JSON");
          }
        }
      }

      return offers;
    } catch (err: any) {
      logger.debug(
        { city, error: err.message },
        "Redis unavailable; querying from in-memory fallback store"
      );
      const cached = this.memoryFallback.get(normalizedCity) || [];
      return cached.filter((h) => {
        if (minPrice !== undefined && h.price < minPrice) return false;
        if (maxPrice !== undefined && h.price > maxPrice) return false;
        return true;
      });
    }
  }

  /**
   * Checks whether cache exists for a given city
   */
  public async hasHotels(city: string): Promise<boolean> {
    const { normalizedCity, zsetKey } = this.getKeys(city);
    try {
      const count = await this.client.zcard(zsetKey);
      return count > 0;
    } catch {
      return this.memoryFallback.has(normalizedCity);
    }
  }

  /**
   * Health check for Redis dependency
   */
  public async healthCheck(): Promise<{
    status: "UP" | "DOWN";
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const pong = await this.client.ping();
      const latencyMs = Date.now() - start;
      if (pong === "PONG") {
        return { status: "UP", latencyMs };
      }
      return { status: "DOWN", latencyMs, error: `Unexpected PING response: ${pong}` };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return { status: "DOWN", latencyMs, error: err.message || "Failed to reach Redis" };
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
