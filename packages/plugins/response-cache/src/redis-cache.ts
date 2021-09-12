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

  function purgeEntity(entity: string) {
    // find the responseIds for the entity
    store.smembers(entity).then(function (responseIds) {
      // and purge each response since they contained the entity data
      store.del(responseIds);
    });

    // if purging an entity like Comment, then also purge Comment:1, Comment:2, etc
    store.keys(`${entity}:*`).then(function (entityKeys) {
      for (const entityKey of entityKeys) {
        // and purge any reponses in each of those entity keys
        store.smembers(entityKey).then(function (responseIds) {
          // and purge each response since they contained the entity data
          store.del(responseIds);
        });
      }

      // then purge the entityKeys like Comment:1, Comment:2 etc
      store.del(entityKeys);
    });

    // and then purge the entity itself
    store.del(entity);
  }

  return {
    set(responseId, result, collectedEntities, ttl) {
      if (ttl === Infinity) {
        store.set(responseId, JSON.stringify(result));
      } else {
        // set the ttl in milliseconds
        store.set(responseId, JSON.stringify(result), 'PX', ttl);
      }

      const responseKey = buildRedisResponseOpsKey(responseId);

      for (const { typename, id } of collectedEntities) {
        // Adds a key for the typename => response
        store.sadd(typename, responseId);
        // Adds a key for the operation => typename
        store.sadd(responseKey, typename);

        if (id) {
          const entityId = buildRedisEntityId(typename, id);
          // Adds a key for the typename:id => response
          store.sadd(entityId, responseId);
          // Adds a key for the operation => typename:id
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
