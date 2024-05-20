import { ExecutionResult } from 'graphql';
import type { ExecutionContext, KVNamespace } from '@cloudflare/workers-types';
import type { Cache } from '@envelop/response-cache';
import { buildOperationKey } from '../src/cache-key.js';
import { createKvCache, type KvCacheConfig } from '../src/index.js';

type Env = {
  ENVIRONMENT: 'testing' | 'development' | 'production';
  GRAPHQL_RESPONSE_CACHE: KVNamespace;
};

describe('@envelop/response-cache-cloudflare-kv integration tests', () => {
  let env: Env;
  let config: KvCacheConfig;
  let maxTtl: number;
  let executionContext: ExecutionContext;
  let cache: Cache;
  const dataValue: ExecutionResult<{ key: string }, { extensions: string }> = {
    errors: [],
    data: { key: 'value' },
    extensions: { extensions: 'value' },
  };
  const dataKey = '1B9502F92EFA53AFF0AC650794AA79891E4B6900';

  beforeEach(() => {
    // @ts-expect-error - Unable to get jest-environment-miniflare/globals working the test/build setup
    env = getMiniflareBindings<Env>();
    // @ts-expect-error - Unable to get jest-environment-miniflare/globals working the test/build setup
    executionContext = new ExecutionContext();
    config = {
      KV: env.GRAPHQL_RESPONSE_CACHE,
      waitUntil: executionContext.waitUntil,
      keyPrefix: 'vitest',
    };
    maxTtl = 60 * 1000; // 1 minute
    cache = createKvCache(config);
  });

  test('should work with a basic set() and get()', async () => {
    await cache.set(
      dataKey,
      dataValue,
      [{ typename: 'User' }, { typename: 'User', id: 1 }, { typename: 'User', id: 2 }],
      maxTtl,
    );
    // @ts-expect-error - Unable to get jest-environment-miniflare/globals working the test/build setup
    await getMiniflareWaitUntil(executionContext);

    const result = await cache.get(dataKey);
    expect(result).toEqual(dataValue);

    const operationKey = buildOperationKey(dataKey, config.keyPrefix);
    const operationValue = await env.GRAPHQL_RESPONSE_CACHE.get(operationKey, 'text');
    expect(operationValue).toBeTruthy();
    expect(JSON.parse(operationValue!)).toEqual(dataValue);
  });

  test('should return null when calling get() on a non-existent key', async () => {
    const result = await cache.get(dataKey);
    expect(result).toBeUndefined();
  });

  test('should return null when calling get() on an invalidated key', async () => {
    await cache.set(
      dataKey,
      dataValue,
      [{ typename: 'User' }, { typename: 'User', id: 1 }, { typename: 'User', id: 2 }],
      maxTtl,
    );
    // @ts-expect-error - Unable to get jest-environment-miniflare/globals working the test/build setup
    await getMiniflareWaitUntil(executionContext);

    await cache.invalidate([{ typename: 'User' }]);
    // @ts-expect-error - Unable to get jest-environment-miniflare/globals working the test/build setup
    await getMiniflareWaitUntil(executionContext);

    const result = await cache.get(dataKey);
    expect(result).toBeUndefined();

    const allKeys = await config.KV.list();
    expect(allKeys.keys.length).toEqual(0);
  });
});
