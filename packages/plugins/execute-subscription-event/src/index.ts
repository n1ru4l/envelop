import { SubscriptionArgs, execute } from 'graphql';
import { Plugin, PromiseOrValue, makeExecute, DefaultContext } from '@envelop/core';
import { subscribe } from './subscribe';

export type ContextFactoryOptions = {
  /** The arguments with which the subscription was set up. */
  args: SubscriptionArgs;
};

export type ContextFactoryHook<TContextValue> = {
  /** Context that will be used for the "ExecuteSubscriptionEvent" phase. */
  contextPartial: Partial<TContextValue>;
  /** Optional callback that is invoked once the "ExecuteSubscriptionEvent" phase has ended. Useful for cleanup, such as tearing down database connections. */
  onEnd?: () => void;
};

export type ContextFactoryType<TContextValue = DefaultContext> = (
  options: ContextFactoryOptions
) => PromiseOrValue<ContextFactoryHook<TContextValue> | void>;

export const useExtendContextValuePerExecuteSubscriptionEvent = <TContextValue = unknown>(
  createContext: ContextFactoryType<TContextValue>
): Plugin<TContextValue> => {
  return {
    onSubscribe({ args, setSubscribeFn }) {
      const executeNew = makeExecute(async executionArgs => {
        const context = await createContext({ args });
        try {
          return await execute({
            ...executionArgs,
            // GraphQL.js 16 changed the type of contextValue to unknown
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            contextValue: { ...executionArgs.contextValue, ...context?.contextPartial },
          });
        } finally {
          context?.onEnd?.();
        }
      });
      setSubscribeFn(subscribe(executeNew));
    },
  };
};
