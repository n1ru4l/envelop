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

export type BeforeAfterHook<BeforePayload, AfterPayload = unknown, Async = false> = (
  beforeOptions: BeforePayload
) => Async extends true ? Promise<AfterFnOrVoid<AfterPayload>> | AfterFnOrVoid<AfterPayload> : AfterFnOrVoid<AfterPayload>;

export type OnResolverCalledHooks = BeforeAfterHook<
  {
    root: unknown;
    args: Record<string, unknown>;
    context: unknown;
    info: GraphQLResolveInfo;
  },
  { result: unknown | Error },
  true
>;

export type OnExecuteHookResult = {
  onExecuteDone?: (options: { result: ExecutionResult; setResult: (newResult: ExecutionResult) => void }) => void;
  onResolverCalled?: OnResolverCalledHooks;
};

export type OnSubscribeHookResult = {
  onSubscribeResult?: (options: {
    result: AsyncIterableIterator<ExecutionResult> | ExecutionResult;
    setResult: (newResult: AsyncIterableIterator<ExecutionResult> | ExecutionResult) => void;
  }) => void;
  onResolverCalled?: OnResolverCalledHooks;
};

export type DefaultContext = Record<string, unknown>;
export interface Plugin<PluginContext = DefaultContext> {
  onSchemaChange?: (options: { schema: GraphQLSchema; replaceSchema: (newSchema: GraphQLSchema) => void }) => void;
  onPluginInit?: (options: { setSchema: (newSchema: GraphQLSchema) => void }) => void;
  onExecute?: (options: {
    executeFn: typeof execute;
    args: ExecutionArgs;
    setExecuteFn: (newExecute: typeof execute) => void;
    extendContext: (contextExtension: Partial<PluginContext>) => void;
  }) => void | OnExecuteHookResult;
  onSubscribe?: (options: {
    subscribeFn: typeof subscribe;
    args: SubscriptionArgs;
    setSubscribeFn: (newSubscribe: typeof subscribe) => void;
    extendContext: (contextExtension: Partial<PluginContext>) => void;
  }) => void | OnSubscribeHookResult;
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

export type Envelop<RequestContext = unknown> = {
  (): {
    execute: typeof execute;
    validate: typeof validate;
    subscribe: typeof subscribe;
    parse: typeof parse;
    contextFactory: (requestContext: RequestContext) => unknown | Promise<unknown>;
    schema: GraphQLSchema;
  };
  _plugins: Plugin[];
};
