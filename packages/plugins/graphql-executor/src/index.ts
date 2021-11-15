import { Plugin } from '@envelop/core';
import { Executor } from 'graphql-executor';

export type GraphQLExecutorOptions = {
  customExecutor?: Executor;
};

export const useGraphQLExecutor = <TOptions extends GraphQLExecutorOptions>(options: TOptions): Plugin => {
  const executor = options?.customExecutor ?? new Executor();

  return {
    onExecute: async ({ args, setExecuteFn }) => {
      setExecuteFn(function executorExecute() {
        return executor.executeQueryOrMutation(args);
      });
    },
    onSubscribe: async ({ args, setSubscribeFn }) => {
      setSubscribeFn(function executorSubscriber() {
        return executor.executeSubscription(args);
      });
    },
  };
};
