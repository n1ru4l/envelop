import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';
import type { Cache } from './cache';

export type BuildRedisEntityId = (typename: string, id: number | string) => string;
export type BuildRedisResponseOpsKey = (responseId: string) => string;

export type RedisCache = Cache & {
  store(): Redis.Redis;
};

export type RedisCacheParameter = {
  /**
   * Creates a Redis instance
   * @see RedisOptions https://github.com/luin/ioredis/blob/master/lib/redis/index.ts
   */
  redisOptions?: RedisOptions;
  /**
   * Maximum amount of items in the cache. Defaults to `Infinity`.
   */
  max?: number;
  /**
   * Customize how the cache entity id is built.
   * By default the typename is concatenated with the id e.g. `User:1`
   */
  buildRedisEntityId?: BuildRedisEntityId;
  /**
   * Customize how the cache key that stores the operations associated with the response is built.
   * By default `operations` is concatenated with the responseId e.g. `operations:arZm3tCKgGmpu+a5slrpSH9vjSQ=`
   */
  buildRedisResponseOpsKey?: BuildRedisResponseOpsKey;
};

export const createRedisCache = (params?: RedisCacheParameter): RedisCache => {
  const store = new Redis(params?.redisOptions);

  const buildRedisEntityId = params?.buildRedisEntityId ?? defaultBuildRedisEntityId;
  const buildRedisResponseOpsKey = params?.buildRedisResponseOpsKey ?? defaultBuildRedisResponseOpsKey;

  function purgeResponse(responseId: string, shouldRemove = true) {
    if (shouldRemove) {
      // remove the response from the cache
      store.del(responseId);
    }
  }

  function purgeEntity(entity: string) {
    let responseIds: string[] = [];

    store.smembers(entity).then(function (result) {
      responseIds = result;

      if (responseIds !== undefined) {
        for (const responseId of responseIds) {
          const responseKey = buildRedisResponseOpsKey(responseId);
          store.srem(responseKey, entity);

          purgeResponse(responseId);
        }
      }
    });

    store.keys(`${entity}:*`).then(function (result) {
      store.del(result);
    });

    store.del(entity);
  }

  return {
    set(responseId, result, collectedEntities, ttl) {
      if (ttl === Infinity) {
        store.set(responseId, JSON.stringify(result));
      } else {
        store.set(responseId, JSON.stringify(result), 'PX', ttl);
      }

      const responseKey = buildRedisResponseOpsKey(responseId);

      for (const { typename, id } of collectedEntities) {
        // typename => response
        store.sadd(typename, responseId);
        // operation => typename
        store.sadd(responseKey, typename);

        if (id) {
          const entityId = buildRedisEntityId(typename, id);
          // typename:id => response
          store.sadd(entityId, responseId);
          // operation => typename:id
          store.sadd(responseKey, entityId);
        }
      }
    },
    get(responseId) {
      return (
        store.get(responseId).then(function (result) {
          return result && JSON.parse(result);
        }) ?? null
      );
    },
    invalidate(entitiesToRemove) {
      for (const { typename, id } of entitiesToRemove) {
        purgeEntity(id != null ? buildRedisEntityId(typename, id) : typename);
      }
    },
    store() {
      return store;
    },
  };
};

export const defaultBuildRedisEntityId: BuildRedisEntityId = (typename, id) => `${typename}:${id}`;
export const defaultBuildRedisResponseOpsKey: BuildRedisResponseOpsKey = responseId => `operations:${responseId}`;
