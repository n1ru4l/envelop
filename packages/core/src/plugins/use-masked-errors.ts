import { Plugin, ExecutionResult } from '@envelop/types';
import { handleStreamOrSingleExecutionResult } from '../utils.js';

export const DEFAULT_ERROR_MESSAGE = 'Unexpected error.';

export type MaskErrorFn = (error: unknown, message: string) => Error;

export type SerializableGraphQLErrorLike = Error & {
  name: 'GraphQLError';
  toJSON(): { message: string };
};

export function isGraphQLError(error: unknown): error is Error & { originalError?: Error } {
  return error instanceof Error && error.name === 'GraphQLError';
}

export function createSerializableGraphQLError(message: string): SerializableGraphQLErrorLike {
  const error = new Error(message);
  error.name = 'GraphQLError';
  Object.defineProperty(error, 'toJSON', {
    value() {
      return {
        message: error.message,
      };
    },
  });
  return error as SerializableGraphQLErrorLike;
}

export const defaultMaskErrorFn: MaskErrorFn = (err, message) => {
  if (isGraphQLError(err)) {
    if (err?.originalError) {
      if (isGraphQLError(err.originalError)) {
        return err;
      }
      return createSerializableGraphQLError(message);
    }
    return err;
  }
  return createSerializableGraphQLError(message);
};

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
