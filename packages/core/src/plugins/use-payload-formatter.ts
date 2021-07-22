import { Plugin } from '@envelop/types';
import { ExecutionResult } from 'graphql';
import isAsyncIterable from 'graphql/jsutils/isAsyncIterable';

export type FormatterFunction = (result: ExecutionResult<any, any>) => false | ExecutionResult<any, any>;

const makeHandleResult =
  (formatter: FormatterFunction) =>
  ({ result, setResult }: { result: ExecutionResult; setResult: (result: ExecutionResult) => void }) => {
    const modified = formatter(result);
    if (modified !== false) {
      setResult(modified);
    }
  };

export const usePayloadFormatter = (formatter: FormatterFunction): Plugin => ({
  onExecute() {
    const handleResult = makeHandleResult(formatter);
    return {
      onExecuteDone({ result, setResult }) {
        if (isAsyncIterable(result)) {
          return {
            onNext({ result, setResult }) {
              handleResult({ result, setResult });
            },
          };
        }

        handleResult({ result, setResult });
        return undefined;
      },
    };
  },
});
