import { Plugin, DefaultContext, TypedExecutionArgs } from '@envelop/types';
import { ExecutionResult, GraphQLError } from 'graphql';
import { handleStreamOrSingleExecutionResult } from '../utils.js';

export type ErrorHandler = (errors: readonly GraphQLError[], context: Readonly<DefaultContext>) => void;

type ErrorHandlerCallback<ContextType> = {
  result: ExecutionResult;
  args: TypedExecutionArgs<ContextType>;
};

const makeHandleResult =
  <ContextType extends Record<any, any>>(errorHandler: ErrorHandler) =>
  ({ result, args }: ErrorHandlerCallback<ContextType>) => {
    if (result.errors?.length) {
      errorHandler(result.errors, args);
    }
  };

export const useErrorHandler = <ContextType extends Record<string, any>>(
  errorHandler: ErrorHandler
): Plugin<ContextType> => {
  const handleResult = makeHandleResult<ContextType>(errorHandler);
  return {
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
