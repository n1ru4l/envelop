import { Plugin, DefaultContext, TypedExecutionArgs, ExecutionResult } from '@envelop/types';
import { handleStreamOrSingleExecutionResult } from '../utils.js';

export type ErrorHandler = ({
  errors,
  context,
  phase,
}: {
  errors: readonly Error[] | any[];
  context: Readonly<DefaultContext>;
  phase: 'parse' | 'validate' | 'context' | 'execution';
}) => void;

type ErrorHandlerCallback<ContextType> = {
  result: ExecutionResult;
  args: TypedExecutionArgs<ContextType>;
};

const makeHandleResult =
  <ContextType extends Record<any, any>>(errorHandler: ErrorHandler) =>
  ({ result, args }: ErrorHandlerCallback<ContextType>) => {
    if (result.errors?.length) {
      errorHandler({ errors: result.errors, context: args, phase: 'execution' });
    }
  };

export const useErrorHandler = <ContextType extends Record<string, any>>(
  errorHandler: ErrorHandler
): Plugin<ContextType> => {
  const handleResult = makeHandleResult<ContextType>(errorHandler);
  return {
    onParse() {
      return function onParseEnd({ result, context }) {
        if (result instanceof Error) {
          errorHandler({ errors: [result], context, phase: 'parse' });
        }
      };
    },
    onValidate() {
      return function onValidateEnd({ valid, result, context }) {
        if (valid === false && result.length > 0) {
          errorHandler({ errors: result as Error[], context, phase: 'validate' });
        }
      };
    },
    onPluginInit(context) {
      context.registerContextErrorHandler(({ error }) => {
        errorHandler({ errors: [error], context, phase: 'context' });
      });
    },
    onExecute() {
      return {
        onExecuteDone(payload) {
          return handleStreamOrSingleExecutionResult(payload, handleResult);
        },
      };
    },
    onSubscribe() {
      return {
        onSubscribeResult(payload) {
          return handleStreamOrSingleExecutionResult(payload, handleResult);
        },
      };
    },
  };
};
