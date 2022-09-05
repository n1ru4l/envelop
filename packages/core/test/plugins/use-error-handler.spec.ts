import { useErrorHandler } from '../../src/plugins/use-error-handler.js';
import { assertStreamExecutionValue, collectAsyncIteratorValues, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Repeater } from '@repeaterjs/repeater';

describe('useErrorHandler', () => {
  it('should invoke error handler when error happens during execution', async () => {
    const testError = new Error('Foobar');

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => {
            throw testError;
          },
        },
      },
    });

    const mockHandler = jest.fn();
    const testInstance = createTestkit([useErrorHandler(mockHandler)], schema);
    await testInstance.execute(`query { foo }`, {}, { foo: 'bar' });

    expect(mockHandler).toHaveBeenCalledWith(
      [testError],
      expect.objectContaining({
        contextValue: expect.objectContaining({
          foo: 'bar',
        }),
      })
    );
  });

  it.only('should invoke error handler when error happens during parse', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => {
            return 'foo';
          },
        },
      },
    });

    const mockHandler = jest.fn();
    const testInstance = createTestkit([useErrorHandler(mockHandler)], schema);
    await testInstance.execute(`query { foo `, {});
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should invoke error handler when error happens during subscription resolver call', async () => {
    const testError = new Error('Foobar');

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          _: String
        }
        type Subscription {
          foo: String
        }
      `,
      resolvers: {
        Subscription: {
          foo: {
            subscribe: () =>
              new Repeater(async (push, end) => {
                await push(1);
                end();
              }),
            resolve: () => {
              throw new Error('Foobar');
            },
          },
        },
      },
    });

    const mockHandler = jest.fn();
    const testInstance = createTestkit([useErrorHandler(mockHandler)], schema);
    const result = await testInstance.execute(`subscription { foo }`, {}, { foo: 'bar' });
    assertStreamExecutionValue(result);
    await collectAsyncIteratorValues(result);

    expect(mockHandler).toHaveBeenCalledWith(
      [testError],
      expect.objectContaining({
        contextValue: expect.objectContaining({
          foo: 'bar',
        }),
      })
    );
  });
});
