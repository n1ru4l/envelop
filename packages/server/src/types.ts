import Emittery from 'emittery';
import {
  DocumentNode,
  GraphQLSchema,
  Source,
  ParseOptions,
  ValidationRule,
  TypeInfo,
  GraphQLError,
  GraphQLFieldResolver,
  GraphQLTypeResolver,
  ExecutionResult,
  execute,
  ExecutionArgs,
} from 'graphql';
import { processRequest } from 'graphql-helix';
import { ExecutionContext } from 'graphql-helix/dist/types';
import { Maybe } from 'graphql/jsutils/Maybe';

export type AllEvents = {
  onInit: {
    getOriginalSchema: () => GraphQLSchema;
    replaceSchema: (newSchema: GraphQLSchema) => void;
  };
  beforeSchemaReady: {
    getSchema: () => GraphQLSchema;
    getOriginalSchema: () => GraphQLSchema;
    replaceSchema: (newSchema: GraphQLSchema) => void;
  };
  beforeOperationParse: {
    getParams: () => { source: string | Source; options?: ParseOptions };
    setParsedDocument: (doc: DocumentNode) => void;
  };
  afterOperationParse: {
    getParams: () => { source: string | Source; options?: ParseOptions };
    getParsedDocument: () => DocumentNode;
    replaceParsedDocument: (newDocument: DocumentNode) => void;
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
    setValidationErrors: (errors: GraphQLError[]) => void;
  };
  afterValidate: {
    isValid: () => boolean;
    getErrors: () => readonly GraphQLError[];
  };
  beforeExecute: {
    setExecuteFn: (newExecute: typeof execute) => void;
    getOperationId: () => string;
    getExecutionParams: () => ExecutionArgs;
    setDocument: (newDocument: DocumentNode) => void;
    setRootValue: (newRootValue: any) => void;
    setContext: (newContext: any) => void;
    setVariables: (newVariables: any) => void;
  };
  afterExecute: {
    getResult: () => ExecutionResult;
    getOperationId: () => string;
    getExecutionParams: () => ExecutionArgs;
  };
};

export class EventsHandler extends Emittery<AllEvents> {}

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
