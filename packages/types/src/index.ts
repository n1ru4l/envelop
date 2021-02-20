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
} from 'graphql';
import { processRequest } from 'graphql-helix';
import { ExecutionContext } from 'graphql-helix/dist/types';
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
  onInit: {
    getOriginalSchema: () => GraphQLSchema;
    replaceSchema: (newSchema: GraphQLSchema) => void;
  };
  beforeSchemaReady: {
    wrapResolvers: (wrapping: ResolversComposerMapping) => void;
    getSchema: () => GraphQLSchema;
    getOriginalSchema: () => GraphQLSchema;
    replaceSchema: (newSchema: GraphQLSchema) => void;
  };
  beforeOperationParse: {
    getParams: () => { source: string | Source; options?: ParseOptions };
    getParseFn: () => typeof parse;
    setParseFn: (newFn: typeof parse) => void;
    setParsedDocument: (doc: DocumentNode) => void;
  };
  afterOperationParse: {
    getParams: () => { source: string | Source; options?: ParseOptions };
    getParseResult: () => DocumentNode | Error;
    replaceParseResult: (newDocument: DocumentNode | Error) => void;
  };
  beforeContextBuilding: {
    getExecutionContext: () => ExecutionContext;
    replaceContext: (currentContext: Record<string, unknown>) => void;
    getCurrentContext: () => Readonly<Record<string, unknown>>;
  };
  afterContextBuilding: {
    getContext: () => Readonly<Record<string, unknown>>;
  };
  beforeValidate: {
    getValidationParams: () => {
      schema: GraphQLSchema;
      documentAST: DocumentNode;
      rules?: ReadonlyArray<ValidationRule>;
      typeInfo?: TypeInfo;
      options?: { maxErrors?: number };
    };
    getValidationFn(): typeof validate;
    setValidationFn(newValidate: typeof validate): void;
    setValidationErrors: (errors: GraphQLError[]) => void;
  };
  afterValidate: {
    isValid: () => boolean;
    getErrors: () => readonly GraphQLError[];
  };
  beforeExecute: {
    setExecuteFn: (newExecute: ExecuteFn) => void;
    getOperationId: () => string;
    getExecutionParams: () => ExecutionParams;
    setDocument: (newDocument: DocumentNode) => void;
    setRootValue: (newRootValue: any) => void;
    setContext: (newContext: any) => void;
    setVariables: (newVariables: any) => void;
  };
  afterExecute: {
    getResult: () => ExecutionResult;
    getOperationId: () => string;
    getExecutionParams: () => ExecutionParams;
  };
};

export class EventsHandler extends EE.EventEmitter<AllEvents> {}

export type PluginApi = {
  on: EventsHandler['on'];
};

export type PluginFn = (api: PluginApi) => void | Promise<void>;

export type ServerProxy = Pick<
  Parameters<typeof processRequest>[0],
  'contextFactory' | 'formatPayload' | 'parse' | 'rootValueFactory' | 'subscribe' | 'validate' | 'schema'
> & {
  execute: typeof execute;
};
