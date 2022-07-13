/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck It will work fine it is just the difference in Function signatures.
import { Plugin } from '@envelop/core';
import { execute } from 'graphql-executor';

export const useGraphQLExecutor = (): Plugin => {
  return {
    onExecute: async ({ setExecuteFn }) => {
      setExecuteFn(function executorExecute(args) {
        return execute(args);
      });
    },
  };
};
