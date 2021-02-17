import { Plugin } from '@envelop/types';

export type ContextFactoryFn = (currentContext: unknown) => unknown;

export const useExtendContext = (contextFactory: ContextFactoryFn): Plugin => ({
  async onContextBuilding({ context, extendContext }) {
    extendContext((await contextFactory(context)) as any);
  },
});
