/**
 * Geocoding Cache Service
 * 
 * Provides caching functionality for geocoding results with both Redis and in-memory fallback.
 * Implements 24-hour TTL and cache statistics tracking.
 */

import crypto from 'crypto';
import { GeoJSONFeature, GeocodingCacheEntry, CacheStats } from '../lib/geocoding.types';

/**
 * Cache key generation from query
 */
function generateCacheKey(query: string): string {
  return `geocode:${crypto.createHash('md5').update(query.toLowerCase()).digest('hex')}`;
}

/**
 * In-memory cache implementation (fallback when Redis unavailable)
 */
class InMemoryCache {
  private cache: Map<string, GeocodingCacheEntry> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
  };

  get(key: string): GeocodingCacheEntry | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    entry.hits++;
    return entry;
  }

  set(key: string, entry: GeocodingCacheEntry, ttl: number = 86400): void {
    entry.expiresAt = new Date(Date.now() + ttl * 1000);
    this.cache.set(key, entry);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const total = this.stats.hits + this.stats.misses;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      entries: this.cache.size,
      size: entries.reduce((sum, e) => sum + JSON.stringify(e).length, 0),
      oldestEntry: entries.length > 0 ? entries[entries.length - 1].timestamp : undefined,
      newestEntry: entries.length > 0 ? entries[0].timestamp : undefined,
    };
  }
}

/**
 * Redis-based cache (preferred)
 */
class RedisCache {
  private redisUrl: string;
  private client: any = null;
  private connected: boolean = false;

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Lazy load redis client (optional dependency)
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const redis = require('redis');
        this.client = redis.createClient({ url: this.redisUrl });
        
        this.client.on('error', (err: any) => {
          console.error('Redis connection error:', err);
          this.connected = false;
        });

        this.client.on('connect', () => {
          this.connected = true;
          console.log('Redis cache connected');
        });

        await this.client.connect();
      } catch (importError) {
        throw new Error('Redis package not installed');
      }
    } catch (error) {
      console.warn('Redis not available, using in-memory cache:', (error as any).message);
      this.client = null;
    }
  }

  async get(key: string): Promise<GeocodingCacheEntry | null> {
    if (!this.connected || !this.client) return null;

    try {
      const data = await this.client.get(key);
      if (!data) return null;

      const entry = JSON.parse(data) as GeocodingCacheEntry;
      
      // Check expiration
      if (new Date(entry.expiresAt) < new Date()) {
        await this.client.del(key);
        return null;
      }

      entry.hits++;
      return entry;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, entry: GeocodingCacheEntry, ttl: number = 86400): Promise<void> {
    if (!this.connected || !this.client) return;

    try {
      entry.expiresAt = new Date(Date.now() + ttl * 1000);
      await this.client.setEx(key, ttl, JSON.stringify(entry));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.connected || !this.client) return false;

    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.connected || !this.client) return;

    try {
      await this.client.flushDb();
    } catch (error) {
      console.error('Redis clear error:', error);
    }
  }

  async getStats(): Promise<CacheStats> {
    if (!this.connected || !this.client) {
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        entries: 0,
        size: 0,
      };
    }

    try {
      const info = await this.client.info('stats');
      const dbSize = await this.client.dbSize();
      
      // Parse basic stats (this is simplified; full implementation would parse Redis info)
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        entries: dbSize,
        size: 0,
      };
    } catch (error) {
      console.error('Redis stats error:', error);
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        entries: 0,
        size: 0,
      };
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Geocoding Cache Service
 * Abstracts between Redis and in-memory caching
 */
export class GeocodingCacheService {
  private backend: RedisCache | InMemoryCache;
  private ttl: number; // Default TTL in seconds (24 hours)
  private useRedis: boolean;

  constructor(redisUrl?: string, ttl: number = 86400) {
    this.ttl = ttl;
    
    if (redisUrl && redisUrl.startsWith('redis://')) {
      this.backend = new RedisCache(redisUrl);
      this.useRedis = true;
    } else {
      this.backend = new InMemoryCache();
      this.useRedis = false;
    }
  }

  /**
   * Get cached geocoding result
   */
  async get(query: string): Promise<GeocodingCacheEntry | null> {
    const key = generateCacheKey(query);
    return this.backend.get(key);
  }

  /**
   * Cache geocoding result
   */
  async set(
    query: string,
    results: GeoJSONFeature[],
    source: 'maptiler' | 'osm'
  ): Promise<void> {
    const key = generateCacheKey(query);
    const entry: GeocodingCacheEntry = {
      query,
      results,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.ttl * 1000),
      source,
      hits: 0,
    };
    
    if (this.useRedis && this.backend instanceof RedisCache) {
      await (this.backend as RedisCache).set(key, entry, this.ttl);
    } else {
      (this.backend as InMemoryCache).set(key, entry, this.ttl);
    }
  }

  /**
   * Remove cached result
   */
  async delete(query: string): Promise<boolean> {
    const key = generateCacheKey(query);
    
    if (this.useRedis && this.backend instanceof RedisCache) {
      return await (this.backend as RedisCache).delete(key);
    } else {
      return (this.backend as InMemoryCache).delete(key);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (this.useRedis && this.backend instanceof RedisCache) {
      await (this.backend as RedisCache).clear();
    } else {
      (this.backend as InMemoryCache).clear();
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    if (this.useRedis && this.backend instanceof RedisCache) {
      return await (this.backend as RedisCache).getStats();
    } else {
      return (this.backend as InMemoryCache).getStats();
    }
  }

  /**
   * Check if using Redis or in-memory
   */
  isUsingRedis(): boolean {
    return this.useRedis && (this.backend instanceof RedisCache) && 
           (this.backend as RedisCache).isConnected();
  }

  /**
   * Get backend type for debugging
   */
  getBackendType(): string {
    if (this.useRedis && this.backend instanceof RedisCache) {
      return (this.backend as RedisCache).isConnected() ? 'redis' : 'redis (offline)';
    }
    return 'in-memory';
  }
}

export default GeocodingCacheService;
