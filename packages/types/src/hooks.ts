import type {
  DocumentNode,
  ExecutionArgs,
  ExecutionResult,
  GraphQLError,
  GraphQLResolveInfo,
  GraphQLSchema,
  ParseOptions,
  Source,
  SubscriptionArgs,
  TypeInfo,
  validate,
  ValidationRule,
} from 'graphql';
import { Maybe } from 'graphql/jsutils/Maybe';
import { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue';
import { DefaultContext } from './context-types';
import {
  AsyncIterableIteratorOrValue,
  ExecuteFunction,
  ParseFunction,
  ValidateFunction,
  ValidateFunctionParameter,
} from '@envelop/core';
import { SubscribeFunction } from './graphql';
import { Plugin } from './plugin';

export type DefaultArgs = Record<string, unknown>;

export type SetSchemaFn = (newSchema: GraphQLSchema) => void;

/**
 * The payload forwarded to the onSchemaChange hook.
 */
export type OnSchemaChangeEventPayload = { schema: GraphQLSchema; replaceSchema: SetSchemaFn };

/**
 * Invoked each time the schema is changed via a setSchema call.
 */
export type OnSchemaChangeHook = (options: OnSchemaChangeEventPayload) => void;

/**
 * Payload forwarded to the onPluginInit hook.
 */
export type OnPluginInitEventPayload = {
  /**
   * Register a new plugin.
   */
  addPlugin: (newPlugin: Plugin<any>) => void;
  /**
   * A list of all currently active plugins.
   */
  plugins: Plugin<any>[];
  /**
   * Set the GraphQL schema.
   */
  setSchema: SetSchemaFn;
};

/**
 * Invoked when a plugin is initialized.
 */
export type OnPluginInitHook = (options: OnPluginInitEventPayload) => void;

/** onPluginInit */
export type OnEnvelopedHookEventPayload<ContextType> = {
  /**
   * Set the schema that should be used for execution.
   */
  setSchema: SetSchemaFn;
  /**
   * The context object.
   */
  context: Readonly<Maybe<ContextType>>;
  /**
   * Extend the context object with a partial.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
};

export type OnEnvelopedHook<ContextType> = (options: OnEnvelopedHookEventPayload<ContextType>) => void;

export type OnParseEventPayload<ContextType> = {
  /**
   * The current context object.
   */
  context: Readonly<ContextType>;
  /**
   * Extend the context object with a partial.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
  /**
   * The parameters that are passed to the parse call.
   */
  params: { source: string | Source; options?: ParseOptions };
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
  setParsedDocument: (doc: DocumentNode) => void;
};

export type AfterParseEventPayload<ContextType> = {
  /**
   * The current context object.
   */
  context: Readonly<ContextType>;
  /**
   * Extend the context object with a partial.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
  /**
   * The result of the parse phase.
   */
  result: DocumentNode | Error | null;
  /**
   * Replace the parse result with a new result.
   */
  replaceParseResult: (newResult: DocumentNode | Error) => void;
};

/**
 * Hook that is invoked after the parse function has been invoked.
 */
export type AfterParseHook<ContextType> = (options: AfterParseEventPayload<ContextType>) => void;
/**
 * Hook that is invoked before the parse function is invoked.
 */
export type OnParseHook<ContextType> = (options: OnParseEventPayload<ContextType>) => void | AfterParseHook<ContextType>;
/**
 * Payload forwarded to the onValidate hook.
 */
export type OnValidateEventPayload<ContextType> = {
  /**
   * The current context object.
   */
  context: Readonly<ContextType>;
  /**
   * Extend the context object with a partial.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
  /**
   * The parameters with which the validate function will be invoked.
   */
  params: ValidateFunctionParameter;
  /**
   * Register a validation rule that will be used for the validate invocation.
   */
  addValidationRule: (rule: ValidationRule) => void;
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
  setResult: (errors: readonly GraphQLError[]) => void;
};

/**
 * Payload forwarded to the afterValidate hook.
 */
export type AfterValidateEventPayload<ContextType> = {
  /**
   * The current context object.
   */
  context: Readonly<ContextType>;
  /**
   * Extend the context object with a partial.
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
  result: readonly GraphQLError[];
};

/**
 * AfterValidateHook is invoked after the validate function has been invoked.
 */
export type AfterValidateHook<ContextType> = (options: AfterValidateEventPayload<ContextType>) => void;

/**
 * The OnValidateHook is invoked before the validate function has been invoked.
 */
export type OnValidateHook<ContextType> = (options: OnValidateEventPayload<ContextType>) => void | AfterValidateHook<ContextType>;

/**
 * The payload forwarded to the onContextBuilding hook.
 */
export type OnContextBuildingEventPayload<ContextType> = {
  /**
   * The current context object.
   */
  context: Readonly<ContextType>;
  /**
   * Extend the context object with a partial.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
};

/**
 * The payload forwarded to the afterContextBuilding hook.
 */
export type AfterContextBuildingEventPayload<ContextType> = {
  /**
   * The current context object.
   */
  context: ContextType;
  /**
   * Extend the context object with a partial.
   */
  extendContext: (contextExtension: Partial<ContextType>) => void;
};

/**
 * Invoked after the context has been builded.
 */
export type AfterContextBuildingHook<ContextType> = (
  options: AfterContextBuildingEventPayload<ContextType>
) => PromiseOrValue<void>;

/**
 * Invoked before the context has been builded.
 * Return a AfterContextBuildingHook, which is invoked after the context building has been finished.
 */
export type OnContextBuildingHook<ContextType> = (
  options: OnContextBuildingEventPayload<ContextType>
) => PromiseOrValue<void | AfterContextBuildingHook<ContextType>>;

/** onResolverCalled */
export type ResolverFn<ParentType = unknown, ArgsType = DefaultArgs, ContextType = unknown, ResultType = unknown> = (
  root: ParentType,
  args: ArgsType,
  context: ContextType,
  info: GraphQLResolveInfo
) => PromiseOrValue<ResultType>;

export type OnBeforeResolverCalledEventPayload<
  ParentType = unknown,
  ArgsType = DefaultArgs,
  ContextType = unknown,
  ResultType = unknown
> = {
  root: ParentType;
  args: ArgsType;
  context: ContextType;
  info: GraphQLResolveInfo;
  resolverFn: ResolverFn<ParentType, ArgsType, ContextType, ResultType>;
  replaceResolverFn: (newResolver: ResolverFn<ParentType, ArgsType, ContextType, ResultType>) => void;
};

export type AfterResolverEventPayload = { result: unknown | Error; setResult: (newResult: unknown) => void };

export type AfterResolverHook = (options: AfterResolverEventPayload) => void;

export type OnResolverCalledHook<
  ParentType = unknown,
  ArgsType = DefaultArgs,
  ContextType = DefaultContext,
  ResultType = unknown
> = (
  options: OnBeforeResolverCalledEventPayload<ParentType, ArgsType, ContextType, ResultType>
) => PromiseOrValue<void | AfterResolverHook>;

/** onExecute */
export type TypedExecutionArgs<ContextType> = Omit<ExecutionArgs, 'contextValue'> & { contextValue: ContextType };

export type OnExecuteEventPayload<ContextType> = {
  executeFn: ExecuteFunction;
  args: TypedExecutionArgs<ContextType>;
  setExecuteFn: (newExecute: ExecuteFunction) => void;
  setResultAndStopExecution: (newResult: ExecutionResult) => void;
  extendContext: (contextExtension: Partial<ContextType>) => void;
};

export type OnExecuteDoneHookResultOnNextHookPayload = {
  result: ExecutionResult;
  setResult: (newResult: ExecutionResult) => void;
};

export type OnExecuteDoneHookResultOnNextHook = (payload: OnExecuteDoneHookResultOnNextHookPayload) => void | Promise<void>;

export type OnExecuteDoneHookResultOnEndHook = () => void;

export type OnExecuteDoneHookResult = {
  onNext?: OnExecuteDoneHookResultOnNextHook;
  onEnd?: OnExecuteDoneHookResultOnEndHook;
};

export type OnExecuteDoneEventPayload = {
  result: AsyncIterableIteratorOrValue<ExecutionResult>;
  setResult: (newResult: AsyncIterableIteratorOrValue<ExecutionResult>) => void;
};

export type OnExecuteDoneHook = (options: OnExecuteDoneEventPayload) => void | OnExecuteDoneHookResult;

export type OnExecuteHookResult<ContextType> = {
  onExecuteDone?: OnExecuteDoneHook;
  onResolverCalled?: OnResolverCalledHook<any, DefaultArgs, ContextType>;
};

export type OnExecuteHook<ContextType> = (
  options: OnExecuteEventPayload<ContextType>
) => PromiseOrValue<void | OnExecuteHookResult<ContextType>>;

/** onSubscribe */
export type TypedSubscriptionArgs<ContextType> = Omit<SubscriptionArgs, 'contextValue'> & { contextValue: ContextType };

export type OnSubscribeEventPayload<ContextType> = {
  subscribeFn: SubscribeFunction;
  args: TypedSubscriptionArgs<ContextType>;
  setSubscribeFn: (newSubscribe: SubscribeFunction) => void;
  extendContext: (contextExtension: Partial<ContextType>) => void;
};
export type OnSubscribeResultEventPayload = {
  result: AsyncIterableIterator<ExecutionResult> | ExecutionResult;
  setResult: (newResult: AsyncIterableIterator<ExecutionResult> | ExecutionResult) => void;
};
export type OnSubscribeResultResultOnNextHookPayload = {
  result: ExecutionResult;
  setResult: (newResult: ExecutionResult) => void;
};
export type OnSubscribeResultResultOnNextHook = (payload: OnSubscribeResultResultOnNextHookPayload) => void | Promise<void>;
export type OnSubscribeResultResultOnEndHook = () => void;
export type OnSubscribeResultResult = {
  onNext?: OnSubscribeResultResultOnNextHook;
  onEnd?: OnSubscribeResultResultOnEndHook;
};
export type SubscribeResultHook = (options: OnSubscribeResultEventPayload) => void | OnSubscribeResultResult;
export type OnSubscribeHookResult<ContextType> = {
  onSubscribeResult?: SubscribeResultHook;
  onResolverCalled?: OnResolverCalledHook<ContextType>;
};
export type OnSubscribeHook<ContextType> = (
  options: OnSubscribeEventPayload<ContextType>
) => PromiseOrValue<void | OnSubscribeHookResult<ContextType>>;
