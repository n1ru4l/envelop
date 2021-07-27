import 'reflect-metadata';
import { createTestkit, assertSingleExecutionValue } from '@envelop/testing';
import { useApolloTracing } from '../src';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('useApolloTracing', () => {
  const schema = makeExecutableSchema({
    typeDefs: `type Query { foo: String }`,
    resolvers: {
      Query: {
        foo: () => new Promise(resolve => setTimeout(() => resolve('boop'), 1000)),
      },
    },
  });

  it('should measure execution times and return it as extension', async () => {
    const testInstance = createTestkit([useApolloTracing()], schema);
    const result = await testInstance.execute(`query { foo }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.extensions?.tracing).toBeDefined();
    expect(result.extensions?.tracing.duration).toBeGreaterThan(1000000000);
    expect(result.extensions?.tracing.execution.resolvers[0].duration).toBeGreaterThan(990000000);
    expect(result.extensions?.tracing.execution.resolvers[0].path).toEqual(['foo']);
    expect(result.extensions?.tracing.execution.resolvers[0].parentType).toBe('Query');
    expect(result.extensions?.tracing.execution.resolvers[0].fieldName).toBe('foo');
    expect(result.extensions?.tracing.execution.resolvers[0].returnType).toBe('String');
  });
});
