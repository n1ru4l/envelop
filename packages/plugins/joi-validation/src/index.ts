import { Plugin } from '@envelop/types';
import { useExtendedValidation, ExtendedValidationRule, extractDirectives } from '@envelop/extended-validation';
import { getArgumentValues, getDirectiveValues } from 'graphql/execution/values.js';
import { GraphQLArgument, GraphQLError, GraphQLSchema } from 'graphql';
import { Maybe } from 'graphql/jsutils/Maybe';
import * as yup from 'yup';

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

function extractAndMapDirectives(
  schema: GraphQLSchema,
  arg: GraphQLArgument,
  variableValues: Maybe<{ [key: string]: any }>
): Record<string, any> {
  if (arg.extensions) {
    const relevantKeys = Object.keys(arg.extensions).filter(key => DIRECTIVE_NAMES.includes(key));

    if (relevantKeys.length > 0) {
      return relevantKeys.reduce((prev, key) => {
        return {
          ...prev,
          [key]: arg.extensions![key],
        };
      }, {} as Record<string, any>);
    }
  }

  if (arg.astNode) {
    const directives = extractDirectives(arg.astNode, DIRECTIVE_NAMES);
    const result = {};

    for (const directiveUsage of directives) {
      const directive = schema.getDirective(directiveUsage.name.value);

      if (directive) {
        result[directiveUsage.name.value] = getDirectiveValues(directive, arg.astNode, variableValues);
      }
    }

    return result;
  }

  return {};
}

function createYupSchema(root: string, def: Record<string, any>) {
  let resultSchema = yup[root]();

  for (const [name, value] of Object.entries(def)) {
    if (typeof value === 'boolean') {
      if (value === true) {
        resultSchema = resultSchema[name]();
      }
    } else {
      resultSchema = resultSchema[name](value);
    }
  }

  return resultSchema;
}

function createJoiValidationRule(): ExtendedValidationRule {
  function getValidationSchema(schema: GraphQLSchema, arg: GraphQLArgument, variableValues: Maybe<{ [key: string]: any }>) {
    const fieldValidations = extractAndMapDirectives(schema, arg, variableValues);
    const validationKey = Object.keys(fieldValidations)[0];

    if (!validationKey) {
      return null;
    }

    return createYupSchema(validationKey, fieldValidations[validationKey]);
  }

  return (validationContext, executionArgs) => {
    return {
      Field: (node, key, parent, path) => {
        const fieldDef = validationContext.getFieldDef();

        if (!fieldDef) {
          return;
        }

        const args = fieldDef.args || {};

        for (const arg of args) {
          const validationSchema = getValidationSchema(validationContext.getSchema(), arg, executionArgs.variableValues);
          const values = getArgumentValues(fieldDef, node, executionArgs.variableValues);
          console.log(arg, validationSchema, values);

          if (!validationSchema) {
            continue;
          }

          if (values[arg.name] !== undefined) {
            try {
              validationSchema.validateSync(values[arg.name]);
            } catch (e) {
              validationContext.reportError(
                new GraphQLError(
                  `Input validation failed for argument "${arg.name}" on field "${fieldDef.name}": ${e.message}`,
                  [node],
                  undefined,
                  undefined,
                  path,
                  e
                )
              );
            }
          }
        }
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
