import { createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useResponseCache } from '@envelop/response-cache';
import { shield } from 'graphql-shield';
import { useGraphQLMiddleware } from '../src/index.js';

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      foo: String
    }
  `,
});

const permissions = shield({});

describe('useGraphQlJit', () => {
  it('does not cause infinite loops', async () => {
    const testkit = createTestkit(
      [
        useResponseCache({
          session: () => null,
          ttl: 2000,
          includeExtensionMetadata: true,
        }),
        useGraphQLMiddleware([permissions]),
      ],
      schema
    );

    await testkit.perform({ query: '{ __typename}' });
  });
});
