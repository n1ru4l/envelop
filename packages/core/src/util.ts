import { PolymorphicExecuteArguments, PolymorphicSubscribeArguments } from '@envelop/types';
import { ExecutionArgs, ExecutionResult, SubscriptionArgs } from 'graphql';
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
export const makeExecute =
  (executeFn: (args: ExecutionArgs) => PromiseOrValue<ExecutionResult | AsyncIterableIterator<ExecutionResult>>) =>
  (...polyArgs: PolymorphicExecuteArguments): PromiseOrValue<ExecutionResult | AsyncIterableIterator<ExecutionResult>> =>
    executeFn(getExecuteArgs(polyArgs));

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
      };
}

/**
 * Utility function for making a subscribe function that handles polymorphic arguments.
 */
export const makeSubscribe =
  (subscribeFn: (args: SubscriptionArgs) => PromiseOrValue<AsyncIterableIterator<ExecutionResult> | ExecutionResult>) =>
  (...polyArgs: PolymorphicSubscribeArguments): PromiseOrValue<AsyncIterableIterator<ExecutionResult> | ExecutionResult> =>
    subscribeFn(getSubscribeArgs(polyArgs));

export async function* mapAsyncIterator<TInput, TOutput = TInput>(
  asyncIterable: AsyncIterableIterator<TInput>,
  map: (input: TInput) => Promise<TOutput> | TOutput
): AsyncIterableIterator<TOutput> {
  for await (const value of asyncIterable) {
    yield map(value);
  }
}

export async function* finalAsyncIterator<TInput>(
  asyncIterable: AsyncIterableIterator<TInput>,
  onFinal: () => void
): AsyncIterableIterator<TInput> {
  try {
    yield* asyncIterable;
  } finally {
    onFinal();
  }
}
