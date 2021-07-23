import { Plugin } from '@envelop/types';
import isAsyncIterable from 'graphql/jsutils/isAsyncIterable.js';

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
            if (isAsyncIterable(result)) {
              return {
                onNext(asyncIterableApi) {
                  asyncIterableApi.setResult({
                    ...asyncIterableApi.result,
                    extensions: {
                      ...asyncIterableApi.result.extensions,
                      preloadAssets: Array.from(assets),
                    },
                  });
                },
              };
            } else {
              setResult({
                ...result,
                extensions: {
                  ...result.extensions,
                  preloadAssets: Array.from(assets),
                },
              });
            }
          }

          return undefined;
        },
      };
    }
    return undefined;
  },
});
