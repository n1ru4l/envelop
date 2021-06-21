import { createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useResponseCache, createController } from '../src';

describe('useResponseCache', () => {
  it('should reuse cache', async () => {
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

    await testInstance.execute(/* GraphQL */ `
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
    `);

    expect(spy).toHaveBeenCalledTimes(1);

    await testInstance.execute(/* GraphQL */ `
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
    `);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should purge cache on mutation', async () => {
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

    const testInstance = createTestkit([useResponseCache({})], schema);

    await testInstance.execute(/* GraphQL */ `
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
    `);

    expect(spy).toHaveBeenCalledTimes(1);

    await testInstance.execute(/* GraphQL */ `
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
    `);

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

    await testInstance.execute(/* GraphQL */ `
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
    `);

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should purge cache on demand', async () => {
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

    const controller = createController();
    const testInstance = createTestkit([useResponseCache({ controller })], schema);

    await testInstance.execute(/* GraphQL */ `
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
    `);

    expect(spy).toHaveBeenCalledTimes(1);

    await testInstance.execute(/* GraphQL */ `
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
    `);

    expect(spy).toHaveBeenCalledTimes(1);

    controller.purge('Comment', 2);

    await testInstance.execute(/* GraphQL */ `
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
    `);

    expect(spy).toHaveBeenCalledTimes(2);
  });
});
