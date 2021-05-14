import { PolymorphicExecuteArguments, PolymorphicSubscribeArguments, SubscriptionArgs } from '@envelop/types';
import { ExecutionArgs, ExecutionResult } from 'graphql';
import { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue';

export function getExecuteArgs(args: PolymorphicExecuteArguments): ExecutionArgs {
  return args.length === 1
    ? args[0]
    : {
        schema: args[0],
        document: args[1],
        rootValue: args[2],
        contextValue: args[3],
        variableValues: args[4],
        operationName: args[5],
        fieldResolver: args[6],
        typeResolver: args[7],
      };
}

/**
 * Utility function for making a execute function that handles polymorphic arguments.
 */
export const makeExecute = (subscribeFn: (args: ExecutionArgs) => PromiseOrValue<ExecutionResult>) => (
  ...polyArgs: PolymorphicExecuteArguments
): PromiseOrValue<ExecutionResult> => subscribeFn(getExecuteArgs(polyArgs));

export function getSubscribeArgs(args: PolymorphicSubscribeArguments): SubscriptionArgs {
  return args.length === 1
    ? args[0]
    : {
        schema: args[0],
        document: args[1],
        rootValue: args[2],
        contextValue: args[3],
        variableValues: args[4],
        operationName: args[5],
        fieldResolver: args[6],
        subscribeFieldResolver: args[7],
        execute: args[8],
      };
}

/**
 * Utility function for making a subscribe function that handles polymorphic arguments.
 */
export const makeSubscribe = (
  subscribeFn: (args: SubscriptionArgs) => PromiseOrValue<AsyncIterableIterator<ExecutionResult> | ExecutionResult>
) => (...polyArgs: PolymorphicSubscribeArguments): PromiseOrValue<AsyncIterableIterator<ExecutionResult> | ExecutionResult> =>
  subscribeFn(getSubscribeArgs(polyArgs));
