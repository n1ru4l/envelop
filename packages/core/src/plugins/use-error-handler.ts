import { Plugin, handleStreamOrSingleExecutionResult } from '@envelop/types';
import { ExecutionResult, GraphQLError } from 'graphql';

export type ErrorHandler = (errors: readonly GraphQLError[]) => void;

const makeHandleResult =
  (errorHandler: ErrorHandler) =>
  ({ result }: { result: ExecutionResult }) => {
    if (result.errors?.length) {
      errorHandler(result.errors);
    }
  };

export const useErrorHandler = (errorHandler: ErrorHandler): Plugin => ({
  onExecute() {
    const handleResult = makeHandleResult(errorHandler);
    return {
      onExecuteDone(payload) {
        return handleStreamOrSingleExecutionResult(payload, handleResult);
      },
    };
  },
});
