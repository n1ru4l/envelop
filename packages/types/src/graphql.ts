import type {
  DocumentNode,
  GraphQLFieldResolver,
  GraphQLSchema,
  SubscriptionArgs,
  ExecutionArgs,
  GraphQLTypeResolver,
  subscribe,
  execute,
  parse,
  validate,
} from 'graphql';
import type { Maybe } from './utils';

/** @private */
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

/** @private */
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

export type ParseFunction = typeof parse;

export type ValidateFunction = typeof validate;

export type ValidateFunctionParameter = {
  schema: Parameters<ValidateFunction>[0];
  documentAST: Parameters<ValidateFunction>[1];
  rules?: Parameters<ValidateFunction>[2];
  typeInfo?: Parameters<ValidateFunction>[3];
  options?: Parameters<ValidateFunction>[4];
};
