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
  /**
   * GraphQL schema instance.
   */
  schema: Parameters<ValidateFunction>[0];
  /**
   * Parsed document node.
   */
  documentAST: Parameters<ValidateFunction>[1];
  /**
   * The rules used for validation.
   * validate uses specifiedRules as exported by the GraphQL module if this parameter is undefined.
   */
  rules?: Parameters<ValidateFunction>[2];
  /**
   * TypeInfo instance which is used for getting schema information during validation
   */
  typeInfo?: Parameters<ValidateFunction>[3];
  options?: Parameters<ValidateFunction>[4];
};
