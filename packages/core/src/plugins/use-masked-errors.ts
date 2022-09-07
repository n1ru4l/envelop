import { Plugin, ExecutionResult } from '@envelop/types';
import { handleStreamOrSingleExecutionResult } from '../utils.js';

export const DEFAULT_ERROR_MESSAGE = 'Unexpected error.';

export type MaskErrorFn = (error: unknown, message: string) => Error;

export type SerializableGraphQLErrorLike = Error & {
  toJSON?(): { message: string };
  extensions?: Record<string, unknown>;
};

export function isGraphQLError(error: unknown): error is Error & { originalError?: Error } {
  return error instanceof Error && error.name === 'GraphQLError';
}

function createSerializableGraphQLError(
  message: string,
  originalError: unknown,
  isDev: boolean
): SerializableGraphQLErrorLike {
  const error: SerializableGraphQLErrorLike = new Error(message);
  error.name = 'GraphQLError';
  if (isDev) {
    const extensions =
      originalError instanceof Error
        ? { message: originalError.message, stack: originalError.stack }
        : { message: String(originalError) };

    Object.defineProperty(error, 'extensions', {
      get() {
        return extensions;
      },
    });
  }

  Object.defineProperty(error, 'toJSON', {
    value() {
      return {
        message: error.message,
        extensions: error.extensions,
      };
    },
  });

  return error as SerializableGraphQLErrorLike;
}

export const createDefaultMaskErrorFn =
  (isDev: boolean): MaskErrorFn =>
  (error, message) => {
    if (isGraphQLError(error)) {
      if (error?.originalError) {
        if (isGraphQLError(error.originalError)) {
          return error;
        }
        return createSerializableGraphQLError(message, error, isDev);
      }
      return error;
    }
    return createSerializableGraphQLError(message, error, isDev);
  };

const isDev = globalThis.process?.env?.NODE_ENV === 'development';

export const defaultMaskErrorFn: MaskErrorFn = createDefaultMaskErrorFn(isDev);

export type UseMaskedErrorsOpts = {
  /** The function used for identify and mask errors. */
  maskErrorFn?: MaskErrorFn;
  /** The error message that shall be used for masked errors. */
  errorMessage?: string;
};

const makeHandleResult =
  (maskErrorFn: MaskErrorFn, message: string) =>
  ({ result, setResult }: { result: ExecutionResult; setResult: (result: ExecutionResult) => void }) => {
    if (result.errors != null) {
      setResult({ ...result, errors: result.errors.map(error => maskErrorFn(error, message)) });
    }
  };

export const useMaskedErrors = (opts?: UseMaskedErrorsOpts): Plugin => {
  const maskErrorFn = opts?.maskErrorFn ?? defaultMaskErrorFn;
  const message = opts?.errorMessage || DEFAULT_ERROR_MESSAGE;
  const handleResult = makeHandleResult(maskErrorFn, message);

  return {
    onPluginInit(context) {
      context.registerContextErrorHandler(({ error, setError }) => {
        setError(maskErrorFn(error, message));
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
          setError(maskErrorFn(error, message));
        },
      };
    },
  };
};
