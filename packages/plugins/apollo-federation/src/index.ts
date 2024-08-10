import { InMemoryLRUCache, KeyValueCache } from 'apollo-server-caching';
import { CachePolicy, GraphQLRequestMetrics, Logger, SchemaHash } from 'apollo-server-types';
import { ExecutionArgs, getOperationAST, GraphQLSchema, print, printSchema } from 'graphql';
import { ApolloGateway } from '@apollo/gateway';
import { getDocumentString, Plugin } from '@envelop/core';
import { newCachePolicy } from './new-cache-policy.js';

export interface ApolloFederationPluginConfig {
  gateway: ApolloGateway;
  metrics?: GraphQLRequestMetrics;
  cache?: KeyValueCache;
  logger?: Logger;
  overallCachePolicy?: CachePolicy;
}
const schemaHashMap = new WeakMap<GraphQLSchema, SchemaHash>();
function getSchemaHash(schema: GraphQLSchema): SchemaHash {
  let schemaHash = schemaHashMap.get(schema);
  if (!schemaHash) {
    schemaHash = printSchema(schema) as SchemaHash;
    schemaHashMap.set(schema, schemaHash);
  }
  return schemaHash;
}

export const useApolloFederation = (options: ApolloFederationPluginConfig): Plugin => {
  const {
    gateway,
    cache = new InMemoryLRUCache(),
    logger = console,
    metrics = Object.create(null),
    overallCachePolicy = newCachePolicy(),
  } = options;
  function federationExecutor(args: ExecutionArgs) {
    const documentStr = getDocumentString(args.document, print);
    const operation = getOperationAST(args.document, args.operationName ?? undefined);
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
      context: args.contextValue as Record<string, any>,
      queryHash: documentStr,
      logger,
      metrics,
      source: documentStr,
      operation: operation!,
      schema: args.schema,
      schemaHash: getSchemaHash(args.schema),
    });
  }
  let schema: GraphQLSchema;
  let setSchema: (schema: GraphQLSchema) => void = newSchema => {
    schema = newSchema;
  };
  gateway.onSchemaLoadOrUpdate(({ apiSchema, coreSupergraphSdl = printSchema(apiSchema) }) => {
    schemaHashMap.set(apiSchema, coreSupergraphSdl as SchemaHash);
    if (schemaHashMap.get(schema) !== coreSupergraphSdl) {
      setSchema(apiSchema);
    }
  });
  return {
    onPluginInit(payload) {
      setSchema = payload.setSchema;
      if (schema) {
        setSchema(schema);
      }
    },
    onContextBuilding() {
      if (!gateway.schema) {
        return gateway.load().then(() => {});
      }
      return undefined;
    },
    onExecute({ setExecuteFn }) {
      setExecuteFn(federationExecutor);
    },
  };
};
