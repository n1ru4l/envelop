import {
  OnEnvelopedHook,
  OnContextBuildingHook,
  OnExecuteHook,
  OnParseHook,
  OnPluginInitHook,
  OnSchemaChangeHook,
  OnSubscribeHook,
  OnValidateHook,
  OnResolverCalledHook,
  DefaultArgs,
} from './hooks';

export interface Plugin<
  TInputContext extends Record<string, any> = {},
  TOutputContext extends Record<string, any> = TInputContext
> {
  /**
   * Invoked for each call to getEnveloped.
   */
  onEnveloped?: OnEnvelopedHook<TInputContext, TOutputContext>;
  /**
   * Invoked each time the GraphQL schema has been replaced from within a plugin.
   */
  onSchemaChange?: OnSchemaChangeHook;
  /**
   * Invoked when a plugin is initialized.
   */
  onPluginInit?: OnPluginInitHook;
  /**
   * Invoked for each execute call.
   */
  onExecute?: OnExecuteHook<TInputContext, TOutputContext>;
  /**
   * Invoked for each subscribe call.
   */
  onSubscribe?: OnSubscribeHook<TInputContext, TOutputContext>;
  /**
   * Invoked for each parse call.
   */
  onParse?: OnParseHook<TInputContext, TOutputContext>;
  /**
   * Invoked for each validate call.
   */
  onValidate?: OnValidateHook<TInputContext, TOutputContext>;
  /**
   * Invoked for each time the context is builded.
   */
  onContextBuilding?: OnContextBuildingHook<TInputContext, TOutputContext>;
  /**
   * Invoked before each resolver has been invoked during the execution phase.
   */
  onResolverCalled?: OnResolverCalledHook<any, DefaultArgs, TInputContext & TOutputContext, unknown>;
}
