import { createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useResponseCache } from '@envelop/response-cache';
import { shield } from 'graphql-shield';
import { useGraphQLMiddleware } from '../src';

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
          ttl: 2000,
          includeExtensionMetadata: true,
        }),
        useGraphQLMiddleware([permissions]),
      ],
      schema
    );

    await testkit.execute(`{ __typename}`);
  });
});
