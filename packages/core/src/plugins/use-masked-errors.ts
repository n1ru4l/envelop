import { Plugin, ExecutionResult } from '@envelop/types';
import { handleStreamOrSingleExecutionResult } from '../utils.js';

export const DEFAULT_ERROR_MESSAGE = 'Unexpected error.';

export type FormatErrorHandler = (error: unknown, message: string, isDev: boolean) => Error;

export function isGraphQLError(error: unknown): error is Error & { originalError?: Error } {
  return error instanceof Error && error.name === 'GraphQLError';
}

function createSerializableError(message: string, originalError?: Error) {
  const error = new Error(message);
  Object.defineProperty(error, 'toJSON', {
    value() {
      if (originalError) {
        return {
          message: error.message,
          extensions: {
            originalError: {
              name: originalError.name,
              message: originalError.message,
              stack: originalError.stack,
            },
          },
        };
      }
      return {
        message: error.message,
      };
    },
  });
  return error;
}

export const formatError: FormatErrorHandler = (err, message, isDev) => {
  if (isGraphQLError(err)) {
    if (err?.originalError) {
      if (isGraphQLError(err.originalError)) {
        return err;
      } else if (isDev) {
        return createSerializableError(message, err.originalError);
      } else {
        return createSerializableError(message);
      }
    }
    return err;
  }
  return createSerializableError(message);
};

export type UseMaskedErrorsOpts = {
  /** The function used for format/identify errors. */
  formatError?: FormatErrorHandler;
  /** The error message that shall be used for masked errors. */
  errorMessage?: string;

  isDev?: boolean;
};

const makeHandleResult =
  (format: FormatErrorHandler, message: string, isDev: boolean) =>
  ({ result, setResult }: { result: ExecutionResult; setResult: (result: ExecutionResult) => void }) => {
    if (result.errors != null) {
      setResult({ ...result, errors: result.errors.map(error => format(error, message, isDev)) });
    }
  };

export const useMaskedErrors = (opts?: UseMaskedErrorsOpts): Plugin => {
  const format = opts?.formatError ?? formatError;
  const message = opts?.errorMessage || DEFAULT_ERROR_MESSAGE;
  const isDev = opts?.isDev ?? process.env.NODE_ENV === 'development';
  const handleResult = makeHandleResult(format, message, isDev);

  return {
    onPluginInit(context) {
      context.registerContextErrorHandler(({ error, setError }) => {
        setError(format(error, message, isDev));
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
          setError(format(error, message, isDev));
        },
      };
    },
  };
};
