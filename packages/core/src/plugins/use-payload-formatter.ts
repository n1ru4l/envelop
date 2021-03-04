import { Plugin } from '@envelop/types';
import { ExecutionResult } from 'graphql';

export const usePayloadFormatter = (formatter: (result: ExecutionResult<any, any>) => false | ExecutionResult<any, any>): Plugin => ({
  onExecute() {
    return {
      onExecuteDone: ({ result, setResult }) => {
        const modified = formatter(result);

        if (modified !== false) {
          setResult(modified);
        }
      },
    };
  },
});
