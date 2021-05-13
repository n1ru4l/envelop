import { Plugin } from '@envelop/types';
import {
  ExecutionResult,
  execute as defaultExecute,
  SubscriptionArgs,
  createSourceEventStream,
  GraphQLSchema,
  DocumentNode,
  GraphQLFieldResolver,
  ExecutionArgs,
} from 'graphql';
import mapAsyncIterator from 'graphql/subscription/mapAsyncIterator';
import isAsyncIterable from 'graphql/jsutils/isAsyncIterable';
import { Maybe } from 'graphql/jsutils/Maybe';
import { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue';

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

type PolyMorphicSubscribeArguments =
  | [SubscriptionArgs]
  | [
      GraphQLSchema,
      DocumentNode,
      any?,
      any?,
      Maybe<{ [key: string]: any }>?,
      Maybe<string>?,
      Maybe<GraphQLFieldResolver<any, any>>?,
      Maybe<GraphQLFieldResolver<any, any>>?
    ];

function getArgs(args: PolyMorphicSubscribeArguments): SubscriptionArgs {
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
 * This is a almost identical port from graphql-js subscribe.
 * The difference is the polymorphic argument handling and
 * the possibility for injecting a custom `execute` function.
 */
const createSubscribe = (
  makeExecute: (subscriptionArgs: SubscriptionArgs) => (args: ExecutionArgs) => PromiseOrValue<ExecutionResult>
) =>
  async function subscribe(
    ...polyArgs: PolyMorphicSubscribeArguments
  ): Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult> {
    const args = getArgs(polyArgs);
    const {
      schema,
      document,
      rootValue,
      contextValue,
      variableValues,
      operationName,
      fieldResolver,
      subscribeFieldResolver,
    } = args;

    const resultOrStream = await createSourceEventStream(
      schema,
      document,
      rootValue,
      contextValue,
      variableValues ?? undefined,
      operationName,
      subscribeFieldResolver
    );

    if (!isAsyncIterable(resultOrStream)) {
      return resultOrStream;
    }

    const execute = makeExecute(args);

    // For each payload yielded from a subscription, map it over the normal
    // GraphQL `execute` function, with `payload` as the rootValue.
    // This implements the "MapSourceToResponseEvent" algorithm described in
    // the GraphQL specification. The `execute` function provides the
    // "ExecuteSubscriptionEvent" algorithm, as it is nearly identical to the
    // "ExecuteQuery" algorithm, for which `execute` is also used.
    const mapSourceToResponse = async (payload: object) =>
      execute({
        schema,
        document,
        rootValue: payload,
        contextValue,
        variableValues,
        operationName,
        fieldResolver,
      });

    // Map every source value to a ExecutionResult value as described above.
    return mapAsyncIterator(resultOrStream, mapSourceToResponse);
  };

const executeWithContextFactory = <TContextValue = unknown>(createContext: ContextFactoryType<TContextValue>) => (
  subscriptionArgs: SubscriptionArgs
) => async (args: ExecutionArgs): Promise<ExecutionResult> => {
  const result = await createContext({ args: subscriptionArgs });
  try {
    return defaultExecute({
      ...args,
      contextValue: result ? result.contextValue : args.contextValue,
    });
  } finally {
    if (result && result.onEnd) {
      result.onEnd();
    }
  }
};

export const useContextPerSubscriptionValue = <TContextValue = unknown>(
  createContext: ContextFactoryType<TContextValue>
): Plugin => {
  return {
    onSubscribe({ setSubscribeFn }) {
      setSubscribeFn(createSubscribe(executeWithContextFactory(createContext)));
    },
  };
};
