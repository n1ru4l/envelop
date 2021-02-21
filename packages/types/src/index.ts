import * as EE from 'eventemitter3';
import {
  DocumentNode,
  GraphQLSchema,
  Source,
  ParseOptions,
  ValidationRule,
  TypeInfo,
  GraphQLError,
  ExecutionResult,
  execute,
  ExecutionArgs,
  GraphQLFieldResolver,
  GraphQLTypeResolver,
  parse,
  validate,
  subscribe,
} from 'graphql';
import { Maybe } from 'graphql/jsutils/Maybe';
import { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue';
import { ResolversComposerMapping } from '@graphql-tools/resolvers-composition';

export type ExecuteFn = (
  schema: GraphQLSchema,
  document: DocumentNode,
  rootValue?: any,
  contextValue?: any,
  variableValues?: Maybe<{ [key: string]: any }>,
  operationName?: Maybe<string>,
  fieldResolver?: Maybe<GraphQLFieldResolver<any, any>>,
  typeResolver?: Maybe<GraphQLTypeResolver<any, any>>
) => PromiseOrValue<ExecutionResult>;

export type ExecutionParams = ExecutionArgs & {
  isIntrospection: boolean;
};

export type AllEvents = {
  onInit: (support: { getOriginalSchema: () => GraphQLSchema; replaceSchema: (newSchema: GraphQLSchema) => void }) => void;
  beforeSchemaReady: (support: {
    wrapResolvers: (wrapping: ResolversComposerMapping) => void;
    getSchema: () => GraphQLSchema;
    getOriginalSchema: () => GraphQLSchema;
    replaceSchema: (newSchema: GraphQLSchema) => void;
  }) => void;
  beforeOperationParse: (support: {
    getParams: () => { source: string | Source; options?: ParseOptions };
    getParseFn: () => typeof parse;
    setParseFn: (newFn: typeof parse) => void;
    setParsedDocument: (doc: DocumentNode) => void;
  }) => void;
  afterOperationParse: (support: {
    getParams: () => { source: string | Source; options?: ParseOptions };
    getParseResult: () => DocumentNode | Error;
    replaceParseResult: (newDocument: DocumentNode | Error) => void;
  }) => void;
  beforeContextBuilding: (support: {
    extendContext: (obj: unknown) => void;
    getExecutionContext: () => any;
    replaceContext: (currentContext: Record<string, unknown>) => void;
    getCurrentContext: () => Readonly<Record<string, unknown>>;
  }) => void | Promise<void>;
  afterContextBuilding: (support: { getContext: () => Readonly<Record<string, unknown>> }) => void;
  beforeValidate: (support: {
    getValidationParams: () => {
      document: string;
      schema: GraphQLSchema;
      documentAST: DocumentNode;
      rules?: ReadonlyArray<ValidationRule>;
      typeInfo?: TypeInfo;
      options?: { maxErrors?: number };
    };
    getValidationFn(): typeof validate;
    setValidationFn(newValidate: typeof validate): void;
    setValidationErrors: (errors: readonly GraphQLError[]) => void;
  }) => void;
  afterValidate: (support: {
    getValidationParams: () => {
      document: string;
      schema: GraphQLSchema;
      documentAST: DocumentNode;
      rules?: ReadonlyArray<ValidationRule>;
      typeInfo?: TypeInfo;
      options?: { maxErrors?: number };
    };
    isValid: () => boolean;
    getErrors: () => readonly GraphQLError[];
  }) => void;
  beforeExecute: (support: {
    setExecuteFn: (newExecute: ExecuteFn) => void;
    getOperationId: () => string;
    getExecutionParams: () => ExecutionParams;
    setDocument: (newDocument: DocumentNode) => void;
    setRootValue: (newRootValue: any) => void;
    setContext: (newContext: any) => void;
    setVariables: (newVariables: any) => void;
  }) => void;
  afterExecute: (support: { getResult: () => ExecutionResult; getOperationId: () => string; getExecutionParams: () => ExecutionParams }) => void;
  schemaChange: (support: { getSchema: () => GraphQLSchema }) => void;
};

export class EventsHandler extends EE.EventEmitter<AllEvents> {}

export type PluginApi = {
  on: EventsHandler['on'];
};

export type PluginFn = (api: PluginApi) => void | Promise<void>;

export type GraphQLServerOptions<ExecutionParams = unknown, Context = unknown> = {
  execute: typeof execute;
  // subscribe: typeof subscribe;
  validate: typeof validate;
  parse: typeof parse;
  contextFactory: (executionParams: ExecutionParams) => Context | Promise<Context>;
  // rootValueFactory: (executionParams: ExecutionParams) => RootValue | Promise<RootValue>;
  schema: () => GraphQLSchema;
};
