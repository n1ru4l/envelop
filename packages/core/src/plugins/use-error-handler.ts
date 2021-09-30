import { Plugin, handleStreamOrSingleExecutionResult, DefaultContext } from '@envelop/types';
import { ExecutionResult, GraphQLError } from 'graphql';

export type ErrorHandler = (errors: readonly GraphQLError[], context: Readonly<DefaultContext>) => void;

type ErrorHandlerCallback<ContextType> = {
  context: Readonly<ContextType>;
  result: ExecutionResult;
};

const makeHandleResult =
  <ContextType>(errorHandler: ErrorHandler) =>
  ({ context, result }: ErrorHandlerCallback<ContextType>) => {
    if (result.errors?.length) {
      errorHandler(result.errors, context);
    }
  };

export const useErrorHandler = <ContextType = DefaultContext>(errorHandler: ErrorHandler): Plugin<ContextType> => ({
  onExecute() {
    const handleResult = makeHandleResult<ContextType>(errorHandler);
    return {
      onExecuteDone(payload) {
        return handleStreamOrSingleExecutionResult(payload, handleResult);
      },
    };
  },
});
