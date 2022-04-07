import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import '@sentry/tracing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useSentry } from '../src';

describe('useSentry', () => {
  it('works', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          foo: String
        }
      `,
      resolvers: {
        Query: {
          foo: () => '1',
        },
      },
    });
    const testkit = createTestkit([useSentry()], schema);

    const result = await testkit.execute(`{ foo }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
  });
});
