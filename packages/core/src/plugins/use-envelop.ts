import { Envelop, Plugin } from '@envelop/types';

export const useEnvelop = (envelop: Envelop): Plugin => {
  return {
    onPluginInit({ addPlugin }) {
      for (const plugin of envelop._plugins) {
        addPlugin(plugin);
      }
    },
  };
};
