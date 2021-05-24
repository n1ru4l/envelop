/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  DocumentNode,
  GraphQLSchema,
  Source,
  ParseOptions,
  GraphQLError,
  parse,
  validate,
  GraphQLResolveInfo,
  ExecutionArgs,
  ExecutionResult,
  ValidationRule,
  TypeInfo,
  SubscriptionArgs,
  GraphQLFieldResolver,
  GraphQLTypeResolver,
} from 'graphql';
import { Maybe } from 'graphql/jsutils/Maybe';
import { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue';

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

export type ExecuteFunction = (...args: PolymorphicExecuteArguments) => PromiseOrValue<ExecutionResult>;

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
      Maybe<GraphQLFieldResolver<any, any>>?,
      ExecuteFunction?
    ];

export type SubscribeFunction = (
  ...args: PolymorphicSubscribeArguments
) => PromiseOrValue<AsyncIterableIterator<ExecutionResult> | ExecutionResult>;

type AfterFnOrVoid<Result> = void | ((afterOptions: Result) => void);

export type DefaultContext = Record<string, unknown>;
export type DefaultArgs = Record<string, unknown>;

export type BeforeAfterHook<BeforePayload, AfterPayload = unknown, Async = false> = (
  beforeOptions: BeforePayload
) => Async extends true ? Promise<AfterFnOrVoid<AfterPayload>> | AfterFnOrVoid<AfterPayload> : AfterFnOrVoid<AfterPayload>;

export type AfterResolverPayload = { result: unknown | Error; setResult: (newResult: unknown) => void };

export type OnResolverCalledHooks<ContextType = DefaultContext, ArgsType = DefaultArgs> = BeforeAfterHook<
  {
    root: unknown;
    args: ArgsType;
    context: ContextType;
    info: GraphQLResolveInfo;
  },
  AfterResolverPayload,
  true
>;

export type OnExecuteHookResult<ContextType = DefaultContext> = {
  onExecuteDone?: (options: { result: ExecutionResult; setResult: (newResult: ExecutionResult) => void }) => void;
  onResolverCalled?: OnResolverCalledHooks<ContextType>;
};

export type OnSubscribeHookResult<ContextType = DefaultContext> = {
  onSubscribeResult?: (options: {
    result: AsyncIterableIterator<ExecutionResult> | ExecutionResult;
    setResult: (newResult: AsyncIterableIterator<ExecutionResult> | ExecutionResult) => void;
  }) => void;
  onResolverCalled?: OnResolverCalledHooks<ContextType>;
};

export interface Plugin<PluginContext = DefaultContext> {
  onSchemaChange?: (options: { schema: GraphQLSchema; replaceSchema: (newSchema: GraphQLSchema) => void }) => void;
  onPluginInit?: (options: {
    addPlugin: (newPlugin: Plugin<any>) => void;
    plugins: Plugin[];
    setSchema: (newSchema: GraphQLSchema) => void;
  }) => void;
  onExecute?: (options: {
    executeFn: ExecuteFunction;
    args: ExecutionArgs;
    setExecuteFn: (newExecute: ExecuteFunction) => void;
    setResultAndStopExecution: (newResult: ExecutionResult) => void;
    extendContext: (contextExtension: Partial<PluginContext>) => void;
  }) => void | OnExecuteHookResult<PluginContext>;
  onSubscribe?: (options: {
    subscribeFn: SubscribeFunction;
    args: SubscriptionArgs;
    setSubscribeFn: (newSubscribe: SubscribeFunction) => void;
    extendContext: (contextExtension: Partial<PluginContext>) => void;
  }) => void | OnSubscribeHookResult<PluginContext>;
  onParse?: BeforeAfterHook<
    {
      params: { source: string | Source; options?: ParseOptions };
      parseFn: typeof parse;
      setParseFn: (newFn: typeof parse) => void;
      setParsedDocument: (doc: DocumentNode) => void;
    },
    {
      result: DocumentNode | Error | null;
      replaceParseResult: (newResult: DocumentNode | Error) => void;
    },
    false
  >;
  onValidate?: BeforeAfterHook<
    {
      params: {
        schema: GraphQLSchema;
        documentAST: DocumentNode;
        rules?: ReadonlyArray<ValidationRule>;
        typeInfo?: TypeInfo;
        options?: { maxErrors?: number };
      };
      addValidationRule: (rule: ValidationRule) => void;
      validateFn: typeof validate;
      setValidationFn: (newValidate: typeof validate) => void;
      setResult: (errors: readonly GraphQLError[]) => void;
    },
    {
      valid: boolean;
      result: readonly GraphQLError[];
    }
  >;
  onContextBuilding?: BeforeAfterHook<
    {
      context: Readonly<PluginContext>;
      extendContext: (contextExtension: Partial<PluginContext>) => void;
    },
    {
      context: PluginContext;
    },
    true
  >;
}

export type AfterCallback<T extends keyof Plugin<any>> = NonNullable<Plugin[T]> extends BeforeAfterHook<
  infer B,
  infer A,
  infer Async
>
  ? (afterOptions: A) => void
  : never;

export type Envelop<RequestContext = unknown, ExecutionContext = DefaultContext> = {
  (): {
    execute: ExecuteFunction;
    validate: typeof validate;
    subscribe: SubscribeFunction;
    parse: typeof parse;
    contextFactory: (requestContext: RequestContext) => ExecutionContext | Promise<ExecutionContext>;
    schema: GraphQLSchema;
  };
  _plugins: Plugin[];
};
