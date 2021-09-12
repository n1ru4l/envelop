import { makeExecute, Plugin } from '@envelop/core';
import { useExtendedValidation } from '@envelop/extended-validation';
import { GraphQLError } from 'graphql';
import type { OperationComplexityStore } from './operation-complexity-store';
import { OperationComplexityFieldCosts, OperationComplexityValidationRule } from './operation-complexity-validation-rule';

export type useOperationComplexity = {
  /**
   * Store used for storing the consumed budget for each API consumer for subsequent requests.
   * If not provided the budget is applied for each individual request instead of requests over a time period.
   * For production usage it is recommended to use a store.
   * */
  rateLimit?: {
    store: OperationComplexityStore;
    /** Identify the API consumer from the context. */
    identify: (context: object) => string;
  };
  /** The maximum points for each API consumer can have. */
  maximumPoints?: number;
  /** The cost of the selection fo certain fields. */
  queryComplexityFieldCosts?: Partial<OperationComplexityFieldCosts>;
};

export const defaultMaximumBudget = 1000;

export const useOperationComplexity = (params: useOperationComplexity): Plugin => {
  const maximumPoints = params?.maximumPoints ?? defaultMaximumBudget;

  const totalCostMap = new WeakMap<object, number>();

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useExtendedValidation({
          rules: [
            OperationComplexityValidationRule({
              fieldCosts: params?.queryComplexityFieldCosts,
              reportTotalCost: (totalCost, executionArgs) => {
                totalCostMap.set(executionArgs.contextValue, totalCost);
              },
            }),
          ],
        })
      );
    },
    async onExecute({ setExecuteFn, executeFn }) {
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

          const { identify, store } = params.rateLimit;
          const identifier = identify(args.contextValue);
          const currentPoints = await store.get(identifier);

          if (currentPoints + cost > maximumPoints) {
            return {
              errors: [new GraphQLError('Operation complexity exceeds the limit for the current time period.')],
            };
          }

          try {
            return executeFn(args);
          } finally {
            await store.add(identifier, cost);
          }
        })
      );
    },
  };
};
