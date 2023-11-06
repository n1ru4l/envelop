import type { CacheEntityRecord } from '@envelop/response-cache';
import { buildEntityKey } from './cache-key.js';
import type { KvCacheConfig } from './index.js';

export async function invalidate(
  entities: Iterable<CacheEntityRecord>,
  config: KvCacheConfig,
): Promise<void> {
  const kvPromises: Promise<unknown>[] = []; // Collecting all the KV operations so we can await them all at once

  for (const entity of entities) {
    const entityKey = buildEntityKey(entity.typename, entity.id, config.keyPrefix);

    for await (const kvKey of _getAllKvKeysForPrefix(entityKey, config)) {
      if (kvKey.metadata?.operationKey) {
        kvPromises.push(config.KV.delete(kvKey.metadata?.operationKey));
        kvPromises.push(config.KV.delete(kvKey.name));
      }
    }
  }

  await Promise.allSettled(kvPromises);
}

export async function* _getAllKvKeysForPrefix(prefix: string, config: KvCacheConfig) {
  let keyListComplete = false;
  let cursor: string | undefined;

  do {
    const kvListResponse = await config.KV.list<{ operationKey: string }>({
      prefix,
      cursor,
    });
    keyListComplete = kvListResponse.list_complete;

    if (!kvListResponse.list_complete) {
      cursor = kvListResponse.cursor;
    }

    for (const keyResult of kvListResponse.keys) {
      yield keyResult;
    }
  } while (!keyListComplete);
}
