import {
  OnContextBuildingHook,
  OnEnvelopedHook,
  OnExecuteHook,
  OnParseHook,
  OnPluginInitHook,
  OnSchemaChangeHook,
  OnSubscribeHook,
  OnValidateHook,
  type EnvelopData,
} from './hooks.js';

export interface Plugin<
  PluginContext extends Record<string, any> = {},
  Data extends EnvelopData = EnvelopData,
> {
  /**
   * Invoked for each call to getEnveloped.
   */
  onEnveloped?: OnEnvelopedHook<PluginContext, Data>;
  /**
   * Invoked each time the GraphQL schema has been replaced from within a plugin.
   */
  onSchemaChange?: OnSchemaChangeHook;
  /**
   * Invoked when a plugin is initialized.
   */
  onPluginInit?: OnPluginInitHook<PluginContext, Data>;
  /**
   * Invoked for each execute call.
   */
  onExecute?: OnExecuteHook<PluginContext, Data>;
  /**
   * Invoked for each subscribe call.
   */
  onSubscribe?: OnSubscribeHook<PluginContext, Data>;
  /**
   * Invoked for each parse call.
   */
  onParse?: OnParseHook<PluginContext, Data>;
  /**
   * Invoked for each validate call.
   */
  onValidate?: OnValidateHook<PluginContext, Data>;
  /**
   * Invoked for each time the context is builded.
   */
  onContextBuilding?: OnContextBuildingHook<PluginContext, Data>;
}
