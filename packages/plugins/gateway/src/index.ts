import { Plugin } from '@envelop/types';
import { GatewayPluginOptions } from './types';

export * from './types';
export * from './stitching';

export const useGateway = (opts: GatewayPluginOptions): Plugin => ({
  onPluginInit({ setSchema }) {
    opts.orchestrator.onSchemaChange(schema => setSchema(schema));
  },
});
