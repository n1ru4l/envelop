import { useOperationFieldPermissions } from '../src';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';

const schema = makeExecutableSchema({
  typeDefs: [
    /* GraphQL */ `
      type Query {
        greetings: [String!]
        foo: String
        user: User
      }

      type User {
        id: ID!
      }
    `,
  ],
  resolvers: {},
});

const query = /* GraphQL */ `
  {
    greetings
    foo
    user {
      id
    }
  }
`;

describe('useOperationPermissions', () => {
  it('allow everything', async () => {
    const kit = createTestkit(
      [
        useOperationFieldPermissions({
          getPermissions: () => '*',
        }),
      ],
      schema
    );

    const result = await kit.execute(query);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
  });
  it('allow only one field', async () => {
    const kit = createTestkit(
      [
        useOperationFieldPermissions({
          getPermissions: () => 'Query.greetings',
        }),
      ],
      schema
    );

    const result = await kit.execute(query);
    assertSingleExecutionValue(result);
    expect(result.errors).toMatchInlineSnapshot(`
Array [
  [GraphQLError: Insufficient permissions for selecting 'Query.foo'.],
  [GraphQLError: Insufficient permissions for selecting 'Query.user'.],
  [GraphQLError: Insufficient permissions for selecting 'User.id'.],
]
`);
  });
  it('allow wildcard for types', async () => {
    const kit = createTestkit(
      [
        useOperationFieldPermissions({
          getPermissions: () => 'Query.*',
        }),
      ],
      schema
    );

    const result = await kit.execute(query);
    assertSingleExecutionValue(result);
    expect(result.errors).toMatchInlineSnapshot(`
Array [
  [GraphQLError: Insufficient permissions for selecting 'User.id'.],
]
`);
  });
  it('allow selecting specific fields', async () => {
    const kit = createTestkit(
      [
        useOperationFieldPermissions({
          getPermissions: () => new Set(['Query.greetings', 'Query.foo', 'Query.user', 'User.id']),
        }),
      ],
      schema
    );

    const result = await kit.execute(query);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
  });
});
