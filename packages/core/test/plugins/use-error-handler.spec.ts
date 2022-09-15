import { useErrorHandler } from '../../src/plugins/use-error-handler.js';
import { assertStreamExecutionValue, collectAsyncIteratorValues, createTestkit } from '@envelop/testing';
import { Plugin } from '@envelop/types';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Repeater } from '@repeaterjs/repeater';
import { createGraphQLError } from '@graphql-tools/utils';
import { schema } from '../common.js';
import { useExtendContext } from '@envelop/core';

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
    await testInstance.perform({ query: `query { foo }` }, { foo: 'bar' });

    expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({ phase: 'execution' }));
  });

  it('should invoke error handler when error happens during parse', async () => {
    expect.assertions(2);
    const mockHandler = jest.fn();
    const testInstance = createTestkit([useErrorHandler(mockHandler)], schema);
    await testInstance.execute(`query { me `, {});
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'parse',
      })
    );
  });

  it('should invoke error handler on validation error', async () => {
    expect.assertions(2);
    const useMyFailingValidator: Plugin = {
      onValidate(payload) {
        payload.setValidationFn(() => {
          return [createGraphQLError('Failure!')];
        });
      },
    };
    const mockHandler = jest.fn();
    const testInstance = createTestkit([useMyFailingValidator, useErrorHandler(mockHandler)], schema);
    await testInstance.execute(`query { iDoNotExistsMyGuy }`, {});
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'validate',
      })
    );
  });

  it('should invoke error handle for context errors', async () => {
    expect.assertions(2);
    const mockHandler = jest.fn();
    const testInstance = createTestkit(
      [
        useExtendContext((): {} => {
          throw new Error('No context for you!');
        }),
        useErrorHandler(mockHandler),
      ],
      schema
    );

    try {
      await testInstance.execute(`query { me { name } }`);
    } catch {
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'context',
        })
      );
      expect(mockHandler).toHaveBeenCalledTimes(1);
    }
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
    const result = await testInstance.perform({ query: `subscription { foo }` }, { foo: 'bar' });
    assertStreamExecutionValue(result);
    await collectAsyncIteratorValues(result);

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.objectContaining([testError]),
        phase: 'execution',
      })
    );
  });
});
