import { Plugin } from '@envelop/types';
import {
  ExecutionArgs,
  ExecutionResult,
  GraphQLError,
  TypeInfo,
  ValidationContext,
  visit,
  visitInParallel,
  visitWithTypeInfo,
} from 'graphql';
import { ExtendedValidationRule } from './common';

const SYMBOL_EXTENDED_VALIDATION_RULES = Symbol('SYMBOL_EXTENDED_VALIDATION_RULES');

export const useExtendedValidation = (options: {
  rules: ExtendedValidationRule[];
  /**
   * Callback that is invoked if the extended validation yields any errors.
   */
  onValidationFailed?: (params: {
    args: ExecutionArgs;
    result: ExecutionResult;
    setResult: (result: ExecutionResult) => void;
  }) => void;
}): Plugin => {
  let schemaTypeInfo: TypeInfo;

  return {
    onSchemaChange({ schema }) {
      schemaTypeInfo = new TypeInfo(schema);
    },
    onParse({ context, extendContext }) {
      const rules: ExtendedValidationRule[] = context?.[SYMBOL_EXTENDED_VALIDATION_RULES] ?? [];
      rules.push(...options.rules);
      extendContext({
        [SYMBOL_EXTENDED_VALIDATION_RULES]: rules,
      });
    },
    onExecute({ args, setResultAndStopExecution }) {
      const rules: ExtendedValidationRule[] = args.contextValue[SYMBOL_EXTENDED_VALIDATION_RULES];
      const errors: GraphQLError[] = [];
      const typeInfo = schemaTypeInfo || new TypeInfo(args.schema);
      const validationContext = new ValidationContext(args.schema, args.document, typeInfo, e => {
        errors.push(e);
      });

      const visitor = visitInParallel(rules.map(rule => rule(validationContext, args)));
      visit(args.document, visitWithTypeInfo(typeInfo, visitor));

      if (errors.length > 0) {
        let result: ExecutionResult = {
          data: null,
          errors,
        };
        if (options.onValidationFailed) {
          options.onValidationFailed({ args, result, setResult: newResult => (result = newResult) });
        }
        return setResultAndStopExecution(result);
      }
    },
  };
};
