import {
  OnContextBuildingHook,
  OnEnvelopedHook,
  OnExecuteHook,
  OnParseHook,
  OnPluginInitHook,
  OnSchemaChangeHook,
  OnSubscribeHook,
  OnValidateHook,
} from './hooks.js';
import type { PromiseOrValue } from './utils.js';

export interface Plugin<PluginContext extends Record<string, any> = {}> {
  /**
   * Instruments wrapping each phases, including hooks executions.
   */
  instruments?: Instruments<PluginContext>;
  /**
   * Invoked for each call to getEnveloped.
   */
  onEnveloped?: OnEnvelopedHook<PluginContext>;
  /**
   * Invoked each time the GraphQL schema has been replaced from within a plugin.
   */
  onSchemaChange?: OnSchemaChangeHook;
  /**
   * Invoked when a plugin is initialized.
   */
  onPluginInit?: OnPluginInitHook<PluginContext>;
  /**
   * Invoked for each execute call.
   */
  onExecute?: OnExecuteHook<PluginContext>;
  /**
   * Invoked for each subscribe call.
   */
  onSubscribe?: OnSubscribeHook<PluginContext>;
  /**
   * Invoked for each parse call.
   */
  onParse?: OnParseHook<PluginContext>;
  /**
   * Invoked for each validate call.
   */
  onValidate?: OnValidateHook<PluginContext>;
  /**
   * Invoked for each time the context is builded.
   */
  onContextBuilding?: OnContextBuildingHook<PluginContext>;
}

export type Instruments<TContext extends Record<string, any>> = {
  init?: (payload: { context: TContext }, wrapped: () => void) => void;
  parse?: (payload: { context: TContext }, wrapped: () => void) => void;
  validate?: (payload: { context: TContext }, wrapped: () => void) => void;
  context?: (payload: { context: TContext }, wrapped: () => void) => void;
  execute?: (
    payload: { context: TContext },
    wrapped: () => PromiseOrValue<void>,
  ) => PromiseOrValue<void>;
  subscribe?: (
    payload: { context: TContext },
    wrapped: () => PromiseOrValue<void>,
  ) => PromiseOrValue<void>;
};
