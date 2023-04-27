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

  async function buildEntityInvalidationsKeys(
    entity: string
  ): Promise<string[]> {
    // TODO: Figure this out
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
