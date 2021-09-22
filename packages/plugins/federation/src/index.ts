import { Plugin } from '@envelop/types';
import { ApolloGateway } from '@apollo/gateway';
import { getOperationAST, print, printSchema } from 'graphql';
import { InMemoryLRUCache, KeyValueCache } from 'apollo-server-caching';
import { CachePolicy, GraphQLRequestMetrics, Logger, SchemaHash } from 'apollo-server-types';
import { newCachePolicy } from './newCachePolicy';

export interface FederationPluginConfig {
  gateway: ApolloGateway;
  metrics?: GraphQLRequestMetrics;
  cache?: KeyValueCache;
  logger?: Logger;
  overallCachePolicy?: CachePolicy;
}

export const useFederation = (options: FederationPluginConfig): Plugin => {
  const {
    gateway,
    cache = new InMemoryLRUCache(),
    logger = console,
    metrics = Object.create(null),
    overallCachePolicy = newCachePolicy(),
  } = options;
  let schemaHash: SchemaHash;
  return {
    onPluginInit({ setSchema }) {
      if (!gateway.schema) {
        throw new Error(
          `ApolloGateway doesn't have the schema loaded. Please make sure ApolloGateway is loaded with .load() method.`
        );
      }
      setSchema(gateway.schema);
      gateway.onSchemaLoadOrUpdate(({ apiSchema }) => setSchema(apiSchema));
    },
    onSchemaChange({ schema }) {
      schemaHash = printSchema(schema) as SchemaHash;
    },
    onExecute({ args, setExecuteFn }) {
      setExecuteFn(function federationExecutor() {
        const documentStr = print(args.document);
        const operation = getOperationAST(args.document, args.operationName ?? undefined);
        if (!operation) {
          throw new Error(`Operation ${args.operationName || ''} cannot be found in ${documentStr}`);
        }
        return gateway.executor({
          document: args.document,
          request: {
            query: documentStr,
            operationName: args.operationName ?? undefined,
            variables: args.variableValues ?? undefined,
          },
          overallCachePolicy,
          operationName: args.operationName ?? null,
          cache,
          context: args.contextValue,
          queryHash: documentStr,
          logger,
          metrics,
          source: documentStr,
          operation,
          schema: args.schema,
          schemaHash,
        });
      });
    },
  };
};
