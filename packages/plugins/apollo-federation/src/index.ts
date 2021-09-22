import { Plugin } from '@envelop/types';
import { ApolloGateway } from '@apollo/gateway';
import { DocumentNode, getOperationAST, printSchema, Source } from 'graphql';
import { InMemoryLRUCache, KeyValueCache } from 'apollo-server-caching';
import { CachePolicy, GraphQLRequestMetrics, Logger, SchemaHash } from 'apollo-server-types';
import { newCachePolicy } from './newCachePolicy';

export interface ApolloFederationPluginConfig {
  gateway: ApolloGateway;
  metrics?: GraphQLRequestMetrics;
  cache?: KeyValueCache;
  logger?: Logger;
  overallCachePolicy?: CachePolicy;
}

export const useApolloFederation = (options: ApolloFederationPluginConfig): Plugin => {
  const {
    gateway,
    cache = new InMemoryLRUCache(),
    logger = console,
    metrics = Object.create(null),
    overallCachePolicy = newCachePolicy(),
  } = options;
  let schemaHash: SchemaHash;
  const documentSourceMap = new WeakMap<DocumentNode, string>();
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
    onParse({ params: { source } }) {
      const key = source instanceof Source ? source.body : source;

      return ({ result }) => {
        if (!result || result instanceof Error) return;

        documentSourceMap.set(result, key);
      };
    },
    onExecute({ args, setExecuteFn }) {
      setExecuteFn(function federationExecutor() {
        const documentStr = documentSourceMap.get(args.document);
        if (!documentStr) {
          throw new Error(`Parse error!`);
        }
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
