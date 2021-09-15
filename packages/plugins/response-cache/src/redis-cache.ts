import Redis from 'ioredis';
import type { Cache } from './cache';

export type BuildRedisEntityId = (typename: string, id: number | string) => string;
export type BuildRedisResponseOpsKey = (responseId: string) => string;

export type RedisCacheParameter = {
  /**
   * Redis instance
   * @see Redis.Redis https://github.com/luin/ioredis
   */
  redis: Redis.Redis;
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

export const createRedisCache = (params: RedisCacheParameter): Cache => {
  const store = params.redis;

  const buildRedisEntityId = params?.buildRedisEntityId ?? defaultBuildRedisEntityId;
  const buildRedisResponseOpsKey = params?.buildRedisResponseOpsKey ?? defaultBuildRedisResponseOpsKey;

  function purgeEntity(entity: string): Promise<string[]> {
    return new Promise(function (resolve, reject) {
      const keysToPurge: string[] = [entity];

      // find the responseIds for the entity
      store.smembers(entity).then(function (responseIds) {
        // and purge each response since they contained the entity data
        responseIds.forEach(responseId => {
          keysToPurge.push(responseId);
          keysToPurge.push(buildRedisResponseOpsKey(responseId));
        });

        // if purging an entity like Comment, then also purge Comment:1, Comment:2, etc
        if (!entity.includes(':')) {
          store.keys(`${entity}:*`).then(function (entityKeys) {
            for (const entityKey of entityKeys) {
              // and purge any reponses in each of those entity keys
              store.smembers(entityKey).then(function (responseIds) {
                // if purging an entity check for associated operations containing that entity
                // and purge each response since they contained the entity data
                responseIds.forEach(responseId => {
                  keysToPurge.push(responseId);
                  keysToPurge.push(buildRedisResponseOpsKey(responseId));
                });
              });
            }

            // then purge the entityKeys like Comment:1, Comment:2 etc
            entityKeys.forEach(entityKey => {
              keysToPurge.push(entityKey);
            });
          });
        }

        // and then purge the entity itself
        resolve(keysToPurge);
      });
    });
  }

  return {
    set(responseId, result, collectedEntities, ttl) {
      const pipeline = store.pipeline();

      if (ttl === Infinity) {
        pipeline.set(responseId, JSON.stringify(result));
      } else {
        // set the ttl in milliseconds
        pipeline.set(responseId, JSON.stringify(result), 'PX', ttl);
      }

      const responseKey = buildRedisResponseOpsKey(responseId);

      for (const { typename, id } of collectedEntities) {
        // Adds a key for the typename => response
        pipeline.sadd(typename, responseId);
        // Adds a key for the operation => typename
        pipeline.sadd(responseKey, typename);

        if (id) {
          const entityId = buildRedisEntityId(typename, id);
          // Adds a key for the typename:id => response
          pipeline.sadd(entityId, responseId);
          // Adds a key for the operation => typename:id
          pipeline.sadd(responseKey, entityId);
        }
      }

      pipeline.exec();
    },
    get(responseId) {
      return (
        store.get(responseId).then(function (result) {
          return result && JSON.parse(result);
        }) ?? null
      );
    },
    invalidate(entitiesToRemove) {
      const keys$: Promise<string[]>[] = [];

      for (const { typename, id } of entitiesToRemove) {
        keys$.push(purgeEntity(id != null ? buildRedisEntityId(typename, id) : typename));
      }

      return Promise.all(keys$).then(keys => {
        store.del(keys.flat());
      });
    },
  };
};

export const defaultBuildRedisEntityId: BuildRedisEntityId = (typename, id) => `${typename}:${id}`;
export const defaultBuildRedisResponseOpsKey: BuildRedisResponseOpsKey = responseId => `operations:${responseId}`;
