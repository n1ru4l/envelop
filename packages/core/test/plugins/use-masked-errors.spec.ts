import { makeExecutableSchema } from '@graphql-tools/schema';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { EnvelopError, useMaskedErrors } from '../../src/plugins/use-masked-errors';
import { useExtendContext } from '@envelop/core';

describe('useMaskedErrors', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        secret: String!
        secretEnvelop: String!
        secretWithExtensions: String!
      }
    `,
    resolvers: {
      Query: {
        secret: () => {
          throw new Error('Secret sauce that should not leak.');
        },
        secretEnvelop: () => {
          throw new EnvelopError('This message goes to all the clients out there!');
        },
        secretWithExtensions: () => {
          throw new EnvelopError('This message goes to all the clients out there!', {
            code: 'Foo',
            message: 'Bar',
          });
        },
      },
    },
  });

  it('Should mask non EnvelopErrors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { secret }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors!;
    expect(error.message).toEqual('Unexpected error.');
  });

  it('Should mask unexpected errors', async () => {
    const testInstance = createTestkit([useMaskedErrors()], schema);
    const result = await testInstance.execute(`query { secretEnvelop }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors!;
    expect(error.message).toEqual('This message goes to all the clients out there!');
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

  it('Should forward extensions from EnvelopError to final GraphQLError in errors array', async () => {
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
    } catch (err) {
      expect(err).toMatchInlineSnapshot(`[GraphQLError: Unexpected error.]`);
    }
  });

  it('Should not mask expected context creation errors', async () => {
    expect.assertions(1);
    const testInstance = createTestkit(
      [
        useExtendContext((): {} => {
          throw new EnvelopError('No context for you!');
        }),
        useMaskedErrors(),
      ],
      schema
    );
    try {
      await testInstance.execute(`query { secretWithExtensions }`);
    } catch (err) {
      expect(err).toMatchInlineSnapshot(`[GraphQLError: No context for you!]`);
    }
  });
});
