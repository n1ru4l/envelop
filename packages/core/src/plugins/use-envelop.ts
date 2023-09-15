import { GetEnvelopedFn, Plugin } from '@envelop/types';

export const useEnvelop = (envelop: GetEnvelopedFn<any>): Plugin<any> => {
  const plugin: Plugin = {
    onPluginInit({ addPlugin }) {
      for (const plugin of envelop._plugins) {
        addPlugin(plugin);
      }
      // Avoid double execution if envelop is extended multiple times
      plugin.onPluginInit = undefined;
    },
  };

  return plugin;
};
