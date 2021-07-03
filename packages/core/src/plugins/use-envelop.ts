import { Envelop, Plugin } from '@envelop/types';

export const useEnvelop = (envelop: Envelop<any, any>): Plugin<any> => {
  return {
    onPluginInit({ addPlugin }) {
      for (const plugin of envelop._plugins) {
        addPlugin(plugin);
      }
    },
  };
};
