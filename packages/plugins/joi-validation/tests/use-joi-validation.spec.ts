import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useJoiValidations, DIRECTIVE_SDL } from '../src';

describe('useJoiValidations', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      ${DIRECTIVE_SDL}

      type Query {
        test(pos: Int @number(positive: true), neg: Int @number(negative: true), min10: Int @number(min: 10)): String
        testForInput(in: TestInput!): String
      }

      input TestInput {
        min10: Int @number(min: 10)
      }
    `,
    resolvers: {
      Query: {
        test: () => 'dummy',
        testForInput: () => 'dummy',
      },
    },
  });

  it('Should allow to set limitations on basic fields', async () => {
    const testInstance = createTestkit([useJoiValidations()], schema);
    const result = await testInstance.execute(`query test($val: Int!) { test(pos: $val) }`, {
      val: -5,
    });
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBe(1);
    expect(result.errors![0].message).toBe(
      'Input validation failed for argument "pos" on field "test": this must be a positive number'
    );

    const result2 = await testInstance.execute(`query test($val: Int!) { test(neg: $val) }`, {
      val: -5,
    });
    assertSingleExecutionValue(result2);
    expect(result2.errors).toBeUndefined();

    const result3 = await testInstance.execute(`query test($val: Int!) { test(min10: $val) }`, {
      val: 9.9,
    });
    assertSingleExecutionValue(result3);
    expect(result.errors).toBeDefined();
    expect(result3.errors![0].message).toBe(
      'Input validation failed for argument "min10" on field "test": this must be greater than or equal to 10'
    );
  });

  it('Should work with explicit values set in the query', async () => {
    const testInstance = createTestkit([useJoiValidations()], schema);
    const result = await testInstance.execute(`{ test(pos: -2) }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBe(1);
    expect(result.errors![0].message).toBe(
      'Input validation failed for argument "pos" on field "test": this must be a positive number'
    );
  });

  it.only('Should run validations also on input fields', async () => {
    const testInstance = createTestkit([useJoiValidations()], schema);
    const result = await testInstance.execute(`query test($inputV: TestInput!) { testForInput(in: $inputV) }`, {
      inputV: {
        min10: 8,
      },
    });
    assertSingleExecutionValue(result);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBe(1);
    expect(result.errors![0].message).toBe(
      'Input validation failed for input field "in" on field "testForInput": this must be a positive number'
    );
  });
});
