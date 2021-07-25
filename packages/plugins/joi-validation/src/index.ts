import { Plugin } from '@envelop/types';
import { getDirectiveFromAstNode, useExtendedValidation, ExtendedValidationRule } from '@envelop/extended-validation';
import { getArgumentValues } from 'graphql/execution/values.js';
import { GraphQLArgument } from 'graphql';

export const DIRECTIVE_SDL = /* GraphQL */ `
  """
  Defines a numeric validation based on: https://joi.dev/api/#number
  """
  directive @number(
    " Specifies that the value must be greater than limit "
    greater: Float
    " Requires the number to be an integer (no floating point) "
    integer: Float
    " Specifies that the value must be less than limit "
    less: Float
    " Specifies the maximum value of a number "
    max: Float
    " Specifies the maximum value of a number "
    min: Float
    " Specifies the maximum number of decimal places "
    precision: Int
    " Specifies that the value must be a multiple of base value"
    multiple: Int
    " Requires the number to be positive. "
    positive: Boolean
    " Requires the number to be negative. "
    negative: Boolean
    " Requires the number to be a TCP port, so between 0 and 65535. "
    port: Boolean
  ) on INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION
`;

const DIRECTIVE_NAMES = ['number'];

function extractJoiDirectives(arg: GraphQLArgument) {
  if (arg.extensions) {
    const keys = Object.keys(arg.extensions);
  }

  const directive = arg.extensions?.oneOf || (arg.astNode && getDirectiveFromAstNode(arg.astNode, DIRECTIVE_NAMES));
}

function createJoiValidationRule(): ExtendedValidationRule {
  return (context, executionArgs) => {
    return {
      Field: node => {
        const fieldDef = context.getFieldDef();

        if (!fieldDef) {
          return;
        }

        const args = fieldDef.args || {};

        const relevantArgs = [];

        for (const [argName, arg] of Object.entries(args)) {
        }

        // const values = getArgumentValues(fieldDef, node, executionArgs.variableValues);
      },
    };
  };
}

export const useJoiValidations = (): Plugin<{}> => {
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useExtendedValidation({
          rules: [createJoiValidationRule()],
        })
      );
    },
  };
};
