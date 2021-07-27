import { Plugin } from '@envelop/types';
import { formatApolloErrors } from 'apollo-server-errors';
import type { ExecutionResult } from 'graphql';
import isAsyncIterable from 'graphql/jsutils/isAsyncIterable.js';

const makeHandleResult =
  (options: Parameters<typeof formatApolloErrors>[1] = {}) =>
  ({ result, setResult }: { result: ExecutionResult; setResult: (result: ExecutionResult) => void }) => {
    if (result.errors && result.errors.length > 0) {
      setResult({
        ...result,
        errors: formatApolloErrors(result.errors, {
          debug: options.debug,
          formatter: options.formatter,
        }),
      });
    }
  };

export const useApolloServerErrors = (options: Parameters<typeof formatApolloErrors>[1] = {}): Plugin => {
  return {
    onExecute() {
      const handleResult = makeHandleResult(options);

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
