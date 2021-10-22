import { getIntrospectionQuery, GraphQLObjectType } from 'graphql';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useValidationCache } from '@envelop/validation-cache';
import { useResponseCache, createInMemoryCache } from '../src';
import { useParserCache } from '@envelop/parser-cache';

describe('useResponseCache', () => {
  beforeEach(() => jest.useRealTimers());

  test('custom ttl per type is used instead of the global ttl - only enable caching for a specific type when global ttl = 0', async () => {
    jest.useFakeTimers();
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          ttl: 0,
          ttlPerType: {
            User: 200,
          },
        }),
      ],
      schema
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(201);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('Should reuse cache', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
    ]);
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type Mutation {
          updateUser(id: ID!): User!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit([useResponseCache({})], schema);

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;
    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('Should purge cache on mutation', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type Mutation {
          updateUser(id: ID!): User!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
        Mutation: {
          updateUser(_, { id }) {
            return {
              id,
            };
          },
        },
      },
    });

    const testInstance = createTestkit([useResponseCache({ includeExtensionMetadata: true })], schema);

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    let result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(result.extensions?.responseCache).toEqual({ hit: false, didCache: true, ttl: Infinity });
    result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(result.extensions?.responseCache).toEqual({ hit: true });
    expect(spy).toHaveBeenCalledTimes(1);

    result = await testInstance.execute(
      /* GraphQL */ `
        mutation test($id: ID!) {
          updateUser(id: $id) {
            id
          }
        }
      `,
      {
        id: 1,
      }
    );
    assertSingleExecutionValue(result);
    expect(result?.extensions?.responseCache).toEqual({ invalidatedEntities: [{ id: '1', typename: 'User' }] });

    result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(result.extensions?.responseCache).toEqual({ hit: false, didCache: true, ttl: Infinity });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('Should purge cache on demand (typename+id)', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type Mutation {
          updateUser(id: ID!): User!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
        Mutation: {
          updateUser(_, { id }) {
            return {
              id,
            };
          },
        },
      },
    });

    const cache = createInMemoryCache();
    const testInstance = createTestkit([useResponseCache({ cache })], schema);

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);

    cache.invalidate([{ typename: 'Comment', id: 2 }]);

    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('Should purge cache on demand (typename)', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type Mutation {
          updateUser(id: ID!): User!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
        Mutation: {
          updateUser(_, { id }) {
            return {
              id,
            };
          },
        },
      },
    });

    const cache = createInMemoryCache();
    const testInstance = createTestkit([useResponseCache({ cache })], schema);

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);

    cache.invalidate([{ typename: 'Comment' }]);

    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('Should consider variables when saving response', async () => {
    const spy = jest.fn((_, { limit }: { limit: number }) =>
      [
        {
          id: 1,
          name: 'User 1',
          comments: [
            {
              id: 1,
              text: 'Comment 1 of User 1',
            },
          ],
        },
        {
          id: 2,
          name: 'User 2',
          comments: [
            {
              id: 2,
              text: 'Comment 2 of User 2',
            },
          ],
        },
      ].slice(0, limit)
    );

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users(limit: Int!): [User!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit([useResponseCache({})], schema);

    const query = /* GraphQL */ `
      query test($limit: Int!) {
        users(limit: $limit) {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    await testInstance.execute(query, { limit: 2 });
    await testInstance.execute(query, { limit: 2 });
    expect(spy).toHaveBeenCalledTimes(1);
    await testInstance.execute(query, { limit: 1 });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('Should purge response after it expired', async () => {
    jest.useFakeTimers();

    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          ttl: 100,
        }),
      ],
      schema
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);

    // let's travel in time beyond the ttl of 100
    jest.advanceTimersByTime(150);

    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('Should cache responses based on session', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          session(ctx: { sessionId: number }) {
            return ctx.sessionId + '';
          },
        }),
      ],
      schema
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    await testInstance.execute(
      query,
      {},
      {
        sessionId: 1,
      }
    );
    await testInstance.execute(
      query,
      {},
      {
        sessionId: 1,
      }
    );
    expect(spy).toHaveBeenCalledTimes(1);
    await testInstance.execute(
      query,
      {},
      {
        sessionId: 2,
      }
    );
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('Should skip cache of ignored types', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          ignoredTypes: ['Comment'],
        }),
      ],
      schema
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('custom ttl per type', async () => {
    jest.useFakeTimers();
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          ttl: 500,
          ttlPerType: {
            User: 200,
          },
        }),
      ],
      schema
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(201);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('custom ttl per schema coordinate', async () => {
    jest.useFakeTimers();
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          ttl: 500,
          ttlPerSchemaCoordinate: {
            'Query.users': 200,
          },
        }),
      ],
      schema
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(201);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('disable global ttl', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          ttl: 0,
        }),
      ],
      schema
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('prioritize schema coordinate over global ttl', async () => {
    jest.useFakeTimers();
    const userSpy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const orderSpy = jest.fn(() => [
      {
        id: 1,
        products: [
          {
            id: 1,
            name: 'Jeans',
          },
        ],
      },
      {
        id: 2,
        products: [
          {
            id: 2,
            name: 'Shoes',
          },
        ],
      },
    ]);

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
          orders: [Order!]!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }

        type Order {
          id: ID!
          products: [Product!]!
        }

        type Product {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Query: {
          users: userSpy,
          orders: orderSpy,
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          ttl: 1,
          ttlPerSchemaCoordinate: {
            'Query.users': 200,
          },
          includeExtensionMetadata: true,
        }),
      ],
      schema
    );

    const userQuery = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    const orderQuery = /* GraphQL */ `
      query test {
        orders {
          id
          products {
            id
            name
          }
        }
      }
    `;

    let result = await testInstance.execute(userQuery);
    assertSingleExecutionValue(result);
    expect(result.extensions).toEqual({
      responseCache: {
        didCache: true,
        hit: false,
        ttl: 200,
      },
    });
    result = await testInstance.execute(orderQuery);
    assertSingleExecutionValue(result);
    expect(result.extensions).toEqual({
      responseCache: {
        didCache: true,
        hit: false,
        ttl: 1,
      },
    });

    jest.advanceTimersByTime(2);
    await testInstance.execute(userQuery);
    await testInstance.execute(orderQuery);
    expect(userSpy).toHaveBeenCalledTimes(1);
    expect(orderSpy).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(201);
    await testInstance.execute(userQuery);
    expect(userSpy).toHaveBeenCalledTimes(2);
  });

  it('Should not cache query when execution result includes errors and data is null', async () => {
    const spy = jest.fn(() => {
      throw new Error('Do not cache an error');
    });

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit([useResponseCache({})], schema);

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
        }
      }
    `;
    await testInstance.execute(query);
    await testInstance.execute(query);
    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(4);
  });

  it('Custom shouldCache parameter can override the default behavior and cache execution results with errors', async () => {
    const spy = jest.fn(() => {
      throw new Error('Do not cache an error');
    });

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type User {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
      },
    });

    const testInstance = createTestkit(
      [
        useResponseCache({
          // cache any query execution result
          shouldCacheResult: () => true,
        }),
      ],
      schema
    );

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
        }
      }
    `;
    await testInstance.execute(query);
    await testInstance.execute(query);
    await testInstance.execute(query);
    await testInstance.execute(query);
    // the resolver is only called once as all following executions hit the cache
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('Purges cache on mutation even when error is included in the execution result', async () => {
    const spy = jest.fn(() => [
      {
        id: 1,
        name: 'User 1',
        comments: [
          {
            id: 1,
            text: 'Comment 1 of User 1',
          },
        ],
      },
      {
        id: 2,
        name: 'User 2',
        comments: [
          {
            id: 2,
            text: 'Comment 2 of User 2',
          },
        ],
      },
    ]);

    const errorSpy = jest.fn(() => {
      throw new Error('could not get name');
    });

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          users: [User!]!
        }

        type Mutation {
          updateUser(id: ID!): User!
        }

        type User {
          id: ID!
          name: String!
          comments: [Comment!]!
          recentComment: Comment
        }

        type Comment {
          id: ID!
          text: String!
        }
      `,
      resolvers: {
        Query: {
          users: spy,
        },
        Mutation: {
          updateUser(_, { id }) {
            return {
              id,
              name: errorSpy,
            };
          },
        },
      },
    });

    const testInstance = createTestkit([useResponseCache({ includeExtensionMetadata: true })], schema);

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
          comments {
            id
            text
          }
        }
      }
    `;

    await testInstance.execute(query);
    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(1);

    await testInstance.execute(
      /* GraphQL */ `
        mutation test($id: ID!) {
          updateUser(id: $id) {
            id
            name
          }
        }
      `,
      {
        id: 1,
      }
    );

    expect(errorSpy).toHaveBeenCalledTimes(1);

    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('Should not cache an introspection query operation with default options', async () => {
    const introspectionQuery = getIntrospectionQuery();

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          user: User!
        }
        type User {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Query: {
          user: {
            id: 1,
            name: 'User 1',
          },
        },
      },
    });

    // keeps track how often the '__Schema.queryType' resolver has been called
    // aka a introspection query operation has been executed
    // we wrap that field and increment the counter
    let introspectionCounter = 0;

    const schemaType = schema.getType('__Schema') as GraphQLObjectType;
    const schemaTypeQueryTypeField = schemaType.getFields()['queryType'];
    const originalResolve = schemaTypeQueryTypeField.resolve!;
    schemaTypeQueryTypeField.resolve = (...args) => {
      introspectionCounter++;
      return originalResolve(...args);
    };

    const cache = createInMemoryCache();
    const testInstance = createTestkit([useResponseCache({ cache })], schema);

    // after each execution the introspectionCounter should be incremented by 1
    // as we never cache the introspection

    await testInstance.execute(introspectionQuery);
    expect(introspectionCounter).toEqual(1);

    await testInstance.execute(introspectionQuery);
    expect(introspectionCounter).toEqual(2);
  });

  it("Introspection query operation can be cached via 'ttlPerSchemaCoordinate' option", async () => {
    const introspectionQuery = getIntrospectionQuery();

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          user: User!
        }
        type User {
          id: ID!
          name: String!
        }
      `,
      resolvers: {
        Query: {
          user: {
            id: 1,
            name: 'User 1',
          },
        },
      },
    });

    // keeps track how often the '__Schema.queryType' resolver has been called
    // aka a introspection query operation has been executed
    // we wrap that field and increment the counter
    let introspectionCounter = 0;

    const schemaType = schema.getType('__Schema') as GraphQLObjectType;
    const schemaTypeQueryTypeField = schemaType.getFields()['queryType'];
    const originalResolve = schemaTypeQueryTypeField.resolve!;
    schemaTypeQueryTypeField.resolve = (...args) => {
      introspectionCounter++;
      return originalResolve(...args);
    };

    const cache = createInMemoryCache();
    const testInstance = createTestkit(
      [useResponseCache({ cache, ttlPerSchemaCoordinate: { 'Query.__schema': undefined } })],
      schema
    );

    await testInstance.execute(introspectionQuery);
    // after the first execution the introspectionCounter should be incremented by 1
    expect(introspectionCounter).toEqual(1);

    await testInstance.execute(introspectionQuery);
    // as we now cache the introspection the resolver shall not be called for further introspections
    expect(introspectionCounter).toEqual(1);
  });

  it('A query operation is not cached if an error occurs within a resolver', async () => {
    let usersResolverInvocationCount = 0;

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          name: String!
        }

        type Query {
          users: [User!]!
        }
      `,
      resolvers: {
        Query: {
          users: () => {
            usersResolverInvocationCount++;
            return null;
          },
        },
      },
    });

    const cache = createInMemoryCache();
    const testInstance = createTestkit([useResponseCache({ cache })], schema);

    const query = /* GraphQL */ `
      query test {
        users {
          id
          name
        }
      }
    `;

    await testInstance.execute(query);
    expect(usersResolverInvocationCount).toEqual(1);

    const testInstance2 = createTestkit([useResponseCache({ cache })], schema);
    await testInstance2.execute(query);
    expect(usersResolverInvocationCount).toEqual(2);
  });

  test('response cache works with validation cache and parser cache', async () => {
    jest.useFakeTimers();
    const mockFn = jest.fn();
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: { Query: { foo: () => void mockFn() || 'hi' } },
    });
    const testkit = createTestkit([useValidationCache(), useResponseCache(), useParserCache()], schema);

    const document = /* GraphQL */ `
      query {
        foo
      }
    `;

    let result = await testkit.execute(document);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "foo": "hi",
        },
      }
    `);
    result = await testkit.execute(document);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "foo": "hi",
        },
      }
    `);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
