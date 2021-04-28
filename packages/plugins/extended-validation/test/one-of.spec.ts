import { buildSchema, validate } from 'graphql';
import { createTestkit } from '@envelop/testing';
import { useExtendedValidation, ONE_OF_DIRECTIVE_SDL, OneOfInputObjectsRule } from '../src';
import { Plugin } from '@envelop/types';

describe('useExtendedValidation', () => {
  const testSchema = buildSchema(/* GraphQL */ `
    ${ONE_OF_DIRECTIVE_SDL}

    type Query {
      user(input: UserUniqueCondition): User
    }

    type User {
      id: ID!
    }

    input UserUniqueCondition @oneOf {
      id: ID
      username: String
    }
  `);

  it('Should throw an error when both fields are missing', async () => {
    const testInstance = createTestkit(
      [
        useExtendedValidation({
          rules: [OneOfInputObjectsRule],
        }),
      ],
      testSchema
    );

    const result = await testInstance.execute(
      /* GraphQL */ `
        query user($input: UserUniqueCondition!) {
          user(input: $input) {
            id
          }
        }
      `,
      {
        input: {},
      }
    );

    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toBe(
      'Exactly one key must be specified for argument of type UserUniqueCondition (used in $input)'
    );
  });
});
