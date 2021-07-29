import LRU from 'lru-cache';
import type { Cache } from './cache';

export type InMemoryCacheParameter = {
  /**
   * Maximum amount of items in the cache. Defaults to `Infinity`.
   */
  max?: number;
};

export const createInMemoryCache = (params?: InMemoryCacheParameter): Cache => {
  const cachedResponses = new LRU<string, any>({
    max: params?.max,
    stale: false,
    noDisposeOnSet: true,
    dispose(responseId) {
      purgeResponse(responseId, false);
    },
  });

  const entityToResponse = new Map<string, Set<string>>();
  const responseToEntity = new Map<string, Set<string>>();

  function purgeResponse(responseId: string, shouldRemove = true) {
    // get entities related to the response
    if (responseToEntity.has(responseId)) {
      responseToEntity.get(responseId)!.forEach(entityId => {
        // remove the response mapping from the entity
        entityToResponse.get(entityId)?.delete(responseId);
      });
      // remove all the entity mappings from the response
      responseToEntity.delete(responseId);
    }

    if (shouldRemove) {
      // remove the response from the cache
      cachedResponses.del(responseId);
    }
  }

  function purgeEntity(entity: string) {
    if (entityToResponse.has(entity)) {
      const responsesToRemove = entityToResponse.get(entity);

      if (responsesToRemove) {
        responsesToRemove.forEach(responseId => {
          purgeResponse(responseId);
        });
      }
    }
  }

  return {
    set(operationId, result, collectedEntities, ttl) {
      cachedResponses.set(operationId, result, ttl);
      responseToEntity.set(operationId, new Set());

      responseToEntity.set(operationId, new Set());

      for (const [typename, id] of collectedEntities) {
        if (!entityToResponse.has(typename)) {
          entityToResponse.set(typename, new Set());
        }

        // typename => operation
        entityToResponse.get(typename)!.add(operationId);
        // operation => typename
        responseToEntity.get(operationId)!.add(typename);

        if (id != null) {
          const entityId = makeId(typename, id);
          if (!entityToResponse.has(entityId)) {
            entityToResponse.set(entityId, new Set());
          }

          // typename:id => operation
          entityToResponse.get(entityId)!.add(operationId);
          // operation => typename:id
          responseToEntity.get(operationId)!.add(entityId);
        }
      }
    },
    get(operationId) {
      return cachedResponses.get(operationId) ?? null;
    },
    invalidate(entitiesToRemove) {
      for (const { typename, id } of entitiesToRemove) {
        purgeEntity(id != null ? makeId(typename, id) : typename);
      }
    },
  };
};

function makeId(typename: string, id: number | string): string {
  return `${typename}:${id}`;
}
