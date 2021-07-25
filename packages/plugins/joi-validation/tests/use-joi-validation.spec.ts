import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useJoiValidations, DIRECTIVE_SDL } from '../src';

describe('useJoiValidations', () => {
  const schema = makeExecutableSchema({
    typeDefs: `
    ${DIRECTIVE_SDL}
    
    type Query {
      test(
        v: Int @number(positive: true)
      ): String
    }
    `,
    resolvers: {
      Query: {
        test: () => 'dummy',
      },
    },
  });

  it('Should allow to set limitations ', async () => {
    const testInstance = createTestkit([useJoiValidations()], schema);
    const result = await testInstance.execute(`query test($val: Int!) { test(v: $val) }`, {
      val: -5,
    });
    assertSingleExecutionValue(result);
    console.log(result);
    expect(result.errors).toBeDefined();
  });
});
