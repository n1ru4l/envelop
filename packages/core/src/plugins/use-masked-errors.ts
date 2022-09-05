import { Plugin, ExecutionResult } from '@envelop/types';
import { handleStreamOrSingleExecutionResult } from '../utils.js';

export const DEFAULT_ERROR_MESSAGE = 'Unexpected error.';

export type FormatErrorHandler = (error: unknown, message: string, isDev: boolean) => Error;

export const formatError: FormatErrorHandler = (err, message, isDev) => {
  if ((err as Error).name === 'GraphQLError') {
    return err as Error;
  }
  return new Error(message);
};

export type UseMaskedErrorsOpts = {
  /** The function used for format/identify errors. */
  formatError?: FormatErrorHandler;
  /** The error message that shall be used for masked errors. */
  errorMessage?: string;
  /**
   * Additional information that is forwarded to the `formatError` function.
   * The default value is `process.env['NODE_ENV'] === 'development'`
   */
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
  // eslint-disable-next-line dot-notation
  const isDev = opts?.isDev ?? (typeof process !== 'undefined' ? process.env['NODE_ENV'] === 'development' : false);
  const handleResult = makeHandleResult(format, message, isDev);

  return {
    onPluginInit(context) {
      context.registerContextErrorHandler(({ error, setError }) => {
        if ((error as Error).name !== 'GraphQLError' && error instanceof Error) {
          error = new Error(error.message);
        }
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
