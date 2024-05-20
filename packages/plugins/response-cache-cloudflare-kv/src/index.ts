import type { ExecutionResult } from 'graphql';
import type { KVNamespace } from '@cloudflare/workers-types';
import type { Cache, CacheEntityRecord } from '@envelop/response-cache';
import { buildOperationKey } from './cache-key.js';
import { invalidate } from './invalidate.js';
import { set } from './set.js';

export type KvCacheConfig<TKVNamespaceName extends string> = {
  /**
   * The name of the  Cloudflare KV namespace that should be used to store the cache
   */
  KVName: TKVNamespaceName;
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
export function createKvCache<
  TKVNamespaceName extends string,
  TServerContext extends {
    [TKey in TKVNamespaceName]: KVNamespace;
  } & {
    waitUntil(fn: Promise<unknown>): void;
  },
>(config: KvCacheConfig<TKVNamespaceName>): (ctx: TServerContext) => Cache {
  if (config.cacheReadTTL && config.cacheReadTTL < 60000) {
    // eslint-disable-next-line no-console
    console.warn(
      'Cloudflare KV cacheReadTTL must be at least 60000 (60 seconds). Using default value of 60000 instead.',
    );
  }
  const computedTtlInSeconds = Math.max(Math.floor((config.cacheReadTTL ?? 60000) / 1000), 60); // KV TTL must be at least 60 seconds

  return function KVCacheFactory(ctx: TServerContext) {
    return {
      async get(id: string) {
        const kvResponse = await ctx[config.KVName].get(buildOperationKey(id, config.keyPrefix), {
          type: 'text',
          cacheTtl: computedTtlInSeconds,
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
        ctx.waitUntil(set(id, data, entities, ttl, ctx[config.KVName], config.keyPrefix));
      },

      invalidate(entities: Iterable<CacheEntityRecord>) {
        // Do not block execution of the worker while invalidating the cache
        ctx.waitUntil(invalidate(entities, ctx[config.KVName], config.keyPrefix));
      },
    };
  };
}
