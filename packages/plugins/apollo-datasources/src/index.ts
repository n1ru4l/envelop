import { Plugin } from '@envelop/core';
import { InMemoryLRUCache } from 'apollo-server-caching';
import type { KeyValueCache } from 'apollo-server-caching';
import type { DataSource } from 'apollo-datasource';

export interface ApolloDataSourcesConfig {
  dataSources(): {
    [name: string]: DataSource;
  };
  cache?: KeyValueCache;
}

export function useApolloDataSources(config: ApolloDataSourcesConfig): Plugin {
  const cache = config.cache || new InMemoryLRUCache();

  return {
    async onExecute({ extendContext, args }) {
      const dataSources = config.dataSources();
      const initializers: Array<void | Promise<void>> = [];
      for (const dataSource of Object.values(dataSources)) {
        if (dataSource.initialize) {
          initializers.push(
            dataSource.initialize({
              context: args.contextValue,
              cache,
            })
          );
        }
      }

      await Promise.all(initializers);

      if ('dataSources' in args.contextValue) {
        throw new Error('Please use the dataSources config option instead of putting dataSources on the context yourself.');
      }

      extendContext({
        dataSources,
      });
    },
  };
}
