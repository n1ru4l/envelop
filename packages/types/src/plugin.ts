import { OnEnvelopedHook } from '@envelop/core';
import {
  OnContextBuildingHook,
  OnExecuteHook,
  OnParseHook,
  OnPluginInitHook,
  OnSchemaChangeHook,
  OnSubscribeHook,
  OnValidateHook,
} from './hooks';

export interface Plugin<PluginContext extends Record<string, any> = {}> {
  onEnveloped?: OnEnvelopedHook<PluginContext>;
  onSchemaChange?: OnSchemaChangeHook;
  onPluginInit?: OnPluginInitHook;
  onExecute?: OnExecuteHook<PluginContext>;
  onSubscribe?: OnSubscribeHook<PluginContext>;
  onParse?: OnParseHook<PluginContext>;
  onValidate?: OnValidateHook<PluginContext>;
  onContextBuilding?: OnContextBuildingHook<PluginContext>;
}
