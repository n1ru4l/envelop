import { buildSchema, validate } from 'graphql';
import { createTestkit } from '@guildql/testing';
import { useExtendContext } from '../src';
import { PluginFn } from '@guildql/types';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('useExtendContext', () => {
  const testSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        foo1: String
        foo2: String
      }
    `,
    resolvers: {
      Query: {
        foo1: (root, args, context) => context.foo1,
        foo2: (root, args, context) => context.foo2,
      },
    },
  });

  it('Should extend context correctly ', async () => {
    const testInstance = await createTestkit(testSchema, [useExtendContext(() => ({ foo1: 'test' }))]);
    const result = await testInstance.execute(`query t { foo1 }`);
    expect(result.data.foo1).toBe('test');
  });

  it('Should extend context correctly with multiple extensions', async () => {
    const testInstance = await createTestkit(testSchema, [useExtendContext(() => ({ foo1: 'test' })), useExtendContext(() => ({ foo2: 'test2' }))]);
    const result = await testInstance.execute(`query t { foo1 foo2 }`);
    expect(result.data.foo1).toBe('test');
    expect(result.data.foo2).toBe('test2');
  });

  it('Should extend context correctly with multiple extensions and async', async () => {
    const testInstance = await createTestkit(testSchema, [
      useExtendContext(() => new Promise(resolve => setTimeout(() => resolve({ foo1: 'test' }), 1000))),
      useExtendContext(() => new Promise(resolve => setTimeout(() => resolve({ foo2: 'test2' }), 500))),
    ]);
    const result = await testInstance.execute(`query t { foo1 foo2 }`);
    expect(result.data.foo1).toBe('test');
    expect(result.data.foo2).toBe('test2');
  });
});
