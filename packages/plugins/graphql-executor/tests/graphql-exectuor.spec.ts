import {
  assertSingleExecutionValue,
  assertStreamExecutionValue,
  collectAsyncIteratorValues,
  createTestkit,
} from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { execute, ExecutionArgs, subscribe, SubscriptionArgs } from 'graphql';
import { Executor } from 'graphql-executor';
import { useGraphQLExecutor } from '../src';

describe('useGraphQLExecutor', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        test: String!
      }
      type Subscription {
        count: Int!
      }
    `,
    resolvers: {
      Query: {
        test: async () => 'boop',
      },
      Subscription: {
        count: {
          async *subscribe() {
            for (let i = 0; i < 10; i++) {
              yield { count: i };
            }
          },
        },
      },
    },
  });

  it('Should override execute function', async () => {
    const onExecuteSpy = jest.fn();

    const testInstance = createTestkit(
      [
        useGraphQLExecutor({}),
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

  it('Should override subscribe function', async () => {
    const onSubscribeSpy = jest.fn();

    const testInstance = createTestkit(
      [
        useGraphQLExecutor({}),
        {
          onSubscribe: onSubscribeSpy,
        },
      ],
      schema
    );

    await testInstance.execute(`subscription { count }`);

    expect(onSubscribeSpy).toHaveBeenCalledTimes(1);
    expect(onSubscribeSpy.mock.calls[0][0].subscribeFn).not.toBe(subscribe);
    expect(onSubscribeSpy.mock.calls[0][0].subscribeFn.name).toBe('executorSubscriber');
  });

  it('Should override executor function', async () => {
    const realExecutor = jest.fn();
    class MyExecutor extends Executor {
      executeQueryOrMutation() {
        return realExecutor();
      }
    }

    const testInstance = createTestkit([useGraphQLExecutor({ customExecutor: new MyExecutor() })], schema);
    await testInstance.execute(`query { test }`);
    expect(realExecutor).toHaveBeenCalledTimes(1);
  });

  it('Should override subscribe function', async () => {
    const realSubscription = jest.fn();
    class MyExecutor extends Executor {
      executeSubscription() {
        return realSubscription();
      }
    }

    const testInstance = createTestkit([useGraphQLExecutor({ customExecutor: new MyExecutor() })], schema);
    await testInstance.execute(`subscription { count }`);
    expect(realSubscription).toHaveBeenCalledTimes(1);
  });

  it('Should execute correctly', async () => {
    const testInstance = createTestkit([useGraphQLExecutor({})], schema);
    const result = await testInstance.execute(`query { test }`);
    assertSingleExecutionValue(result);
    expect(result.data?.test).toBe('boop');
  });

  it('Should subscribe correctly', async () => {
    const testInstance = createTestkit([useGraphQLExecutor({})], schema);
    const result = await testInstance.execute(`subscription { count }`);
    assertStreamExecutionValue(result);
    const values = await collectAsyncIteratorValues(result);
    for (let i = 0; i < 10; i++) {
      expect(values[i].data?.count).toBe(i);
    }
  });
});
