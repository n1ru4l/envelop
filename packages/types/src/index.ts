import {
  DocumentNode,
  GraphQLSchema,
  Source,
  ParseOptions,
  GraphQLError,
  execute,
  parse,
  validate,
  GraphQLResolveInfo,
  ExecutionArgs,
  ExecutionResult,
  ValidationRule,
  TypeInfo,
  subscribe,
  SubscriptionArgs,
} from 'graphql';

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
  onPluginInit?: (options: { setSchema: (newSchema: GraphQLSchema) => void }) => void;
  onExecute?: (options: {
    executeFn: typeof execute;
    args: ExecutionArgs;
    setExecuteFn: (newExecute: typeof execute) => void;
    setResultAndStopExecution: (newResult: ExecutionResult) => void;
    extendContext: (contextExtension: Partial<PluginContext>) => void;
  }) => void | OnExecuteHookResult<PluginContext>;
  onSubscribe?: (options: {
    subscribeFn: typeof subscribe;
    args: SubscriptionArgs;
    setSubscribeFn: (newSubscribe: typeof subscribe) => void;
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
      result: DocumentNode | Error;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type AfterCallback<T extends keyof Plugin> = Plugin[T] extends BeforeAfterHook<infer B, infer A, infer Async>
  ? (afterOptions: A) => void
  : never;

export type Envelop<RequestContext = unknown, ExecutionContext = DefaultContext> = {
  (): {
    execute: typeof execute;
    validate: typeof validate;
    subscribe: typeof subscribe;
    parse: typeof parse;
    contextFactory: (requestContext: RequestContext) => ExecutionContext | Promise<ExecutionContext>;
    schema: GraphQLSchema;
  };
  _plugins: Plugin[];
};
