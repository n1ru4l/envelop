import { assertSingleExecutionValue, createSpiedPlugin, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { execute } from 'graphql';
import { useGraphQlJit } from '../src';

describe('useGraphQlJit', () => {
  const schema = makeExecutableSchema({
    typeDefs: `type Query { test: String! }`,
    resolvers: {
      Query: {
        test: () => Promise.resolve('boop'),
      },
    },
  });

  it('Should override execute function', async () => {
    const onExecuteSpy = jest.fn();

    const testInstance = createTestkit(
      [
        useGraphQlJit(),
        {
          onExecute: onExecuteSpy,
        },
      ],
      schema
    );

    await testInstance.execute(`query { test }`);

    expect(onExecuteSpy).toHaveBeenCalledTimes(1);
    expect(onExecuteSpy.mock.calls[0][0].executeFn).not.toBe(execute);
    expect(onExecuteSpy.mock.calls[0][0].executeFn.name).toBe('jitExecutor');
  });

  it('Should execute correctly', async () => {
    const testInstance = createTestkit([useGraphQlJit()], schema);
    const result = await testInstance.execute(`query { test }`);
    assertSingleExecutionValue(result);
    expect(result.data?.test).toBe('boop');
  });
});
