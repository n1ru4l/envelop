import { assertSingleExecutionValue, createTestkit, createSpiedPlugin } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';

import { useInngest } from '../src/plugin';

import type { EventPayload, Inngest } from 'inngest';

describe('useInngest', () => {
  const testEventKey = 'foo-bar-baz-test';

  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Post {
        id: ID!
        title: String!
        comments: [Comment!]!
      }

      type Comment {
        id: ID!
        body: String!
      }

      type User {
        id: ID!
        name: String!
        email: String!
      }

      type Query {
        test: String!
        post: Post!
        posts: [Post!]!
      }

      type Mutation {
        updatePost(id: ID!, title: String!): Post!
      }
    `,
    resolvers: {
      Query: {
        test: () => 'hello',
        post: () => ({ id: '1', title: 'hello', comments: [{ id: 3, body: 'message' }] }),
        posts: () => [
          { id: '1', title: 'hello' },
          { id: '2', title: 'world' },
        ],
      },
      Mutation: {
        updatePost: ({ id, title }) => ({ id, title }),
      },
    },
  });

  const mockedInngestClient = {
    name: 'TEST',
    eventKey: testEventKey,
    send: jest.fn(),
    setEventKey: jest.fn(),
  } as unknown as Inngest<Record<string, EventPayload>>;

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('queries', () => {
    it('sends', async () => {
      const spiedPlugin = createSpiedPlugin();

      const testInstance = createTestkit(
        [useInngest({ inngestClient: mockedInngestClient }), spiedPlugin.plugin],
        schema
      );

      const result = await testInstance.execute(`query TestQuery2 { test }`);
      assertSingleExecutionValue(result);

      expect(result.data).toEqual({ test: 'hello' });
      expect(result.errors).toBeUndefined();

      expect(spiedPlugin.spies.afterExecute).toHaveBeenCalled();

      expect(mockedInngestClient.send).toHaveBeenCalledWith({
        name: 'graphql/test-query2.query',
        data: {
          variables: {},
          identifiers: [],
          types: [],
          result: {},
          operation: { id: 'test-query2', name: 'TestQuery2', type: 'query' },
        },
        user: { currentUser: undefined },
      });
    });

    it('sends with types and identifiers', async () => {
      const spiedPlugin = createSpiedPlugin();

      const testInstance = createTestkit(
        [useInngest({ inngestClient: mockedInngestClient }), spiedPlugin.plugin],
        schema
      );

      const result = await testInstance.execute(`query FindPost { post { id title } }`);
      assertSingleExecutionValue(result);

      expect(result.data).toEqual({ post: { id: '1', title: 'hello' } });
      expect(result.errors).toBeUndefined();

      expect(spiedPlugin.spies.afterExecute).toHaveBeenCalled();

      expect(mockedInngestClient.send).toHaveBeenCalledWith({
        name: 'graphql/find-post.query',
        data: {
          variables: {},
          identifiers: [
            {
              id: '1',
              typename: 'Post',
            },
          ],
          types: ['Post'],
          result: {},
          operation: { id: 'find-post', name: 'FindPost', type: 'query' },
        },
        user: { currentUser: undefined },
      });
    });

    it('sends with types and identifiers when nested query', async () => {
      const spiedPlugin = createSpiedPlugin();

      const testInstance = createTestkit(
        [useInngest({ inngestClient: mockedInngestClient }), spiedPlugin.plugin],
        schema
      );

      const result = await testInstance.execute(`query FindPost { post { id title comments { id body } } }`);
      assertSingleExecutionValue(result);

      expect(result.data).toEqual({ post: { id: '1', title: 'hello', comments: [{ id: '3', body: 'message' }] } });
      expect(result.errors).toBeUndefined();

      expect(spiedPlugin.spies.afterExecute).toHaveBeenCalled();

      expect(mockedInngestClient.send).toHaveBeenCalledWith({
        name: 'graphql/find-post.query',
        data: {
          variables: {},
          identifiers: [
            {
              id: '1',
              typename: 'Post',
            },
            {
              id: '3',
              typename: 'Comment',
            },
          ],
          types: ['Post', 'Comment'],
          result: {},
          operation: { id: 'find-post', name: 'FindPost', type: 'query' },
        },
        user: { currentUser: undefined },
      });
    });

    describe('mutations', () => {
      it('sends', async () => {
        throw new Error('Not implemented yet');
      });
    });

    describe('with anonymous operations', () => {
      it('does not send anonymous operations', async () => {
        const spiedPlugin = createSpiedPlugin();

        const testInstance = createTestkit(
          [useInngest({ inngestClient: mockedInngestClient }), spiedPlugin.plugin],
          schema
        );

        const result = await testInstance.execute(`query { test }`);
        assertSingleExecutionValue(result);

        expect(result.data).toEqual({ test: 'hello' });
        expect(result.errors).toBeUndefined();

        expect(spiedPlugin.spies.afterExecute).toHaveBeenCalled();

        expect(mockedInngestClient.send).not.toHaveBeenCalled();
      });

      it('send anonymous operations when configured to send anonymous operations', async () => {
        const spiedPlugin = createSpiedPlugin();

        const testInstance = createTestkit(
          [useInngest({ inngestClient: mockedInngestClient, sendAnonymousOperations: true }), spiedPlugin.plugin],
          schema
        );

        const result = await testInstance.execute(`query { test }`);
        assertSingleExecutionValue(result);

        expect(result.data).toEqual({ test: 'hello' });
        expect(result.errors).toBeUndefined();

        expect(spiedPlugin.spies.afterExecute).toHaveBeenCalled();

        expect(mockedInngestClient.send).toHaveBeenCalledWith({
          data: {
            identifiers: [],
            operation: {
              id: 'anonymous-d32327f2ad0fef67462baf2b8410a2b4b2cc8db57e67bb5b3c95efa595b39f30',
              name: '',
              type: 'query',
            },
            result: {},
            types: [],
            variables: {},
          },
          name: 'graphql/anonymous-7b06f59976962bf7b47e2f2f29142661407818808663d8cf5a68c9cee38c11ff.query',
          user: {},
        });
      });
    });

    describe('with introspection', () => {
      it('sends', async () => {
        throw new Error('Not implemented yet');
      });

      it('blocks', async () => {
        throw new Error('Not implemented yet');
      });
    });

    describe('with errors', () => {
      it('sends', async () => {
        throw new Error('Not implemented yet');
      });

      it('blocks', async () => {
        throw new Error('Not implemented yet');
      });
    });

    describe('with deny lists', () => {
      it('blocks types', async () => {
        throw new Error('Not implemented yet');
      });

      it('blocks schema coordinates', async () => {
        throw new Error('Not implemented yet');
      });
    });
  });

  describe('when including result data', () => {
    it('sends with data', async () => {
      throw new Error('Not implemented yet');
    });
  });

  describe('when redacting', () => {
    it('sends with redacted data', async () => {
      throw new Error('Not implemented yet');
    });

    it('sends with redacted mutation variables', async () => {
      throw new Error('Not implemented yet');
    });
  });

  describe('with a custom event prefix function', () => {
    it('sends', async () => {
      throw new Error('Not implemented yet');
    });
  });

  describe('with a custom event name function', () => {
    it('sends', async () => {
      throw new Error('Not implemented yet');
    });
  });

  describe('with a custom user context function', () => {
    it('sends', async () => {
      throw new Error('Not implemented yet');
    });
  });
});
