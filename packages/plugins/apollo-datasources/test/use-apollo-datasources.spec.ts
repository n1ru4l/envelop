// TODO: MAKE ME WORK
// @ts-nocheck
import 'reflect-metadata';
import { createTestkit, assertSingleExecutionValue } from '@envelop/testing';
import { InMemoryLRUCache } from 'apollo-server-caching';
import type { DataSourceConfig } from 'apollo-datasource';
import { useApolloDataSources } from '../src/index.js';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe.skip('useApolloDataSources', () => {
  it('should use InMemoryLRUCache by default', async () => {
    const initialize = jest.fn();

    const schema = makeExecutableSchema({
      typeDefs: `type Query { foo: String }`,
      resolvers: {
        Query: {
          foo: () => 'foo',
        },
      },
    });
    const testInstance = createTestkit(
      [
        useApolloDataSources({
          dataSources() {
            return {
              foo: {
                initialize,
              },
            };
          },
        }),
      ],
      schema
    );
    const result = await testInstance.execute(
      `query { foo }`,
      {},
      {
        initialContextValue: true,
      }
    );
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(initialize).toHaveBeenCalledTimes(1);

    const dataSourceConfig: DataSourceConfig<unknown> = initialize.mock.calls[0][0];

    expect(dataSourceConfig.cache).toBeInstanceOf(InMemoryLRUCache);
    expect(dataSourceConfig.context).toEqual(
      expect.objectContaining({
        initialContextValue: true,
      })
    );
  });

  it('should allow to use custom cache', async () => {
    const initialize = jest.fn();
    const cache = new InMemoryLRUCache();

    const schema = makeExecutableSchema({
      typeDefs: `type Query { foo: String }`,
      resolvers: {
        Query: {
          foo: () => 'foo',
        },
      },
    });
    const testInstance = createTestkit(
      [
        useApolloDataSources({
          cache,
          dataSources() {
            return {
              foo: {
                initialize,
              },
            };
          },
        }),
      ],
      schema
    );
    const result = await testInstance.execute(`query { foo }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(initialize).toHaveBeenCalledTimes(1);

    const dataSourceConfig: DataSourceConfig<unknown> = initialize.mock.calls[0][0];

    expect(dataSourceConfig.cache).toBe(cache);
  });
});
