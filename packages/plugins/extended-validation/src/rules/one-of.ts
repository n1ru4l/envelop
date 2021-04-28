import { GraphQLInputObjectType, Kind } from 'graphql';
import { ExtendedValidationRule, getDirectiveFromType } from '../common';

export const ONE_OF_DIRECTIVE_SDL = /* GraphQL */ `
  directive @oneOf on INPUT_OBJECT | FIELD_DEFINITION
`;

export const OneOfInputObjectsRule: ExtendedValidationRule = (context, executionArgs) => {
  return {
    Argument: node => {
      if (node.value.kind === Kind.VARIABLE) {
        const argType = context.getArgument().type as GraphQLInputObjectType;
        const directive = getDirectiveFromType(argType, 'oneOf');

        if (directive) {
          const variableName = node.value.name.value;
          const variableValue = (executionArgs.variableValues || {})[variableName];
          const keys = Object.keys(variableValue);

          if (keys.length !== 1) {
            throw new Error(`Exactly one key must be specified for argument of type ${argType} (used in $${variableName})`);
          }
        }
      }
    },
  };
};
