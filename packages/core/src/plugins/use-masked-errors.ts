import { Plugin } from '@envelop/types';
import { ExecutionResult, GraphQLError } from 'graphql';
import isAsyncIterable from 'graphql/jsutils/isAsyncIterable.js';

export class EnvelopError extends GraphQLError {
  constructor(message: string, extensions?: Record<string, any>) {
    super(message, undefined, undefined, undefined, undefined, undefined, extensions);
  }
}

export type FormatErrorHandler = (error: GraphQLError) => GraphQLError;

export const formatError: FormatErrorHandler = err => {
  if (err.originalError && err.originalError instanceof EnvelopError === false) {
    return new GraphQLError('Unexpected error.', err.nodes, err.source, err.positions, err.path, undefined);
  }

  return err;
};

export type UseMaskedErrorsOpts = {
  formatError?: FormatErrorHandler;
};

const makeHandleResult =
  (format: FormatErrorHandler) =>
  ({ result, setResult }: { result: ExecutionResult; setResult: (result: ExecutionResult) => void }) => {
    if (result.errors != null) {
      setResult({ ...result, errors: result.errors.map(error => format(error)) });
    }
  };

export const useMaskedErrors = (opts?: UseMaskedErrorsOpts): Plugin => {
  const format = opts?.formatError ?? formatError;
  const handleResult = makeHandleResult(format);

  return {
    onExecute() {
      return {
        onExecuteDone({ result, setResult }) {
          if (isAsyncIterable(result)) {
            return {
              onNext: ({ result, setResult }) => {
                handleResult({ result, setResult });
              },
            };
          }
          handleResult({ result, setResult });
          return undefined;
        },
      };
    },
  };
};
