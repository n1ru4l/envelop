import { handleStreamOrSingleExecutionResult, Plugin } from '@envelop/types';
import { ExecutionResult } from 'graphql';

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
      onExecuteDone(payload) {
        return handleStreamOrSingleExecutionResult(payload, handleResult);
      },
    };
  },
});
