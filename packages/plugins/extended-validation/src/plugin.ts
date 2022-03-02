import { Plugin } from '@envelop/core';
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

const symbolExtendedValidationRules = Symbol('extendedValidationContext');

type ExtendedValidationContext = {
  rules: Array<ExtendedValidationRule>;
  didRun: boolean;
};

export const useExtendedValidation = (options: {
  rules: Array<ExtendedValidationRule>;
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
    onContextBuilding({ context, extendContext }) {
      // We initialize the validationRules context in onContextBuilding as onExecute is already too late!
      let validationRulesContext: undefined | ExtendedValidationContext = context[symbolExtendedValidationRules];
      if (validationRulesContext === undefined) {
        validationRulesContext = {
          rules: [],
          didRun: false,
        };
        extendContext({
          [symbolExtendedValidationRules]: validationRulesContext,
        });
      }
      validationRulesContext.rules.push(...options.rules);
    },
    onExecute({ args, setResultAndStopExecution }) {
      // We hook into onExecute even though this is a validation pattern. The reasoning behind
      // it is that hooking right after validation and before execution has started is the
      // same as hooking into the validation step. The benefit of this approach is that
      // we may use execution context in the validation rules.
      const validationRulesContext: ExtendedValidationContext | undefined = args.contextValue[symbolExtendedValidationRules];
      if (validationRulesContext === undefined) {
        throw new Error(
          'Plugin has not been properly set up. ' +
            "The 'contextFactory' function is not invoked and the result has not been passed to 'execute'."
        );
      }
      // we only want to run the extended execution once.
      if (validationRulesContext.didRun === false) {
        validationRulesContext.didRun = true;
        if (validationRulesContext.rules.length !== 0) {
          const errors: GraphQLError[] = [];

          // We replicate the default validation step manually before execution starts.
          const typeInfo = schemaTypeInfo || new TypeInfo(args.schema);
          const validationContext = new ValidationContext(args.schema, args.document, typeInfo, e => {
            errors.push(e);
          });

          const visitor = visitInParallel(validationRulesContext.rules.map(rule => rule(validationContext, args)));
          visit(args.document, visitWithTypeInfo(typeInfo, visitor));

          if (errors.length > 0) {
            let result: ExecutionResult = {
              data: null,
              errors,
            };
            if (options.onValidationFailed) {
              options.onValidationFailed({ args, result, setResult: newResult => (result = newResult) });
            }
            setResultAndStopExecution(result);
          }
        }
      }
    },
  };
};
