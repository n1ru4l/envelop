import { SubscriptionArgs, execute } from 'graphql';
import { Plugin } from '@envelop/types';
import { makeExecute } from '@envelop/core';
import { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue';
import { subscribe } from './subscribe';

export type ContextFactoryOptions = {
  /** The arguments with which the subscription was set up. */
  args: SubscriptionArgs;
};
export type ContextFactoryHook<TContextValue> = {
  /** Context that will be used for the "ExecuteSubscriptionEvent" phase. */
  contextValue: TContextValue;
  /** Optional callback that is invoked once the "ExecuteSubscriptionEvent" phase has ended. Useful for cleanup, such as tearing down database connections. */
  onEnd?: () => void;
};
export type ContextFactoryType<TContextValue = unknown> = (
  options: ContextFactoryOptions
) => PromiseOrValue<ContextFactoryHook<TContextValue> | void>;

export const useContextValuePerExecuteSubscriptionEvent = <TContextValue = unknown>(
  createContext: ContextFactoryType<TContextValue>
): Plugin => {
  return {
    onSubscribe({ args, setSubscribeFn }) {
      const executeNew = makeExecute(async executionArgs => {
        const context = await createContext({ args });
        try {
          return execute({
            ...executionArgs,
            contextValue: context ? context.contextValue : executionArgs.contextValue,
          });
        } finally {
          if (context && context.onEnd) {
            context.onEnd();
          }
        }
      });
      setSubscribeFn(subscribe(executeNew));
    },
  };
};
