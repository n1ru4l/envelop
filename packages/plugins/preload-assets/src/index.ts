import { Plugin } from '@envelop/types';

export type UsePreloadAssetsOpts = {
  shouldPreloadAssets?: (context: unknown) => boolean;
};

export const usePreloadAssets = (opts?: UsePreloadAssetsOpts): Plugin => ({
  onExecute: ({ extendContext, args }) => {
    const assets = new Set<string>();

    extendContext({
      registerPreloadAsset: (assetUrl: string) => assets.add(assetUrl),
    });

    if (opts?.shouldPreloadAssets?.(args.contextValue) ?? true) {
      return {
        onExecuteDone: ({ result, setResult }) => {
          if (assets.size) {
            setResult({
              ...result,
              extensions: {
                ...result.extensions,
                preloadAssets: Array.from(assets),
              },
            });
          }
        },
      };
    }
    return undefined;
  },
});
