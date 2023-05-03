import { InMemoryLRUCache, KeyValueCache } from 'apollo-server-caching';
import { CachePolicy, GraphQLRequestMetrics, Logger, SchemaHash } from 'apollo-server-types';
import { DocumentNode, getOperationAST, print, printSchema, Source } from 'graphql';
import { ApolloGateway } from '@apollo/gateway';
import { Plugin } from '@envelop/core';
import { newCachePolicy } from './new-cache-policy.js';

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
      if (gateway.schema) {
        setSchema(gateway.schema);
      } else {
        logger.warn(
          `ApolloGateway doesn't have the schema loaded. Please make sure ApolloGateway is loaded with .load() method. Otherwise this plugin might not work consistently, especially if you are using ApolloServer.`,
        );
        gateway.load();
      }
      gateway.onSchemaLoadOrUpdate(({ apiSchema, coreSupergraphSdl = printSchema(apiSchema) }) => {
        setSchema(apiSchema);
        schemaHash = (coreSupergraphSdl || printSchema(apiSchema)) as SchemaHash;
      });
    },
    onParse({ params: { source } }) {
      const key = source instanceof Source ? source.body : source;

      return ({ result }) => {
        if (!result || result instanceof Error) return;

        documentSourceMap.set(result, key);
      };
    },
    onExecute({ args, setExecuteFn }) {
      let documentStr = documentSourceMap.get(args.document)!;
      if (documentStr == null) {
        documentStr = print(args.document);
        documentSourceMap.set(args.document, documentStr);
      }
      const operation = getOperationAST(args.document, args.operationName ?? undefined);
      if (!operation) {
        throw new Error(`Operation ${args.operationName || ''} cannot be found in ${documentStr}`);
      }
      setExecuteFn(function federationExecutor() {
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
