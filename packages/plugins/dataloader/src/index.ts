/* eslint-disable no-console */
import { DefaultContext, Plugin } from '@envelop/types';
import DataLoader from 'dataloader';

export const useDataLoader = <Key, Value, CacheKey = Key, Context = DefaultContext>(
  name: string,
  builderFn: (context: Context) => DataLoader<Key, Value, CacheKey>
): Plugin => {
  return {
    onContextBuilding({ context, extendContext }) {
      extendContext({
        [name]: builderFn(context as Context),
      });
    },
  };
};
