import {KVNamespace} from '@cloudflare/workers-types'
import { Cache } from "@envelop/response-cache";

export type BuildKVEntityId = (typename: string, id: number | string) => string;
export type BuildKVOperationResultCacheKey = (responseId: string) => string;

export const defaultBuildKVEntityId: BuildKVEntityId = (typename, id) =>
  `${typename}:${id}`;

export const defaultBuildKVOperationResultCacheKey: BuildKVOperationResultCacheKey =
  (responseId) => `operations:${responseId}`;

export type KVCacheParameter = {
  /**
   * KV namespace
   */
  namespace: KVNamespace;
  /**
   * Customize how the cache entity id is built.
   * By default the typename is concatenated with the id e.g. `User:1`
   */
  buildKVEntityId?: BuildKVEntityId;
  /**
   * Customize how the cache key that stores the operations associated with the response is built.
   * By default `operations` is concatenated with the responseId e.g. `operations:arZm3tCKgGmpu+a5slrpSH9vjSQ=`
   */
  buildKVOperationResultCacheKey?: BuildKVOperationResultCacheKey;
};

export const createCloudflareKVCache = (params: KVCacheParameter): Cache => {
  const store = params.namespace;

  // const buildKVEntityId = params?.buildKVEntityId ?? defaultBuildKVEntityId;
  const buildKVOperationResultCacheKey =
    params?.buildKVOperationResultCacheKey ??
    defaultBuildKVOperationResultCacheKey;

  async function buildEntityInvalidationsKeys(entity: string): Promise<string[]> {
    const keysToInvalidate: string[] = [entity];

    // Find the responseIds for the entity
    // This won't work but we should update how
    // Entities are stored so we can use list with a prefix
    const responseIds = await store.get(entity, "json");

    // Update this to reflect the changes above
    if (responseIds) {
      // Add each response to be invalidated since they contained the entity data
      responseIds.forEach(responseId => {
        keysToInvalidate.push(responseId);
        keysToInvalidate.push(`operations:${responseId}`);
      });
    }

    if (!entity.includes(':')) {
      const entityKeys = await store.list({ prefix: `${entity}:` });

      for (const entityKey of entityKeys.keys) {
        // This will need changing to work with KV (specific prefixed list call)
        const entityResponseIds = await store.get(entityKey.name, "json");

        if (entityResponseIds) {
          // If invalidating an entity, check for associated operations containing that entity
          // and invalidate each response since they contained the entity data
          entityResponseIds.forEach(responseId => {
            keysToInvalidate.push(responseId);
            keysToInvalidate.push(`operations:${responseId}`);
          });
        }

        keysToInvalidate.push(entityKey.name);
      }
    }

    return keysToInvalidate;
  }

  return {
    async set(responseId, result, collectedEntities, ttl) {
      await store.put(responseId, JSON.stringify(result), {
        expirationTtl: ttl === Infinity ? undefined : ttl / 1000,
      });

      const responseKey = buildKVOperationResultCacheKey(responseId);

      for (const { typename, id } of collectedEntities) {
        await store.put(typename, responseId);
        await store.put(responseKey, typename);

        if (id) {
          const entityId = `${typename}:${id}`;
          await store.put(entityId, responseId);
          await store.put(responseKey, entityId);
        }
      }
    },
    async get(responseId) {
      return await store.get(responseId, "json");
    },
    async invalidate(entitiesToRemove) {
      const invalidationKeys: string[][] = [];

      for (const { typename, id } of entitiesToRemove) {
        invalidationKeys.push(
          await buildEntityInvalidationsKeys(
            id != null ? `${typename}:${id}` : typename
          )
        );
      }

      const keys = invalidationKeys.flat();

      if (keys.length > 0) {
        for (const key of keys) {
          await store.delete(key);
        }
      }
    },
  };
};
