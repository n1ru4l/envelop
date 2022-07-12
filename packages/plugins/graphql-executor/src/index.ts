import { Plugin } from '@envelop/core';
import { execute } from 'graphql-executor';

export const useGraphQLExecutor = (): Plugin => {
  return {
    onExecute: async ({ setExecuteFn }) => {
      // @ts-expect-error It will work fine it is just the difference in Function signatures.
      setExecuteFn(function executorExecute(args) {
        // @ts-expect-error It will work fine it is just the difference in Function signatures.
        return execute(args);
      });
    },
  };
};
