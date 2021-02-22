import { PluginFn } from '@guildql/types';

export type ContextFactoryFn = (currentContext: unknown) => unknown;

export const useExtendContext = (contextFactory: ContextFactoryFn): PluginFn => api => {
  api.on('beforeContextBuilding', async support => {
    const context = support.getCurrentContext();
    support.extendContext(await contextFactory(context));
  });
};
