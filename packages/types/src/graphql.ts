import type {
  DocumentNode,
  GraphQLFieldResolver,
  GraphQLSchema,
  SubscriptionArgs,
  ExecutionArgs,
  GraphQLTypeResolver,
  subscribe,
  execute,
} from 'graphql';
import type { Maybe } from './utils';

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

export type ExecuteFunction = typeof execute;

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

export type SubscribeFunction = typeof subscribe;
