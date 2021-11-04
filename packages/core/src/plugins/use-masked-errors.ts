import { Plugin } from '@envelop/types';
import { ExecutionResult, GraphQLError } from 'graphql';
import { handleStreamOrSingleExecutionResult } from '../utils';

export const DEFAULT_ERROR_MESSAGE = 'Unexpected error.';

export class EnvelopError extends GraphQLError {
  constructor(message: string, extensions?: Record<string, any>) {
    super(message, undefined, undefined, undefined, undefined, undefined, extensions);
  }
}

export type FormatErrorHandler = (error: GraphQLError | unknown, message: string) => GraphQLError;

export const formatError: FormatErrorHandler = (err, message) => {
  if (err instanceof GraphQLError) {
    if (err.originalError && err.originalError instanceof EnvelopError === false) {
      return new GraphQLError(message, err.nodes, err.source, err.positions, err.path, undefined);
    }
    return err;
  }
  return new GraphQLError(message);
};

export type UseMaskedErrorsOpts = {
  formatError?: FormatErrorHandler;
  errorMessage?: string;
};

const makeHandleResult =
  (format: FormatErrorHandler, message: string) =>
  ({ result, setResult }: { result: ExecutionResult; setResult: (result: ExecutionResult) => void }) => {
    if (result.errors != null) {
      setResult({ ...result, errors: result.errors.map(error => format(error, message)) });
    }
  };

export const useMaskedErrors = (opts?: UseMaskedErrorsOpts): Plugin => {
  const format = opts?.formatError ?? formatError;
  const message = opts?.errorMessage || DEFAULT_ERROR_MESSAGE;
  const handleResult = makeHandleResult(format, message);

  return {
    onPluginInit(context) {
      context.registerContextErrorHandler(({ error, setError }) => {
        setError(formatError(error, message));
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
        onSubscribeError({ error, setError }) {
          setError(formatError(error, message));
        },
      };
    },
  };
};
