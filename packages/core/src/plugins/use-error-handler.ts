import { Plugin } from '@envelop/types';
import { ExecutionResult, GraphQLError } from 'graphql';
import isAsyncIterable from 'graphql/jsutils/isAsyncIterable.js';

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
      onExecuteDone({ result }) {
        if (isAsyncIterable(result)) {
          return {
            onNext({ result }) {
              handleResult({ result });
            },
          };
        }
        handleResult({ result });
        return undefined;
      },
    };
  },
});
