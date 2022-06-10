import { Plugin } from '@envelop/core';
import { InMemoryLRUCache } from 'apollo-server-caching';
import type { KeyValueCache } from 'apollo-server-caching';
import type { DataSource } from 'apollo-datasource';

export interface ApolloDataSourcesConfig<DataSources extends Record<string, DataSource>> {
  dataSources(): DataSources;
  cache?: KeyValueCache;
}

export function useApolloDataSources<DataSources extends Record<string, DataSource>>(
  config: ApolloDataSourcesConfig<DataSources>
): Plugin<{
  dataSources: DataSources;
}> {
  const cache = config.cache || new InMemoryLRUCache();

  return {
    async onExecute({ extendContext, args }) {
      const dataSources = config.dataSources();

      await Promise.all(
        Object.values(dataSources).map(dataSource =>
          dataSource.initialize?.({
            context: args.contextValue,
            cache,
          })
        )
      );

      if (args.contextValue.dataSources != null) {
        throw new Error('Please use the dataSources config option instead of putting dataSources on the context yourself.');
      }

      extendContext({
        dataSources,
      });
    },
  };
}
