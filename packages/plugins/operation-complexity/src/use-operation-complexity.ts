import { DefaultContext, makeExecute, Plugin } from '@envelop/core';
import { useExtendedValidation } from '@envelop/extended-validation';
import { GraphQLError } from 'graphql';
import { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue';
import type { OperationComplexityStore } from './operation-complexity-store';
import {
  fieldCostsSymbol,
  OperationComplexityFieldCosts,
  OperationComplexityValidationRule,
} from './operation-complexity-validation-rule';

export type OperationComplexityRateLimitOptions = {
  /** The store that should be used for persisting the rate-limit information. */
  store: OperationComplexityStore;
  /** String that uniquely identifies the client for subsequent executions. */
  sessionId: string;
  /** The maximum cost a consumer can reach in a period before being rate limited and subsequent operations will be rejected. */
  maximumPeriodCost?: number;
};

export type UseOperationComplexityConfig = {
  /** The maximum cost a operation can have before being rejected. */
  maximumOperationCost?: number;
  /** The cost of the selection fo certain fields. */
  queryComplexityFieldCosts?: Partial<OperationComplexityFieldCosts>;
  /**
   * Config for determining whether rate limiting should be applied.
   * For production usage using rate limiting is recommended.
   * */
  rateLimit?: OperationComplexityRateLimitOptions;
};

export const defaultMaximumBudget = 1000;

export const useOperationComplexity = <Context = DefaultContext>(
  config: UseOperationComplexityConfig | ((context: DefaultContext) => PromiseOrValue<UseOperationComplexityConfig>)
): Plugin<Context> => {
  const totalCostMap = new WeakMap<object, number>();

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useExtendedValidation({
          rules: [
            OperationComplexityValidationRule({
              reportTotalCost: (totalCost, executionArgs) => {
                totalCostMap.set(executionArgs.contextValue, totalCost);
              },
            }),
          ],
        })
      );
    },
    async onExecute({ args, setExecuteFn, executeFn }) {
      const params = typeof config === 'function' ? await config(args.contextValue as DefaultContext) : config;
      const maximumPoints = params?.maximumOperationCost ?? defaultMaximumBudget;
      args.contextValue[fieldCostsSymbol] = params.queryComplexityFieldCosts;

      setExecuteFn(
        makeExecute(async args => {
          const cost = totalCostMap.get(args.contextValue);

          if (cost === undefined) {
            // eslint-disable-next-line no-console
            console.warn('[useOperationComplexity] Failed resolving the cost of the operation.');
            return executeFn(args);
          }

          // If we dont have a rate limit store we treat the current
          if (params.rateLimit === undefined) {
            if (cost > maximumPoints) {
              return {
                errors: [new GraphQLError('Operation complexity exceeds the limit.')],
              };
            }
            return executeFn(args);
          }

          const currentPoints = await params.rateLimit.store.get(params.rateLimit.sessionId);
          const maximumRateLimitPoints = params.rateLimit.maximumPeriodCost ?? defaultMaximumBudget;

          if (currentPoints + cost > maximumRateLimitPoints) {
            return {
              errors: [new GraphQLError('Operation complexity exceeds the limit for the current time period.')],
            };
          }

          try {
            return executeFn(args);
          } finally {
            await params.rateLimit.store.add(params.rateLimit.sessionId, cost);
          }
        })
      );
    },
  };
};
