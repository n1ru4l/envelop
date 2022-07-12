import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { execute } from 'graphql';
import { useGraphQLExecutor } from '../src';

describe('useGraphQLExecutor', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        test: String!
      }
    `,
    resolvers: {
      Query: {
        test: async () => 'boop',
      },
    },
  });

  it('Should override execute function', async () => {
    const onExecuteSpy = jest.fn();

    const testInstance = createTestkit(
      [
        useGraphQLExecutor(),
        {
          onExecute: onExecuteSpy,
        },
      ],
      schema
    );

    await testInstance.execute(`query { test }`);

    expect(onExecuteSpy).toHaveBeenCalledTimes(1);
    expect(onExecuteSpy.mock.calls[0][0].executeFn).not.toBe(execute);
    expect(onExecuteSpy.mock.calls[0][0].executeFn.name).toBe('executorExecute');
  });

  it('Should execute correctly', async () => {
    const testInstance = createTestkit([useGraphQLExecutor()], schema);
    const result = await testInstance.execute(`query { test }`);
    assertSingleExecutionValue(result);
    expect(result.data?.test).toBe('boop');
  });
});
