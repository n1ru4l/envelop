import { Plugin } from '@envelop/types';
import { ExecutionResult, GraphQLError } from 'graphql';
import { handleStreamOrSingleExecutionResult } from '../utils';

export const DEFAULT_ERROR_MESSAGE = 'Unexpected error.';

export class EnvelopError extends GraphQLError {
  constructor(message: string, extensions?: Record<string, any>) {
    super(message, undefined, undefined, undefined, undefined, undefined, extensions);
  }
}

export type FormatErrorHandler = (error: GraphQLError | unknown, message: string, isDev: boolean) => GraphQLError;

export const formatError: FormatErrorHandler = (err, message, isDev) => {
  if (err instanceof GraphQLError) {
    if (
      /** execution error */
      (err.originalError && err.originalError instanceof EnvelopError === false) ||
      /** validate and parse errors */
      (err.originalError === undefined && err instanceof EnvelopError === false)
    ) {
      return new GraphQLError(
        message,
        err.nodes,
        err.source,
        err.positions,
        err.path,
        undefined,
        isDev
          ? {
              originalError: {
                message: err.originalError?.message ?? err.message,
                stack: err.originalError?.stack ?? err.stack,
              },
            }
          : undefined
      );
    }
    return err;
  }
  return new GraphQLError(message);
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
  /**
   * Whether parse errors should be masked.
   * @default false
   */
  onParse?: boolean;
  /**
   * Whether validation errors should be masked.
   * @default false
   */
  onValidate?: boolean;
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
    onParse:
      opts?.onParse === true
        ? function onParse() {
            return function onParseEnd({ result, replaceParseResult }) {
              if (result instanceof Error) {
                replaceParseResult(format(result, message, isDev));
              }
            };
          }
        : undefined,
    onValidate:
      opts?.onValidate === true
        ? function onValidate() {
            return function onValidateEnd({ valid, result, setResult }) {
              if (valid === false) {
                setResult(result.map(error => format(error, message, isDev)));
              }
            };
          }
        : undefined,
    onPluginInit(context) {
      context.registerContextErrorHandler(({ error, setError }) => {
        setError(formatError(error, message, isDev));
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
          setError(formatError(error, message, isDev));
        },
      };
    },
  };
};
