import { useErrorHandler } from '../../src/plugins/use-error-handler';
import { createTestkit } from '@envelop/testing';
import { buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('useErrorHandler', () => {
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

  it('should invoke error handler when error happens during execution', async () => {
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
});
