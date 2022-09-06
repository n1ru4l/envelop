import { makeExecutableSchema } from '@graphql-tools/schema';
import {
  assertSingleExecutionValue,
  assertStreamExecutionValue,
  collectAsyncIteratorValues,
  createTestkit,
} from '@envelop/testing';
import { useMaskedErrors, DEFAULT_ERROR_MESSAGE, MaskErrorFn } from '../../src/plugins/use-masked-errors.js';
import { useExtendContext } from '@envelop/core';
import { useAuth0 } from '../../../plugins/auth0/src/index.js';
import { GraphQLError } from 'graphql';

describe('useMaskedErrors', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        secret: String!
        secretEnvelop: String!
        secretWithExtensions: String!
      }
      type Subscription {
        instantError: String
        streamError: String
        streamResolveError: String
        instantGraphQLError: String
        streamGraphQLError: String
        streamResolveGraphQLError: String
      }
    `,
    resolvers: {
      Query: {
        secret: () => {
          throw new Error('Secret sauce that should not leak.');
        },
        secretEnvelop: () => {
          throw new GraphQLError('This message goes to all the clients out there!', { extensions: { foo: 1 } });
        },
        secretWithExtensions: () => {
          throw new GraphQLError('This message goes to all the clients out there!', {
            extensions: {
              code: 'Foo',
              message: 'Bar',
            },
          });
        },
      },
      Subscription: {
        instantError: {
          subscribe: async function () {
            throw new Error('Noop');
          },
          resolve: _ => _,
        },
        streamError: {
          subscribe: async function* () {
            throw new Error('Noop');
          },
          resolve: _ => _,
        },
        streamResolveError: {
          subscribe: async function* () {
            yield '1';
          },
          resolve: _ => {
            throw new Error('Noop');
          },
        },
        instantGraphQLError: {
          subscribe: async function () {
            throw new GraphQLError('Noop');
          },
          resolve: _ => _,
        },
        streamGraphQLError: {
          subscribe: async function* () {
            throw new GraphQLError('Noop');
          },
          resolve: _ => _,
        },
        streamResolveGraphQLError: {
          subscribe: async function* () {
            yield '1';
          },
          resolve: _ => {
            throw new GraphQLError('Noop');
          },
        },
      },
    },
  });

  it('Should mask non GraphQLErrors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { secret }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors!;
    expect(error.message).toEqual(DEFAULT_ERROR_MESSAGE);
  });

  it('Should not mask expected errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { secretEnvelop }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors!;
    expect(error.message).toEqual('This message goes to all the clients out there!');
    expect(error.extensions).toEqual({ foo: 1 });
  });

  it('Should not mask GraphQL operation syntax errors (of course it does not since we are only hooking in after execute, but just to be sure)', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { idonotexist }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors!;
    expect(error.message).toEqual('Cannot query field "idonotexist" on type "Query".');
  });

  it('Should forward extensions from GraphQLError to final GraphQLError in errors array', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { secretWithExtensions }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors!;
    expect(error.extensions).toEqual({
      code: 'Foo',
      message: 'Bar',
    });
  });

  it('Should properly mask context creation errors with a custom error message', async () => {
    expect.assertions(1);
    const testInstance = createTestkit(
      [
        useExtendContext((): {} => {
          throw new Error('No context for you!');
        }),
        useMaskedErrors({ errorMessage: 'My Custom Error Message.' }),
      ],
      schema
    );
    try {
      await testInstance.execute(`query { secretWithExtensions }`);
    } catch (err) {
      expect(err).toMatchInlineSnapshot(`[GraphQLError: My Custom Error Message.]`);
    }
  });
  it('Should properly mask context creation errors', async () => {
    expect.assertions(1);
    const testInstance = createTestkit(
      [
        useExtendContext((): {} => {
          throw new Error('No context for you!');
        }),
        useMaskedErrors(),
      ],
      schema
    );
    try {
      await testInstance.execute(`query { secretWithExtensions }`);
    } catch (err: any) {
      expect(err.message).toEqual(DEFAULT_ERROR_MESSAGE);
    }
  });

  it('Should not mask expected context creation errors', async () => {
    expect.assertions(2);
    const testInstance = createTestkit(
      [
        useExtendContext((): {} => {
          throw new GraphQLError('No context for you!', { extensions: { foo: 1 } });
        }),
        useMaskedErrors(),
      ],
      schema
    );
    try {
      await testInstance.execute(`query { secretWithExtensions }`);
    } catch (err) {
      if (err instanceof GraphQLError) {
        expect(err.message).toEqual(`No context for you!`);
        expect(err.extensions).toEqual({ foo: 1 });
      } else {
        throw err;
      }
    }
  });

  it('Should mask subscribe (sync/promise) subscription errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`subscription { instantError }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors!;
    expect(error.message).toEqual(DEFAULT_ERROR_MESSAGE);
  });

  it('Should mask subscribe (sync/promise) subscription errors with a custom error message', async () => {
    const testInstance = createTestkit(
      [useMaskedErrors({ errorMessage: 'My Custom subscription error message.' })],
      schema
    );
    const result = await testInstance.execute(`subscription { instantError }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toMatchInlineSnapshot(`
      Array [
        [GraphQLError: My Custom subscription error message.],
      ]
    `);
  });

  it('Should not mask subscribe (sync/promise) subscription GraphQL errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`subscription { instantGraphQLError }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toMatchInlineSnapshot(`
      Array [
        [GraphQLError: Noop],
      ]
    `);
  });

  it('Should mask subscribe (AsyncIterable) subscription errors', async () => {
    expect.assertions(1);
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const resultStream = await testInstance.execute(`subscription { streamError }`);
    assertStreamExecutionValue(resultStream);
    try {
      await collectAsyncIteratorValues(resultStream);
    } catch (err: any) {
      expect(err.message).toEqual(DEFAULT_ERROR_MESSAGE);
    }
  });

  it('Should mask subscribe (AsyncIterable) subscription errors with a custom error message', async () => {
    expect.assertions(1);
    const testInstance = createTestkit(
      [useMaskedErrors({ errorMessage: 'My AsyncIterable Custom Error Message.' })],
      schema
    );
    const resultStream = await testInstance.execute(`subscription { streamError }`);
    assertStreamExecutionValue(resultStream);
    try {
      await collectAsyncIteratorValues(resultStream);
    } catch (err) {
      expect(err).toMatchInlineSnapshot(`[GraphQLError: My AsyncIterable Custom Error Message.]`);
    }
  });

  it('Should not mask subscribe (AsyncIterable) subscription envelop errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const resultStream = await testInstance.execute(`subscription { streamGraphQLError }`);
    assertStreamExecutionValue(resultStream);
    try {
      await collectAsyncIteratorValues(resultStream);
    } catch (err) {
      expect(err).toMatchInlineSnapshot(`[GraphQLError: Noop]`);
    }
  });

  it('Should mask resolve subscription errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const resultStream = await testInstance.execute(`subscription { streamResolveError }`);
    assertStreamExecutionValue(resultStream);
    const allResults = await collectAsyncIteratorValues(resultStream);
    expect(allResults).toHaveLength(1);
    const [result] = allResults;
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors!;
    expect(error.message).toEqual(DEFAULT_ERROR_MESSAGE);
  });

  it('Should mask resolve subscription errors with a custom error message', async () => {
    const testInstance = createTestkit(
      [useMaskedErrors({ errorMessage: 'Custom resolve subscription errors.' })],
      schema
    );
    const resultStream = await testInstance.execute(`subscription { streamResolveError }`);
    assertStreamExecutionValue(resultStream);
    const allResults = await collectAsyncIteratorValues(resultStream);
    expect(allResults).toHaveLength(1);
    const [result] = allResults;
    expect(JSON.stringify(result)).toMatchInlineSnapshot(
      `"{\\"errors\\":[{\\"message\\":\\"Custom resolve subscription errors.\\"}],\\"data\\":{\\"streamResolveError\\":null}}"`
    );
  });

  it('Should not mask resolve subscription envelop errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const resultStream = await testInstance.execute(`subscription { streamResolveGraphQLError }`);
    assertStreamExecutionValue(resultStream);
    const allResults = await collectAsyncIteratorValues(resultStream);
    expect(allResults).toHaveLength(1);
    const [result] = allResults;
    expect(result.errors).toBeDefined();
    expect(result.errors).toMatchInlineSnapshot(`
      Array [
        [GraphQLError: Noop],
      ]
    `);
  });

  it('Should not mask auth0 header errors', async () => {
    expect.assertions(2);
    const auto0Options = {
      domain: 'domain.com',
      audience: 'audience',
      headerName: 'authorization',
      preventUnauthenticatedAccess: false,
      extendContextField: 'auth0',
      tokenType: 'Bearer',
    };
    const testInstance = createTestkit([useMaskedErrors(), useAuth0(auto0Options)], schema);
    try {
      await testInstance.execute(`query { secret }`, {}, { request: { headers: { authorization: 'Something' } } });
    } catch (err) {
      expect(err).toMatchInlineSnapshot(`[GraphQLError: Unexpected error.]`);
    }

    try {
      await testInstance.execute(`query { secret }`, {}, { request: { headers: { authorization: 'Something else' } } });
    } catch (err) {
      expect(err).toMatchInlineSnapshot(`[GraphQLError: Unexpected error.]`);
    }
  });

  it('should not mask parse errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { a `, {});
    assertSingleExecutionValue(result);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
          [GraphQLError: Syntax Error: Expected Name, found <EOF>.],
        ],
      }
    `);
  });

  it('should not mask validation errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { iDoNotExistsMyGuy }`, {});
    assertSingleExecutionValue(result);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
          [GraphQLError: Cannot query field "iDoNotExistsMyGuy" on type "Query".],
        ],
      }
    `);
  });

  it('should use custom error mask function for execution errors', async () => {
    const customErrorMaskFn: MaskErrorFn = e =>
      new GraphQLError('Custom error message for ' + e, null, null, null, null, null, {
        custom: true,
      });
    const testInstance = createTestkit([useMaskedErrors({ maskErrorFn: customErrorMaskFn })], schema);
    const result = await testInstance.execute(`query { secret }`);
    assertSingleExecutionValue(result);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": null,
        "errors": Array [
          [GraphQLError: Custom error message for Secret sauce that should not leak.

      GraphQL request:1:9
      1 | query { secret }
        |         ^],
        ],
      }
    `);
  });

  it('should use custom error mask function for subscribe (AsyncIterable) subscription errors', async () => {
    const customErrorMaskFn: MaskErrorFn = e =>
      new GraphQLError('Custom error message for ' + e, null, null, null, null, null, {
        custom: true,
      });
    expect.assertions(2);
    const testInstance = createTestkit([useMaskedErrors({ maskErrorFn: customErrorMaskFn })], schema);
    const resultStream = await testInstance.execute(`subscription { streamError }`);
    assertStreamExecutionValue(resultStream);
    try {
      await collectAsyncIteratorValues(resultStream);
    } catch (err: any) {
      expect(err.message).toEqual('Custom error message for Error: Noop');
      expect(err.extensions.custom).toBe(true);
    }
  });

  it('should use custom error mask function for errors while building the context', async () => {
    const customErrorMaskFn: MaskErrorFn = e =>
      new GraphQLError('Custom error message for ' + e, null, null, null, null, null, {
        custom: true,
      });
    const testInstance = createTestkit(
      [
        useMaskedErrors({ maskErrorFn: customErrorMaskFn }),
        useExtendContext(() => {
          throw new GraphQLError('Custom error');
          return {};
        }),
      ],
      schema
    );
    try {
      await testInstance.execute(`query { secret }`, {}, {});
    } catch (e) {
      expect((e as GraphQLError).message).toEqual('Custom error message for Custom error');
    }
    expect.assertions(1);
  });
});
