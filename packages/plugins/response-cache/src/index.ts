import { Plugin, isAsyncIterable } from '@envelop/types';
import { MapperKind, mapSchema } from '@graphql-tools/utils';
import { createHash } from 'crypto';
import {
  DocumentNode,
  OperationDefinitionNode,
  visit,
  print,
  TypeInfo,
  visitWithTypeInfo,
  GraphQLSchema,
  defaultFieldResolver,
} from 'graphql';
import type { Cache, CacheResourceRecord } from './cache';
import { createInMemoryCache } from './in-memory-cache';
export { createInMemoryCache } from './in-memory-cache';

const contextSymbol = Symbol('responseCache');

type Context = {
  identifier: Map<string, CacheResourceRecord>;
  types: Set<string>;
  ttl: number;
  ttlPerType: Record<string, number>;
  ignoredTypesMap: Set<string>;
  skip: boolean;
};

interface Options<C = any> {
  cache?: Cache;
  /**
   * Maximum age in ms. Defaults to `Infinity`.
   */
  ttl?: number;
  /**
   * Overwrite the ttl for query operations whose execution result contains a specific object type.
   * Useful if the occurrence of a object time in the execution result should reduce the ttl of the query operation.
   */
  ttlPerType?: Record<string, number>;
  /**
   * Overwrite the ttl for query operations whose selection contains a specific schema coordinate (e.g. Query.users).
   * Useful if the selection of a specific field should reduce the TTL of the query operation.
   */
  ttlPerSchemaCoordinate?: Record<string, number>;
  /**
   * Allows to cache responses based on the resolved session id.
   * Return a unique value for each session.
   * Return `null` or `undefined` to mark the session as public/global.
   * Creates a global session by default.
   * @param context GraphQL Context
   */
  session?(context: C): string | undefined | null;
  /**
   * Skip caching of following the types.
   */
  ignoredTypes?: string[];
  /**
   * List of fields that are used to identify a entity.
   * Defaults to `["id"]`
   */
  idFields?: Array<string>;
  /**
   * Whether the mutation execution result should be used for invalidating resources.
   * Defaults to `true`
   */
  invalidateViaMutation?: boolean;
}

const schemaCache = new WeakMap<GraphQLSchema, GraphQLSchema>();

export function useResponseCache({
  cache = createInMemoryCache(),
  ttl = Infinity,
  session = () => null,
  ignoredTypes = [],
  ttlPerType = {},
  ttlPerSchemaCoordinate,
  idFields = ['id'],
  invalidateViaMutation = true,
}: Options = {}): Plugin {
  const ignoredTypesMap = new Set<string>(ignoredTypes);

  return {
    onSchemaChange(ctx) {
      let schema = schemaCache.get(ctx.schema);
      if (schema == null) {
        schema = applyResponseCacheLogic(ctx.schema, idFields);
        schemaCache.set(ctx.schema, schema);
      }
      ctx.replaceSchema(schema);
    },
    async onExecute(ctx) {
      const identifier = new Map<string, CacheResourceRecord>();
      const types = new Set<string>();

      const context: Context = {
        identifier,
        types,
        ttl,
        ttlPerType,
        ignoredTypesMap,
        skip: false,
      };

      ctx.extendContext({
        [contextSymbol]: context,
      });

      if (isMutation(ctx.args.document)) {
        if (invalidateViaMutation === false) {
          return;
        }

        return {
          onExecuteDone({ result }) {
            if (isAsyncIterable(result)) {
              // eslint-disable-next-line no-console
              console.warn('[useResponseCache] AsyncIterable returned from execute is currently unsupported.');
              return;
            }

            cache.invalidate(context.identifier.values());
          },
        };
      } else {
        const operationId = createHash('sha1')
          .update(
            [print(ctx.args.document), JSON.stringify(ctx.args.variableValues || {}), session(ctx.args.contextValue) ?? ''].join(
              '|'
            )
          )
          .digest('base64');

        const cachedResponse = await cache.get(operationId);

        if (cachedResponse != null) {
          ctx.setResultAndStopExecution(cachedResponse);
          return;
        }

        if (ttlPerSchemaCoordinate) {
          const typeInfo = new TypeInfo(ctx.args.schema);
          visit(
            ctx.args.document,
            visitWithTypeInfo(typeInfo, {
              Field(fieldNode) {
                const parentType = typeInfo.getParentType();
                if (parentType) {
                  const schemaCoordinate = `${parentType.name}.${fieldNode.name.value}`;
                  if (schemaCoordinate in ttlPerSchemaCoordinate) {
                    context.ttl = Math.min(context.ttl, ttlPerSchemaCoordinate[schemaCoordinate]);
                  }
                }
              },
            })
          );
        }

        return {
          onExecuteDone({ result }) {
            if (isAsyncIterable(result)) {
              // eslint-disable-next-line no-console
              console.warn('[useResponseCache] AsyncIterable returned from execute is currently unsupported.');
              return;
            }

            if (context.skip) {
              return;
            }

            cache.set(operationId, result, identifier.values(), context.ttl);
          },
        };
      }
    },
  };
}

function isOperationDefinition(node: any): node is OperationDefinitionNode {
  return node?.kind === 'OperationDefinition';
}

function isMutation(doc: DocumentNode) {
  return doc.definitions.find(isOperationDefinition)!.operation === 'mutation';
}

function runWith<T>(input: T | Promise<T>, callback: (value: T) => void) {
  if (input instanceof Promise) {
    input.then(callback, () => undefined);
  } else {
    callback(input);
  }
}

function applyResponseCacheLogic(schema: GraphQLSchema, idFieldNames: Array<string>): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD](fieldConfig, fieldName, typename) {
      if (idFieldNames.includes(fieldName)) {
        return {
          ...fieldConfig,
          resolve(src, args, context, info) {
            const result = (fieldConfig.resolve ?? defaultFieldResolver)(src, args, context, info);
            runWith(result, (id: string) => {
              if (contextSymbol in context) {
                const ctx: Context = context[contextSymbol];
                if (ctx.ignoredTypesMap.has(typename)) {
                  ctx.skip = true;
                }
                if (ctx.skip === true) {
                  ctx.skip = true;
                  return;
                }
                ctx.identifier.set(`${typename}:${id}`, { typename, id });
                ctx.types.add(typename);
                if (typename in ctx.ttlPerType) {
                  ctx.ttl = Math.min(ctx.ttl, ctx.ttlPerType[typename]);
                }
              }
            });
            return result;
          },
        };
      }

      return fieldConfig;
    },
  });
}
