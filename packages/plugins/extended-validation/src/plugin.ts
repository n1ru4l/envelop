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
import { getSchemaSpecificInstance, Plugin, TypedSubscriptionArgs } from '@envelop/core';
import { ExtendedValidationRule } from './common.js';

type ExtendedValidationContext = {
  rules: Array<ExtendedValidationRule>;
  didRun: boolean;
};

type OnValidationFailedCallback = (params: {
  args: ExecutionArgs;
  result: ExecutionResult;
  setResult: (result: ExecutionResult) => void;
}) => void;
const extendedValidationContextMap = new WeakMap<Record<string, any>, ExtendedValidationContext>();
export const useExtendedValidation = <PluginContext extends Record<string, any> = {}>(options: {
  rules: Array<ExtendedValidationRule>;
  /**
   * Callback that is invoked if the extended validation yields any errors.
   */
  onValidationFailed?: OnValidationFailedCallback;
}): Plugin<PluginContext> => {
  return {
    onContextBuilding({ context }) {
      // We initialize the validationRules context in onContextBuilding as onExecute is already too late!
      let validationRulesContext: undefined | ExtendedValidationContext =
        extendedValidationContextMap.get(context);
      if (validationRulesContext == null) {
        validationRulesContext = {
          rules: [],
          didRun: false,
        };
        extendedValidationContextMap.set(context, validationRulesContext);
      }
      validationRulesContext.rules.push(...options.rules);
    },
    onSubscribe: buildHandler(
      'subscribe',
      extendedValidationContextMap,
      options.onValidationFailed,
    ),
    onExecute: buildHandler('execute', extendedValidationContextMap, options.onValidationFailed),
  };
};

function buildHandler(
  name: 'execute' | 'subscribe',
  extendedValidationContextMap: WeakMap<Record<string, any>, ExtendedValidationContext>,
  onValidationFailed?: OnValidationFailedCallback,
) {
  return function handler({
    args,
    setResultAndStopExecution,
  }: {
    args: TypedSubscriptionArgs<any>;
    setResultAndStopExecution: (newResult: ExecutionResult) => void;
  }) {
    // We hook into onExecute/onSubscribe even though this is a validation pattern. The reasoning behind
    // it is that hooking right after validation and before execution has started is the
    // same as hooking into the validation step. The benefit of this approach is that
    // we may use execution context in the validation rules.
    const validationRulesContext: ExtendedValidationContext | undefined =
      args.contextValue && extendedValidationContextMap.get(args.contextValue);
    if (validationRulesContext === undefined) {
      throw new Error(
        'Plugin has not been properly set up. ' +
          `The 'contextFactory' function is not invoked and the result has not been passed to '${name}'.`,
      );
    }
    // we only want to run the extended execution once.
    if (validationRulesContext.didRun === false) {
      validationRulesContext.didRun = true;
      if (validationRulesContext.rules.length !== 0) {
        const errors: GraphQLError[] = [];

        // We replicate the default validation step manually before execution starts.
        const typeInfo = getSchemaSpecificInstance(TypeInfo, args.schema);
        const validationContext = new ValidationContext(args.schema, args.document, typeInfo, e => {
          errors.push(e);
        });

        const visitor = visitInParallel(
          validationRulesContext.rules.map(rule => rule(validationContext, args)),
        );
        visit(args.document, visitWithTypeInfo(typeInfo, visitor));

        if (errors.length > 0) {
          let result: ExecutionResult = {
            data: null,
            errors,
          };
          if (onValidationFailed) {
            onValidationFailed({ args, result, setResult: newResult => (result = newResult) });
          }
          setResultAndStopExecution(result);
        }
      }
    }
  };
}
