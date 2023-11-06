import type { ExecutionResult } from 'graphql';
import type { ExecutionContext, KVNamespace } from '@cloudflare/workers-types';
import type { Cache, CacheEntityRecord } from '@envelop/response-cache';
import { buildOperationKey } from './cache-key.js';
import { invalidate } from './invalidate.js';
import { set } from './set.js';

export type KvCacheConfig = {
  /**
   * The Cloudflare KV namespace that should be used to store the cache
   */
  KV: KVNamespace;
  /**
   * The Cloudflare worker execution context. Used to perform non-blocking actions like cache storage and invalidation.
   */
  ctx: ExecutionContext;
  /**
   *  Defines the length of time in milliseconds that a KV result is cached in the global network location it is accessed from.
   *
   * The cacheTTL parameter must be an integer greater than or equal to 60000 (60 seconds), which is the default.
   */
  cacheReadTTL?: number;
  /**
   * A prefix that should be added to all cache keys
   */
  keyPrefix?: string;
};

/**
 * Creates a cache object that uses Cloudflare KV to store GraphQL responses.
 * This cache is optimized for Cloudflare workers and uses the `ctx.waitUntil` method to perform non-blocking actions where possible
 *
 * To find out more about how this cache is implemented see https://the-guild.dev/blog/graphql-response-caching-with-envelop
 *
 * @param config Modify the behavior of the cache as it pertains to Cloudflare KV
 * @returns A cache object that can be passed to envelop's `useResponseCache` plugin
 */
export function createKvCache(config: KvCacheConfig): Cache {
  const cache: Cache = {
    async get(id: string) {
      const ttlInSeconds = Math.max(Math.floor((config.cacheReadTTL ?? 60000) / 1000), 60); // KV TTL must be at least 60 seconds
      const kvResponse = await config.KV.get(buildOperationKey(id, config.keyPrefix), {
        type: 'text',
        cacheTtl: ttlInSeconds,
      });
      if (kvResponse) {
        return JSON.parse(kvResponse) as ExecutionResult;
      }
      return undefined;
    },

    set(
      /** id/hash of the operation */
      id: string,
      /** the result that should be cached */
      data: ExecutionResult,
      /** array of entity records that were collected during execution */
      entities: Iterable<CacheEntityRecord>,
      /** how long the operation should be cached (in milliseconds) */
      ttl: number,
    ) {
      // Do not block execution of the worker while caching the result
      config.ctx.waitUntil(set(id, data, entities, ttl, config));
    },

    invalidate(entities: Iterable<CacheEntityRecord>) {
      // Do not block execution of the worker while invalidating the cache
      config.ctx.waitUntil(invalidate(entities, config));
    },
  };
  return cache;
}
