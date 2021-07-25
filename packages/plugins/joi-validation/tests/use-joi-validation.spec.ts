import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useJoiValidations, DIRECTIVE_SDL } from '../src';

describe('useJoiValidations', () => {
  const schema = makeExecutableSchema({
    typeDefs: `
    ${DIRECTIVE_SDL}
    
    type Query {
      test: String
    }
    `,
    resolvers: {
      Query: {},
    },
  });

  it('Should allow to set limitations ', async () => {
    const testInstance = createTestkit([useJoiValidations({})], schema);
    const result = await testInstance.execute(`query { test }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
  });
});
