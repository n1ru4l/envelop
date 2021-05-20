import { Plugin } from '@envelop/types';

export const usePreloadAsset = (): Plugin => ({
  onExecute: ({ extendContext }) => {
    const assets = new Set<string>();
    extendContext({
      registerPreloadAsset: (assetUrl: string) => assets.add(assetUrl),
    });
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
  },
});
