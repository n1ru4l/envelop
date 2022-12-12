import { Redis } from '@upstash/redis';
import type { Cache } from '@envelop/response-cache';
import 'isomorphic-fetch';

export type BuildRedisEntityId = (typename: string, id: number | string) => string;
export type BuildRedisOperationResultCacheKey = (responseId: string) => string;

export type RedisCacheParameter = {
  /**
   * Redis instance
   * @see Redis https://github.com/upstash/upstash-redis
   */
  redis: Redis;
  /**
   * Customize how the cache entity id is built.
   * By default the typename is concatenated with the id e.g. `User:1`
   */
  buildRedisEntityId?: BuildRedisEntityId;
  /**
   * Customize how the cache key that stores the operations associated with the response is built.
   * By default `operations` is concatenated with the responseId e.g. `operations:arZm3tCKgGmpu+a5slrpSH9vjSQ=`
   */
  buildRedisOperationResultCacheKey?: BuildRedisOperationResultCacheKey;
};

export const createUpstashCache = (params: RedisCacheParameter): Cache => {
  const store = params.redis;

  const buildRedisEntityId = params?.buildRedisEntityId ?? defaultBuildRedisEntityId;
  const buildRedisOperationResultCacheKey =
    params?.buildRedisOperationResultCacheKey ?? defaultBuildRedisOperationResultCacheKey;

  async function buildEntityInvalidationsKeys(entity: string): Promise<string[]> {
    const keysToInvalidate: string[] = [entity];

    // find the responseIds for the entity
    const responseIds = await store.smembers(entity);
    // and add each response to be invalidated since they contained the entity data
    responseIds.forEach(responseId => {
      keysToInvalidate.push(responseId);
      keysToInvalidate.push(buildRedisOperationResultCacheKey(responseId));
    });

    // if invalidating an entity like Comment, then also invalidate Comment:1, Comment:2, etc
    if (!entity.includes(':')) {
      const entityKeys = await store.keys(`${entity}:*`);
      for (const entityKey of entityKeys) {
        // and invalidate any responses in each of those entity keys
        const entityResponseIds = await store.smembers(entityKey);
        // if invalidating an entity check for associated operations containing that entity
        // and invalidate each response since they contained the entity data
        entityResponseIds.forEach(responseId => {
          keysToInvalidate.push(responseId);
          keysToInvalidate.push(buildRedisOperationResultCacheKey(responseId));
        });

        // then the entityKeys like Comment:1, Comment:2 etc to be invalidated
        keysToInvalidate.push(entityKey);
      }
    }

    return keysToInvalidate;
  }

  return {
    async set(responseId, result, collectedEntities, ttl) {
      const tx = store.multi();

      if (ttl === Infinity) {
        tx.set(responseId, result);
      } else {
        // set the ttl in milliseconds
        tx.set(responseId, result, { px: ttl });
      }

      const responseKey = buildRedisOperationResultCacheKey(responseId);

      for (const { typename, id } of collectedEntities) {
        // Adds a key for the typename => response
        tx.sadd(typename, responseId);
        // Adds a key for the operation => typename
        tx.sadd(responseKey, typename);

        if (id) {
          const entityId = buildRedisEntityId(typename, id);
          // Adds a key for the typename:id => response
          tx.sadd(entityId, responseId);
          // Adds a key for the operation => typename:id
          tx.sadd(responseKey, entityId);
        }
      }

      await tx.exec();
    },
    async get(responseId) {
      return store.get(responseId);
    },
    async invalidate(entitiesToRemove) {
      const invalidationKeys: string[][] = [];

      for (const { typename, id } of entitiesToRemove) {
        invalidationKeys.push(
          await buildEntityInvalidationsKeys(id != null ? buildRedisEntityId(typename, id) : typename)
        );
      }

      const keys = invalidationKeys.flat();
      if (keys.length > 0) {
        await store.del(...keys);
      }
    },
  };
};

export const defaultBuildRedisEntityId: BuildRedisEntityId = (typename, id) => `${typename}:${id}`;
export const defaultBuildRedisOperationResultCacheKey: BuildRedisOperationResultCacheKey = responseId =>
  `operations:${responseId}`;
