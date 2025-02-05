import {
  ExecuteFunction,
  ExecutionArgs,
  ExecutionResult,
  IncrementalExecutionResult,
  ParseFunction,
  SubscribeFunction,
  ValidateFunction,
  ValidateFunctionParameter,
} from './graphql.js';
import { Plugin } from './plugin.js';
import { AsyncIterableIteratorOrValue, Maybe, PromiseOrValue } from './utils.js';

export type EnvelopData = {
  forOperation: object;
};

export type DefaultArgs = Record<string, unknown>;

export type SetSchemaFn = (newSchema: any) => void;

/**
 * The payload forwarded to the onSchemaChange hook.
 */
export type OnSchemaChangeEventPayload = { schema: any; replaceSchema: SetSchemaFn };

/**
 * Invoked each time the schema is changed via a setSchema call.
 */
export type OnSchemaChangeHook = (options: OnSchemaChangeEventPayload) => void;

export type OnContextErrorHandlerPayload<Data> = {
  /**
   * The context object at the "last working" state
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  context: Readonly<Record<string, unknown>>;
  /** The error or thing that got rejected or thrown */
  error: unknown;
  /** Overwrite the error or thing that got rejected or thrown. */
  setError: (err: unknown) => void;
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

export type OnContextErrorHandler<Data extends EnvelopData = EnvelopData> = (
  payload: OnContextErrorHandlerPayload<Data>,
) => PromiseOrValue<void>;

export type RegisterContextErrorHandler<Data extends EnvelopData = EnvelopData> = (
  handler: OnContextErrorHandler<Data>,
) => void;

/**
 * Payload forwarded to the onPluginInit hook.
 */
export type OnPluginInitEventPayload<
  PluginContext extends Record<string, any>,
  Data extends EnvelopData = EnvelopData,
> = {
  /**
   * Register a new plugin.
   */
  addPlugin: (newPlugin: Plugin<PluginContext>) => void;
  /**
   * A list of all currently active plugins.
   */
  plugins: Plugin<PluginContext>[];
  /**
   * Set the GraphQL schema.
   */
  setSchema: SetSchemaFn;
  /**
   * Register an error handler used for context creation.
   */
  registerContextErrorHandler: RegisterContextErrorHandler<Data>;
};

/**
 * Invoked when a plugin is initialized.
 */
export type OnPluginInitHook<
  ContextType extends Record<string, any>,
  Data extends EnvelopData = EnvelopData,
> = (payload: OnPluginInitEventPayload<ContextType, Data>) => void;

/** onPluginInit */
export type OnEnvelopedHookEventPayload<ContextType, Data extends EnvelopData = EnvelopData> = {
  /**
   * Set the schema that should be used for execution.
   */
  setSchema: SetSchemaFn;
  /**
   * The context object.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  context: Readonly<Maybe<ContextType>>;
  /**
   * Extend the context object with a partial.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

export type OnEnvelopedHook<ContextType, Data extends EnvelopData = EnvelopData> = (
  options: OnEnvelopedHookEventPayload<ContextType, Data>,
) => void;

export type OnParseEventPayload<ContextType, Data extends EnvelopData = EnvelopData> = {
  /**
   * The current context object.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  context: Readonly<ContextType>;
  /**
   * Extend the context object with a partial.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
  /**
   * The parameters that are passed to the parse call.
   */
  params: { source: string | any; options?: any };
  /**
   * The current parse function
   */
  parseFn: ParseFunction;
  /**
   * Replace the current parse function
   */
  setParseFn: (newFn: ParseFunction) => void;
  /**
   * Set/overwrite the parsed document.
   * If a parsed document is set the call to the parseFn will be skipped.
   */
  setParsedDocument: (doc: any) => void;
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

export type AfterParseEventPayload<ContextType, Data extends EnvelopData = EnvelopData> = {
  /**
   * The current context object.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  context: Readonly<ContextType>;
  /**
   * Extend the context object with a partial.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
  /**
   * The result of the parse phase.
   */
  result: any | Error | null;
  /**
   * Replace the parse result with a new result.
   */
  replaceParseResult: (newResult: any | Error) => void;
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

/**
 * Hook that is invoked after the parse function has been invoked.
 */
export type AfterParseHook<ContextType, Data extends EnvelopData = EnvelopData> = (
  payload: AfterParseEventPayload<ContextType, Data>,
) => void;
/**
 * Hook that is invoked before the parse function is invoked.
 */
export type OnParseHook<ContextType, Data extends EnvelopData = EnvelopData> = (
  payload: OnParseEventPayload<ContextType, Data>,
) => void | AfterParseHook<ContextType, Data>;
/**
 * Payload forwarded to the onValidate hook.
 */
export type OnValidateEventPayload<ContextType, Data extends EnvelopData = EnvelopData> = {
  /**
   * The current context object.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  context: Readonly<ContextType>;
  /**
   * Extend the context object with a partial.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
  /**
   * The parameters with which the validate function will be invoked.
   */
  params: ValidateFunctionParameter;
  /**
   * Register a validation rule that will be used for the validate invocation.
   */
  addValidationRule: (rule: any) => void;
  /**
   * The current validate function that will be invoked.
   */
  validateFn: ValidateFunction;
  /**
   * Overwrite the current validate function.
   */
  setValidationFn: (newValidate: ValidateFunction) => void;
  /**
   * Set a validation error result and skip the validate invocation.
   */
  setResult: (errors: readonly any[]) => void;
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

/**
 * Payload forwarded to the afterValidate hook.
 */
export type AfterValidateEventPayload<ContextType, Data extends EnvelopData = EnvelopData> = {
  /**
   * The current context object.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  context: Readonly<ContextType>;
  /**
   * Extend the context object with a partial.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
  /**
   * Whether the validation raised any errors or not.
   */
  valid: boolean;
  /**
   * An array of errors that were raised during the validation phase.
   * The array is empty if no errors were raised.
   */
  result: readonly Error[] | any[];
  /**
   * Replace the current error result with a new one.
   */
  setResult: (errors: Error[] | any[]) => void;
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

/**
 * AfterValidateHook is invoked after the validate function has been invoked.
 */
export type AfterValidateHook<ContextType, Data extends EnvelopData = EnvelopData> = (
  payload: AfterValidateEventPayload<ContextType, Data>,
) => void;

/**
 * The OnValidateHook is invoked before the validate function has been invoked.
 */
export type OnValidateHook<ContextType, Data extends EnvelopData = EnvelopData> = (
  payload: OnValidateEventPayload<ContextType, Data>,
) => void | AfterValidateHook<ContextType, Data>;

/**
 * The payload forwarded to the onContextBuilding hook.
 */
export type OnContextBuildingEventPayload<ContextType, Data extends EnvelopData = EnvelopData> = {
  /**
   * The current context object.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  context: Readonly<ContextType>;
  /**
   * Extend the context object with a partial.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
  /**
   * Prevent calls on any further context building hooks.
   */
  breakContextBuilding: () => void;
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

/**
 * The payload forwarded to the afterContextBuilding hook.
 */
export type AfterContextBuildingEventPayload<
  ContextType,
  Data extends EnvelopData = EnvelopData,
> = {
  /**
   * The current context object.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  context: ContextType;
  /**
   * Extend the context object with a partial.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

/**
 * Invoked after the context has been builded.
 */
export type AfterContextBuildingHook<ContextType, Data extends EnvelopData = EnvelopData> = (
  payload: AfterContextBuildingEventPayload<ContextType, Data>,
) => PromiseOrValue<void>;

/**
 * Invoked before the context has been builded.
 * Return a AfterContextBuildingHook, which is invoked after the context building has been finished.
 */
export type OnContextBuildingHook<ContextType, Data extends EnvelopData = EnvelopData> = (
  payload: OnContextBuildingEventPayload<ContextType, Data>,
) => PromiseOrValue<void | AfterContextBuildingHook<ContextType, Data>>;

/**
 * Execution arguments with inferred context value type.
 */
export type TypedExecutionArgs<ContextType> = Omit<ExecutionArgs, 'contextValue'> & {
  contextValue: ContextType;
};

/**
 * Payload that is passed to the onExecute hook.
 */
export type OnExecuteEventPayload<ContextType, Data extends EnvelopData = EnvelopData> = {
  /**
   * Current execute function that will be used for execution.
   */
  executeFn: ExecuteFunction;
  /**
   * Arguments the execute function will be invoked with.
   */
  args: TypedExecutionArgs<ContextType>;
  /**
   * Replace the current execute function with a new one.
   */
  setExecuteFn: (newExecute: ExecuteFunction) => void;
  /**
   * Set a execution result and skip calling the execute function.
   */
  setResultAndStopExecution: (newResult: ExecutionResult) => void;
  /**
   * Extend the context object with a partial.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

/**
 * Payload that is passed to the onExecuteDone hook.
 */
export type OnExecuteDoneHookResultOnNextHookPayload<
  ContextType,
  Data extends EnvelopData = EnvelopData,
> = {
  /**
   * The execution arguments.
   */
  args: TypedExecutionArgs<ContextType>;
  /**
   * The execution result.
   */
  result: IncrementalExecutionResult | ExecutionResult;
  /**
   * Replace the execution result with a new execution result.
   */
  setResult: (newResult: ExecutionResult) => void;
  data: Data;
};

/**
 * Hook that is invoked for each value a AsyncIterable returned from execute publishes.
 */
export type OnExecuteDoneHookResultOnNextHook<
  ContextType,
  Data extends EnvelopData = EnvelopData,
> = (payload: OnExecuteDoneHookResultOnNextHookPayload<ContextType, Data>) => void | Promise<void>;

type OnExecuteDoneHookResultOnEndHookPayload<Data extends EnvelopData = EnvelopData> = {
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

/**
 * Hook that is invoked after a AsyncIterable returned from execute completes.
 */
export type OnExecuteDoneHookResultOnEndHook<Data extends EnvelopData = EnvelopData> = (
  payload: OnExecuteDoneHookResultOnEndHookPayload<Data>,
) => void;

/**
 * Hook for hooking into AsyncIterables returned from execute.
 */
export type OnExecuteDoneHookResult<ContextType, Data extends EnvelopData = EnvelopData> = {
  /**
   * Hook that is invoked for each value a AsyncIterable returned from execute publishes.
   */
  onNext?: OnExecuteDoneHookResultOnNextHook<ContextType, Data>;
  /**
   * Hook that is invoked after a AsyncIterable returned from execute completes.
   */
  onEnd?: OnExecuteDoneHookResultOnEndHook<Data>;
};

/**
 * Payload with which the onExecuteDone hook is invoked.
 */
export type OnExecuteDoneEventPayload<ContextType, Data extends EnvelopData = EnvelopData> = {
  /**
   * The execution arguments.
   */
  args: TypedExecutionArgs<ContextType>;
  /**
   * The execution result returned from the execute function.
   * Can return an AsyncIterable if a graphql.js that has defer/stream implemented is used.
   */
  result: AsyncIterableIteratorOrValue<ExecutionResult>;
  /**
   * Replace the execution result with a new execution result.
   */
  setResult: (newResult: AsyncIterableIteratorOrValue<ExecutionResult>) => void;
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

/**
 * Hook that is invoked after the execute function has been invoked.
 * Allows returning a OnExecuteDoneHookResult for hooking into stream values if execute returned an AsyncIterable.
 */
export type OnExecuteDoneHook<ContextType, Data extends EnvelopData = EnvelopData> = (
  payload: OnExecuteDoneEventPayload<ContextType, Data>,
) => PromiseOrValue<void | OnExecuteDoneHookResult<ContextType, Data>>;

/**
 * Result returned from the onExecute hook result for hooking into subsequent phases.
 */
export type OnExecuteHookResult<ContextType, Data extends EnvelopData = EnvelopData> = {
  /**
   * Invoked with the execution result returned from execute.
   */
  onExecuteDone?: OnExecuteDoneHook<ContextType, Data>;
};

/**
 * onExecute hook that is invoked before the execute function is invoked.
 */
export type OnExecuteHook<ContextType, Data extends EnvelopData = EnvelopData> = (
  payload: OnExecuteEventPayload<ContextType, Data>,
) => PromiseOrValue<void | OnExecuteHookResult<ContextType, Data>>;

/**
 * Subscription arguments with inferred context value type.
 */
export type TypedSubscriptionArgs<ContextType> = Omit<ExecutionArgs, 'contextValue'> & {
  contextValue: ContextType;
};

/**
 * Payload with which the onSubscribe hook is invoked.
 */
export type OnSubscribeEventPayload<ContextType, Data extends EnvelopData = EnvelopData> = {
  /**
   * Current subscribe function that will be used for setting up the subscription.
   */
  subscribeFn: SubscribeFunction;
  /**
   * Current arguments with which the subscribe function will be invoked.
   */
  args: TypedSubscriptionArgs<ContextType>;
  /**
   * Replace the current subscribe function with a new one that will be used for setting up the subscription.
   */
  setSubscribeFn: (newSubscribe: SubscribeFunction) => void;
  /**
   * Extend the context object with a partial.
   *
   * Note: This context should be used to share data with resolvers. To share data between hooks,
   * please use `data` instead.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
  /**
   * Set a subscribe result and skip calling the subscribe function.
   */
  setResultAndStopExecution: (newResult: AsyncIterableIteratorOrValue<ExecutionResult>) => void;
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

/**
 * Payload with which the onSubscribeResult hook is invoked.
 */
export type OnSubscribeResultEventPayload<ContextType, Data extends EnvelopData = EnvelopData> = {
  /**
   * The execution arguments.
   */
  args: TypedExecutionArgs<ContextType>;
  /**
   * The current execution result.
   */
  result: AsyncIterableIteratorOrValue<ExecutionResult>;
  /**
   * Replace the current execution result with a new execution result.
   */
  setResult: (newResult: AsyncIterableIteratorOrValue<ExecutionResult>) => void;
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

export type OnSubscribeResultResultOnNextHookPayload<
  ContextType,
  Data extends EnvelopData = EnvelopData,
> = {
  /**
   * The execution arguments.
   */
  args: TypedExecutionArgs<ContextType>;
  /**
   * The current execution result.
   */
  result: ExecutionResult;
  /**
   * Replace the current execution result with a new execution result.
   */
  setResult: (newResult: ExecutionResult) => void;
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

/**
 * Hook invoked for each value published by the AsyncIterable returned from subscribe.
 */
export type OnSubscribeResultResultOnNextHook<
  ContextType,
  Data extends EnvelopData = EnvelopData,
> = (payload: OnSubscribeResultResultOnNextHookPayload<ContextType, Data>) => void | Promise<void>;

export type OnSubscribeResultResultOnEndHookPayload<Data extends EnvelopData = EnvelopData> = {
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};
/**
 * Hook invoked after the AsyncIterable returned from subscribe completes.
 */
export type OnSubscribeResultResultOnEndHook<Data extends EnvelopData = EnvelopData> = (
  payload: OnSubscribeResultResultOnEndHookPayload<Data>,
) => void;

export type OnSubscribeResultResult<ContextType, Data extends EnvelopData = EnvelopData> = {
  /**
   * Invoked for each value published by the AsyncIterable returned from subscribe.
   */
  onNext?: OnSubscribeResultResultOnNextHook<ContextType, Data>;
  /**
   * Invoked after the AsyncIterable returned from subscribe completes.
   */
  onEnd?: OnSubscribeResultResultOnEndHook<Data>;
};

/**
 * Hook that is invoked with the result of the subscribe call.
 * Return a OnSubscribeResultResult for hooking into the AsyncIterable returned from subscribe.
 */
export type SubscribeResultHook<ContextType, Data extends EnvelopData = EnvelopData> = (
  payload: OnSubscribeResultEventPayload<ContextType, Data>,
) => void | OnSubscribeResultResult<ContextType, Data>;

export type SubscribeErrorHookPayload<Data extends EnvelopData = EnvelopData> = {
  error: unknown;
  setError: (err: unknown) => void;
  /**
   * An object to store data shared between hooks.
   * This object is private to your plugin.
   * A new data object is created for each graphql operation.
   *
   * This is the recommended way to share data between hooks of the same plugin.
   */
  data: Data;
};

export type SubscribeErrorHook<Data extends EnvelopData = EnvelopData> = (
  payload: SubscribeErrorHookPayload<Data>,
) => void;

export type OnSubscribeHookResult<ContextType, Data extends EnvelopData = EnvelopData> = {
  /**
   * Invoked with the result returned from subscribe.
   */
  onSubscribeResult?: SubscribeResultHook<ContextType, Data>;
  /**
   * Invoked if the source stream returned from subscribe throws an error.
   */
  onSubscribeError?: SubscribeErrorHook<Data>;
};

/**
 * onSubscribe hook that is invoked before the subscribe function is called.
 * Return a OnSubscribeHookResult for hooking into phase after the subscribe function has been called.
 */
export type OnSubscribeHook<ContextType, Data extends EnvelopData = EnvelopData> = (
  payload: OnSubscribeEventPayload<ContextType, Data>,
) => PromiseOrValue<void | OnSubscribeHookResult<ContextType, Data>>;
