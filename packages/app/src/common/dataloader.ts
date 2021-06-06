import DataLoader from 'dataloader';

import { useDataLoader } from '@envelop/dataloader';

import type { DefaultContext, Plugin } from '@envelop/core';

export type DataLoaderFn<K, V, C = K> = (DataLoaderClass: typeof DataLoader, context: DefaultContext) => DataLoader<K, V, C>;

export type RegisteredDataLoader<Name extends string, Key, Value, Cache = Key> = {
  name: Name;
  dataLoaderFactory: DataLoaderFn<Key, Value, Cache>;
};

export type RegisterDataLoader = <Name extends string, Key, Value, Cache = Key>(
  name: Name,
  dataLoaderFactory: DataLoaderFn<Key, Value, Cache>
) => RegisteredDataLoader<Name, Key, Value, Cache>;

export function RegisterDataLoaderFactory(plugins: Plugin[]): RegisterDataLoader {
  return function registerDataLoader<Name extends string, Key, Value, Cache = Key>(
    name: Name,
    dataLoaderFactory: DataLoaderFn<Key, Value, Cache>
  ): RegisteredDataLoader<Name, Key, Value, Cache> {
    plugins.push(
      useDataLoader(name, context => {
        return dataLoaderFactory(DataLoader, context);
      })
    );
    return {
      name,
      dataLoaderFactory,
    };
  };
}

export type InferDataLoader<V> = V extends RegisteredDataLoader<infer Name, infer Key, infer Value, infer Cache>
  ? { [k in Name]: DataLoader<Key, Value, Cache> }
  : {};
