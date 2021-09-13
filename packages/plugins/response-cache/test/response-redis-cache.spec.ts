import { createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useResponseCache, createRedisCache, defaultBuildRedisEntityId, defaultBuildRedisResponseOpsKey } from '../src';

jest.mock('ioredis', () => require('ioredis-mock/jest'));

describe('useResponseCache with Redis store', () => {
  beforeEach(() => jest.useRealTimers());

  test('should create a default entity id with a number id', () => {
    const entityId = defaultBuildRedisEntityId('User', 1);
    expect(entityId).toEqual('User:1');
  });

  test('should create a default entity id with a string id', () => {
    const entityId = defaultBuildRedisEntityId('User', 'aaa-bbb-ccc-111-222');
    expect(entityId).toEqual('User:aaa-bbb-ccc-111-222');
  });

  test('should create a default key used to store associated response operations', () => {
    const entityId = defaultBuildRedisResponseOpsKey('abcde123456XYZ=');
    expect(entityId).toEqual('operations:abcde123456XYZ=');
  });

  test('should reuse cache', async () => {
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

    const cache = createRedisCache();
    const store = cache.store();
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
  });

  test('should purge cache on mutation', async () => {
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

    const cache = createRedisCache();
    const store = cache.store();
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

    await testInstance.execute(
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

    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('should purge cache on demand (typename+id)', async () => {
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

    const cache = createRedisCache();
    const store = cache.store();
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

    await testInstance.execute(query); // query and cache
    await testInstance.execute(query); // get from cache
    expect(spy).toHaveBeenCalledTimes(1); // so queried just once

    expect(await store.exists('User:1')).toBeTruthy();
    expect(await store.exists('User:2')).toBeTruthy();
    expect(await store.exists('User:3')).toBeFalsy();

    expect(await store.exists('Comment:1')).toBeTruthy();
    expect(await store.exists('Comment:2')).toBeTruthy();
    expect(await store.exists('User:3')).toBeFalsy();

    const commentMembers = await store.smembers('Comment');
    expect(commentMembers).toHaveLength(1);

    const comment1Members = await store.smembers('Comment:1');
    expect(comment1Members).toHaveLength(1);

    const comment2Members = await store.smembers('Comment:2');
    expect(comment2Members).toHaveLength(1);

    await cache.invalidate([{ typename: 'Comment', id: 2 }]);

    const commentMembersInvalidated = await store.smembers('Comment');
    expect(commentMembersInvalidated).toHaveLength(1);

    const comment1MembersInvalidated = await store.get('Comment:1');
    expect(comment1Members).toHaveLength(1);

    expect(await store.exists('Comment:1')).toBeTruthy();
    expect(await store.exists('Comment:2')).toBeFalsy();

    await testInstance.execute(query); // query and cache since ws invalidated
    await testInstance.execute(query); // from cache
    await testInstance.execute(query); // from cache
    expect(spy).toHaveBeenCalledTimes(2); // but since we've queried once before, we've now queried twice
  });

  test('should purge cache on demand (typename)', async () => {
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

    const cache = createRedisCache();
    const store = cache.store();

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

    await testInstance.execute(query); // query and cache
    await testInstance.execute(query); // from cache
    expect(spy).toHaveBeenCalledTimes(1); // queried once

    expect(await store.exists('User:1')).toBeTruthy();
    expect(await store.exists('User:2')).toBeTruthy();
    expect(await store.exists('User:3')).toBeFalsy();

    expect(await store.exists('Comment:1')).toBeTruthy();
    expect(await store.exists('Comment:2')).toBeTruthy();
    expect(await store.exists('User:3')).toBeFalsy();

    await cache.invalidate([{ typename: 'Comment' }]);

    expect(await store.exists('Comment')).toBeFalsy();
    expect(await store.exists('Comment:1')).toBeFalsy();
    expect(await store.exists('Comment:2')).toBeFalsy();
    expect(await store.smembers('Comment')).toHaveLength(0);

    await testInstance.execute(query); // we've invalidated so, now query and cache
    expect(spy).toHaveBeenCalledTimes(2); // so have queried twice

    await testInstance.execute(query); // from cache
    await testInstance.execute(query); // from cache
    await testInstance.execute(query); // from cache
    expect(spy).toHaveBeenCalledTimes(2); // still just queried twice
  });

  test('should consider variables when saving response', async () => {
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

    const cache = createRedisCache();
    const store = cache.store();
    const testInstance = createTestkit([useResponseCache({ cache })], schema);

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

    await testInstance.execute(query, { limit: 2 }); // query and cache 2 users
    await testInstance.execute(query, { limit: 2 }); // fetch 2 users from cache
    expect(spy).toHaveBeenCalledTimes(1); // so just one query

    expect(await store.keys('operations:*')).toHaveLength(1); // we should have one response with operations

    await testInstance.execute(query, { limit: 1 }); // query just one user
    expect(await store.keys('operations:*')).toHaveLength(2); // we should have one response with operations for each limit query
    expect(spy).toHaveBeenCalledTimes(2); // since 2 users are in cache, we query again for the 1 as a response
  });

  test('should purge response after it expired', async () => {
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

    const cache = createRedisCache();
    const testInstance = createTestkit([useResponseCache({ cache, ttl: 100 })], schema);

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

    await testInstance.execute(query); // query and cache
    await testInstance.execute(query); // from cahce
    expect(spy).toHaveBeenCalledTimes(1); // so queried just once

    await new Promise(resolve => setTimeout(resolve, 150));

    await testInstance.execute(query); // since the cache has expired, now when we query
    expect(spy).toHaveBeenCalledTimes(2); // we query again so now twice
  });

  test('should cache responses based on session', async () => {
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

    const cache = createRedisCache();
    const store = cache.store();

    const testInstance = createTestkit(
      [
        useResponseCache({
          cache,
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

    expect(await store.keys('operations:*')).toHaveLength(1); // we should have one response for that sessionId of 1

    await testInstance.execute(
      query,
      {},
      {
        sessionId: 2,
      }
    );
    expect(spy).toHaveBeenCalledTimes(2);

    expect(await store.keys('operations:*')).toHaveLength(2); // we should have one response for both sessions
  });

  test('should skip cache of ignored types', async () => {
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

    const cache = createRedisCache();
    const store = cache.store();

    const testInstance = createTestkit([useResponseCache({ cache, ignoredTypes: ['Comment'] })], schema);

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

    await testInstance.execute(query); // query but don't cache

    expect(await store.exists('User')).toBeFalsy(); // none of the queries entities are cached because contains Comment
    expect(await store.exists('User:1')).toBeFalsy();
    expect(await store.exists('Comment')).toBeFalsy();
    expect(await store.exists('Comment:2')).toBeFalsy();

    await testInstance.execute(query); // since not cached

    expect(await store.exists('User')).toBeFalsy(); // still none of the queries entities are cached because contains Comment
    expect(await store.exists('User:1')).toBeFalsy();
    expect(await store.exists('Comment')).toBeFalsy();
    expect(await store.exists('Comment:2')).toBeFalsy();
    expect(spy).toHaveBeenCalledTimes(2); // we've queried twice
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

    const cache = createRedisCache();

    const testInstance = createTestkit(
      [
        useResponseCache({
          cache,
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

    await testInstance.execute(query); //query and cache
    await testInstance.execute(query); // from cache
    expect(spy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(201); // wait so User expires

    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2); // now we've queried twice
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

    const cache = createRedisCache();
    const testInstance = createTestkit(
      [
        useResponseCache({
          cache,
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

    await testInstance.execute(query); //query and cache
    await testInstance.execute(query); // from cache
    expect(spy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(201); // wait so User expires

    await testInstance.execute(query);
    expect(spy).toHaveBeenCalledTimes(2); // now we've queried twice
  });
});
