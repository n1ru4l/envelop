import type { DocumentNode, GraphQLFieldResolver, GraphQLSchema, SubscriptionArgs, ExecutionResult } from 'graphql';
import type { Maybe, PromiseOrValue, AsyncIterableIteratorOrValue } from './utils';

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
