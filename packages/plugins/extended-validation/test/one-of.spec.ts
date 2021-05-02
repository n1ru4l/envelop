import { buildSchema } from 'graphql';
import { createTestkit } from '@envelop/testing';
import { useExtendedValidation, ONE_OF_DIRECTIVE_SDL, OneOfInputObjectsRule } from '../src';

describe('oneOf', () => {
  const testSchema = buildSchema(/* GraphQL */ `
    ${ONE_OF_DIRECTIVE_SDL}

    type Query {
      user(input: UserUniqueCondition): User
      findUser(byID: ID, byUsername: String, byEmail: String, byRegistrationNumber: Int): User @oneOf
    }

    type User {
      id: ID!
    }

    input UserUniqueCondition @oneOf {
      id: ID
      username: String
    }
  `);

  describe('INPUT_OBJECT', () => {
    const DOCUMENT_WITH_WHOLE_INPUT = /* GraphQL */ `
      query user($input: UserUniqueCondition!) {
        user(input: $input) {
          id
        }
      }
    `;

    it.each([
      [
        'Valid: Exactly one key is specified through literal',
        {
          document: `query user { user(input: { id: 1 }) { id }}`,
          variables: {},
          expectedError: null,
        },
      ],
      [
        'Valid: Exactly one key is specified through variables',
        {
          document: DOCUMENT_WITH_WHOLE_INPUT,
          variables: {
            input: {
              id: 1,
            },
          },
          expectedError: null,
        },
      ],
      [
        'Valid: Mixed variables resolved into a single value',
        {
          document: `query user($username: String) { user(input: { id: 1, username: $username }) { id }}`,
          variables: {},
          expectedError: null,
        },
      ],
      [
        'Valid: Mixed variables resolved into a single value - separate variables',
        {
          document: `query user($id: ID, $username: String) { user(input: { id: $id, username: $username }) { id }}`,
          variables: {
            id: 1,
          },
          expectedError: null,
        },
      ],
      [
        'Invalid: Mixed variables leading to multiple values',
        {
          document: `query user($username: String) { user(input: { id: 1, username: $username }) { id }}`,
          variables: {
            username: 'test',
          },
          expectedError: 'Exactly one key must be specified for input type "UserUniqueCondition"',
        },
      ],
      [
        'Invalid: More than one value specified through literals',
        {
          document: `query user { user(input: { id: 1, username: "t" }) { id }}`,
          variables: {},
          expectedError: 'Exactly one key must be specified for input type "UserUniqueCondition"',
        },
      ],
      [
        'Invalid: More than one value specified through literals with null value',
        {
          document: `query user { user(input: { id: null, username: "t" }) { id }}`,
          variables: {},
          expectedError: 'Exactly one key must be specified for input type "UserUniqueCondition"',
        },
      ],
      [
        'Invalid: All values specified explicity with null values',
        {
          document: `query user { user(input: { id: null, username: null }) { id }}`,
          variables: {},
          expectedError: 'Exactly one key must be specified for input type "UserUniqueCondition"',
        },
      ],
      [
        `Invalid: When variables are empty`,
        {
          document: DOCUMENT_WITH_WHOLE_INPUT,
          variables: {},
          expectedError: 'Exactly one key must be specified for input type "UserUniqueCondition"',
        },
      ],
      [
        `Invalid: When specific variable is empty and provided as input type variable`,
        {
          document: DOCUMENT_WITH_WHOLE_INPUT,
          variables: {
            input: {},
          },
          expectedError: 'Exactly one key must be specified for input type "UserUniqueCondition"',
        },
      ],
      [
        'Invalid: More than one value is specific',
        {
          document: DOCUMENT_WITH_WHOLE_INPUT,
          variables: {
            input: {
              id: 1,
              username: 'test',
            },
          },
          expectedError: 'Exactly one key must be specified for input type "UserUniqueCondition"',
        },
      ],
    ])('%s', async (title, { document, variables, expectedError }) => {
      const testInstance = createTestkit(
        [
          useExtendedValidation({
            rules: [OneOfInputObjectsRule],
          }),
        ],
        testSchema
      );

      const result = await testInstance.execute(document, variables);

      if (expectedError) {
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toBe(expectedError);
      } else {
        expect(result.errors).toBeUndefined();
      }
    });
  });

  describe('FIELD_DEFINITION', () => {
    const DOCUMENT = /* GraphQL */ `
      query user($byID: ID, $byUsername: String, $byEmail: String, $byRegistrationNumber: Int) {
        findUser(byID: $byID, byUsername: $byUsername, byEmail: $byEmail, byRegistrationNumber: $byRegistrationNumber) {
          id
        }
      }
    `;

    it.each([
      [
        'Valid: One value specified correctly through variables',
        {
          document: DOCUMENT,
          variables: {
            byID: 1,
          },
          expectedError: null,
        },
      ],
      [
        'Valid: Mixed values of variables and literal without variables specified',
        {
          document: /* GraphQL */ `
            query user($username: String) {
              findUser(byID: 1, byUsername: $username) {
                id
              }
            }
          `,
          variables: {},
          expectedError: null,
        },
      ],
      [
        'Invalid: Multiple values specified through variables',
        {
          document: DOCUMENT,
          variables: {
            byID: 1,
            byUsername: 'test',
          },
          expectedError: 'Exactly one key must be specified for input for field "User.findUser"',
        },
      ],
      [
        'Invalid: Multiple values specified through literal',
        {
          document: /* GraphQL */ `
            query user {
              findUser(byID: 1, byUsername: "test") {
                id
              }
            }
          `,
          variables: {},
          expectedError: 'Exactly one key must be specified for input for field "User.findUser"',
        },
      ],
      [
        'Invalid: Mixed values of variables and literal',
        {
          document: /* GraphQL */ `
            query user($username: String) {
              findUser(byID: 1, byUsername: $username) {
                id
              }
            }
          `,
          variables: {
            username: 'test',
          },
          expectedError: 'Exactly one key must be specified for input for field "User.findUser"',
        },
      ],
    ])('%s', async (title, { document, variables, expectedError }) => {
      const testInstance = createTestkit(
        [
          useExtendedValidation({
            rules: [OneOfInputObjectsRule],
          }),
        ],
        testSchema
      );

      const result = await testInstance.execute(document, variables);

      if (expectedError) {
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toBe(expectedError);
      } else {
        expect(result.errors).toBeUndefined();
      }
    });
  });
});
