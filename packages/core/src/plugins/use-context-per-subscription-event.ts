import { Plugin, SubscriptionArgs, PolymorphicExecuteArguments } from '@envelop/types';

import { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue';
import { getExecuteArgs } from '../util';

type ContextFactoryOptions = {
  /** The arguments with which the subscription was set up. */
  args: SubscriptionArgs;
};
type ContextFactoryHook<TContextValue> = {
  /** Context that will be used for the "ExecuteSubscriptionEvent" phase. */
  contextValue: TContextValue;
  /** Optional callback that is invoked once the "ExecuteSubscriptionEvent" phase has ended. Useful for cleanup, such as tearing down database connections. */
  onEnd?: () => void;
};
type ContextFactoryType<TContextValue = unknown> = (
  options: ContextFactoryOptions
) => PromiseOrValue<ContextFactoryHook<TContextValue> | void>;

export const useCreateContextPerSubscriptionEvent = <TContextValue = unknown>(
  createContext: ContextFactoryType<TContextValue>
): Plugin => {
  return {
    onSubscribe({ args }) {
      return {
        onExecuteSubscriptionEvent({ executeFn, setExecuteFn }) {
          const newExecute = async (..._executionArgs: PolymorphicExecuteArguments) => {
            const executionArgs = getExecuteArgs(_executionArgs);
            const context = await createContext({ args });
            try {
              return executeFn({
                ...executionArgs,
                contextValue: context ? context.contextValue : executionArgs.contextValue,
              });
            } finally {
              if (context && context.onEnd) {
                context.onEnd();
              }
            }
          };
          setExecuteFn(newExecute);
        },
      };
    },
  };
};
