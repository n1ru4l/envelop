import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';

// import { useInngest } from '../src/index';

describe('useInngest', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        test: String!
      }
    `,
    resolvers: {
      Query: {
        test: () => 'hello',
      },
    },
  });
  // it('', async () => {
  //   const testInstance = createTestkit([useInngest({ inngestClient: { name: 'TEST' } })], schema);
  //   const result = await testInstance.execute(`query { test }`);
  //   assertSingleExecutionValue(result);
  //   expect(result.errors).toBeUndefined();
  // });
});
