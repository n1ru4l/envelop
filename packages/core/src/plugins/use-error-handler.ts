import { Plugin } from '@envelop/types';
import { GraphQLError } from 'graphql';

export const useErrorHandler = (errorHandler: (errors: readonly GraphQLError[]) => void): Plugin => ({
  onExecute() {
    return {
      onExecuteDone: ({ result }) => {
        if (result.errors?.length > 0) {
          errorHandler(result.errors);
        }
      },
    };
  },
});
