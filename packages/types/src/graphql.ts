import type {
  DocumentNode,
  GraphQLFieldResolver,
  GraphQLSchema,
  SubscriptionArgs,
  ExecutionResult,
  ExecutionArgs,
  GraphQLTypeResolver,
} from 'graphql';
import type { Maybe, PromiseOrValue, AsyncIterableIteratorOrValue } from './utils';

export type PolymorphicExecuteArguments =
  | [ExecutionArgs]
  | [
      GraphQLSchema,
      DocumentNode,
      any,
      any,
      Maybe<{ [key: string]: any }>,
      Maybe<string>,
      Maybe<GraphQLFieldResolver<any, any>>,
      Maybe<GraphQLTypeResolver<any, any>>
    ];

export type ExecuteFunction = (
  ...args: PolymorphicExecuteArguments
) => PromiseOrValue<AsyncIterableIteratorOrValue<ExecutionResult>>;

export type PolymorphicSubscribeArguments =
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

export type SubscribeFunction = (
  ...args: PolymorphicSubscribeArguments
) => PromiseOrValue<AsyncIterableIteratorOrValue<ExecutionResult>>;
