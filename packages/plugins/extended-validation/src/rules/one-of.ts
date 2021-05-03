import { GraphQLError } from 'graphql';
import { getArgumentValues } from 'graphql/execution/values';
import { ExtendedValidationRule, getDirectiveFromAstNode, unwrapType } from '../common';

export const ONE_OF_DIRECTIVE_SDL = /* GraphQL */ `
  directive @oneOf on INPUT_OBJECT | FIELD_DEFINITION
`;

export const OneOfInputObjectsRule: ExtendedValidationRule = (validationContext, executionArgs) => {
  return {
    Field: node => {
      if (node.arguments?.length) {
        const fieldType = validationContext.getFieldDef();

        if (!fieldType || !fieldType.astNode) {
          return;
        }

        const values = getArgumentValues(fieldType, node, executionArgs.variableValues);

        if (fieldType) {
          const isOneOfFieldType =
            fieldType.extensions?.oneOf || (fieldType.astNode && getDirectiveFromAstNode(fieldType.astNode, 'oneOf'));

          if (isOneOfFieldType) {
            if (Object.keys(values).length !== 1) {
              validationContext.reportError(
                new GraphQLError(
                  `Exactly one key must be specified for input for field "${fieldType.type.toString()}.${node.name.value}"`,
                  [node]
                )
              );
            }
          }
        }

        for (const arg of node.arguments) {
          const argType = fieldType.args.find(typeArg => typeArg.name === arg.name.value);

          if (argType) {
            const inputType = unwrapType(argType.type);
            const isOneOfInputType =
              inputType.extensions?.oneOf || (inputType.astNode && getDirectiveFromAstNode(inputType.astNode, 'oneOf'));

            if (isOneOfInputType) {
              const argValue = values[arg.name.value] || {};

              if (Object.keys(argValue).length !== 1) {
                validationContext.reportError(
                  new GraphQLError(`Exactly one key must be specified for input type "${inputType.name}"`, [arg])
                );
              }
            }
          }
        }
      }
    },
  };
};
