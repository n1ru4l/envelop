import Redis, { RedisOptions } from 'ioredis';
import type { Cache } from './cache';

export type BuildRedisEntityId = (typename: string, id: number | string) => string;

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
};

export const createRedisCache = (params?: RedisCacheParameter): Cache => {
  const buildRedisEntityId = params?.buildRedisEntityId ?? defaultBuildRedisEntityId;
  const cachedResponses = new Redis(params?.redisOptions);

  const entityToResponseIds = new Map<string, Set<string>>();
  const responseIdToEntityIds = new Map<string, Set<string>>();

  async function purgeResponse(responseId: string, shouldRemove = true) {
    const entityIds = await responseIdToEntityIds.get(responseId);

    // get entities related to the response
    if (entityIds !== undefined) {
      for (const entityId of entityIds) {
        // remove the response mapping from the entity
        entityToResponseIds.get(entityId)?.delete(responseId);
      }
      // remove all the entity mappings from the response
      responseIdToEntityIds.delete(responseId);
    }

    if (shouldRemove) {
      // remove the response from the cache
      cachedResponses.del(responseId);
    }
  }

  async function purgeEntity(entity: string) {
    const responseIds = entityToResponseIds.get(entity);

    if (responseIds !== undefined) {
      for (const responseId of responseIds) {
        await purgeResponse(responseId);
      }
    }
  }

  return {
    async set(responseId, result, collectedEntities, ttl) {
      await cachedResponses.set(responseId, JSON.stringify(result), 'EX', ttl);

      const entityIds = new Set<string>();
      responseIdToEntityIds.set(responseId, entityIds);

      for (const { typename, id } of collectedEntities) {
        let operationIds = entityToResponseIds.get(typename);
        if (operationIds == null) {
          operationIds = new Set<string>();
          entityToResponseIds.set(typename, operationIds);
        }

        // typename => operation
        operationIds.add(responseId);
        // operation => typename
        entityIds.add(typename);

        if (id !== undefined) {
          const entityId = buildRedisEntityId(typename, id);
          let responseIds = entityToResponseIds.get(entityId);
          if (responseIds == null) {
            responseIds = new Set();
            entityToResponseIds.set(entityId, responseIds);
          }

          // typename:id => operation
          responseIds.add(responseId);
          // operation => typename:id
          entityIds.add(entityId);
        }
      }
    },
    async get(responseId) {
      const result = (await cachedResponses.get(responseId)) ?? null;

      return result && JSON.parse(result);
    },
    async invalidate(entitiesToRemove) {
      for (const { typename, id } of entitiesToRemove) {
        await purgeEntity(id != null ? buildRedisEntityId(typename, id) : typename);
      }
    },
  };
};

export const defaultBuildRedisEntityId: BuildRedisEntityId = (typename, id) => `${typename}:${id}`;
