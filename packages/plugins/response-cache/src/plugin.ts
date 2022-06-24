import { Plugin, Maybe, DefaultContext, PromiseOrValue, isAsyncIterable } from '@envelop/core';
import { MapperKind, mapSchema } from '@graphql-tools/utils';
import {
  DocumentNode,
  OperationDefinitionNode,
  visit,
  TypeInfo,
  visitWithTypeInfo,
  GraphQLSchema,
  defaultFieldResolver,
  ExecutionArgs,
  ExecutionResult,
  print,
} from 'graphql';
import jsonStableStringify from 'fast-json-stable-stringify';
import type { Cache, CacheEntityRecord } from './cache.js';
import { createInMemoryCache } from './in-memory-cache.js';
import { hashSHA256 } from './hashSHA256.js';

const contextSymbol = Symbol('responseCache');
const rawDocumentStringSymbol = Symbol('rawDocumentString');

type Context = {
  identifier: Map<string, CacheEntityRecord>;
  types: Set<string>;
  /** The current ttl computed for this operation. */
  currentTtl: number | undefined;
  ttlPerType: Record<string, number>;
  ignoredTypesMap: Set<string>;
  skip: boolean;
};

/**
 * Function for building the response cache key based on the input parameters
 */
export type BuildResponseCacheKeyFunction = (params: {
  /** Raw document string as sent from the client. */
  documentString: string;
  /** Variable values as sent form the client. */
  variableValues: ExecutionArgs['variableValues'];
  /** The name of the GraphQL operation that should be executed from within the document. */
  operationName?: Maybe<string>;
  /** optional sessionId for make unique cache keys based on the session.  */
  sessionId?: Maybe<string>;
}) => Promise<string>;

export type GetDocumentStringFromContextFunction = (params: DefaultContext) => Maybe<string>;

export type ShouldCacheResultFunction = (params: { result: ExecutionResult }) => Boolean;

export type UseResponseCacheParameter<C = any> = {
  cache?: Cache;
  /**
   * Maximum age in ms. Defaults to `Infinity`. Set it to 0 for disabling the global TTL.
   */
  ttl?: number;
  /**
   * Overwrite the ttl for query operations whose execution result contains a specific object type.
   * Useful if the occurrence of a object time in the execution result should reduce or increase the TTL of the query operation.
   * The TTL per type is always favored over the global TTL.
   */
  ttlPerType?: Record<string, number>;
  /**
   * Overwrite the ttl for query operations whose selection contains a specific schema coordinate (e.g. Query.users).
   * Useful if the selection of a specific field should reduce the TTL of the query operation.
   *
   * The default value is `{}` and it will be merged with a `{ 'Query.__schema': 0 }` object.
   * In the unusual case where you actually want to cache introspection query operations,
   * you need to provide the value `{ 'Query.__schema': undefined }`.
   */
  ttlPerSchemaCoordinate?: Record<string, number | undefined>;
  /**
   * Allows to cache responses based on the resolved session id.
   * Return a unique value for each session.
   * Return `null` or `undefined` to mark the session as public/global.
   * Creates a global session by default.
   * @param context GraphQL Context
   */
  session?(context: C): string | undefined | null;
  /**
   * Specify whether the cache should be used based on the context.
   * By default any request uses the cache.
   */
  enabled?(context: C): boolean;
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
  /**
   * Customize the behavior how the response cache key is computed from the document, variable values and sessionId.
   * Defaults to `defaultBuildResponseCacheKey`
   */
  buildResponseCacheKey?: BuildResponseCacheKeyFunction;
  /**
   * Function used for reading the document string that is used for building the response cache key from the context object.
   * By default, the useResponseCache plugin hooks into onParse and writes the original operation string to the context.
   * If you are hard overriding parse you need to set this function, otherwise responses will not be cached or served from the cache.
   * Defaults to `defaultGetDocumentStringFromContext`
   *
   * @deprecated No longer being used in the next major version.
   */
  getDocumentStringFromContext?: GetDocumentStringFromContextFunction;
  /**
   * Include extension values that provide useful information, such as whether the cache was hit or which resources a mutation invalidated.
   * Defaults to `true` if `process.env["NODE_ENV"]` is set to `"development"`, otherwise `false`.
   */
  includeExtensionMetadata?: boolean;
  /**
   * Checks if the execution result should be cached or ignored. By default, any execution that
   * raises any error, unexpected ot EnvelopError or GraphQLError are ignored.
   * Use this function to customize the behavior, such as caching results that have an EnvelopError.
   */
  shouldCacheResult?: ShouldCacheResultFunction;
};

/**
 * Default function used for building the response cache key.
 * It is exported here for advanced use-cases. E.g. if you want to short circuit and serve responses from the cache on a global level in order to completely by-pass the GraphQL flow.
 */
export const defaultBuildResponseCacheKey: BuildResponseCacheKeyFunction = params =>
  hashSHA256(
    [
      params.documentString,
      params.operationName ?? '',
      jsonStableStringify(params.variableValues ?? {}),
      params.sessionId ?? '',
    ].join('|')
  );

/**
 * Default function used to check if the result should be cached.
 *
 * It is exported here for advanced use-cases. E.g. if you want to choose if
 * results with certain error types should be cached.
 *
 * By default, results with errors (unexpected, EnvelopError, or GraphQLError) are not cached.
 */
export const defaultShouldCacheResult: ShouldCacheResultFunction = (params): Boolean => {
  if (params.result.errors) {
    // eslint-disable-next-line no-console
    console.warn('[useResponseCache] Failed to cache due to errors');
    return false;
  }

  return true;
};

// @deprecated This will be removed in the next major
export const defaultGetDocumentStringFromContext: GetDocumentStringFromContextFunction = context =>
  context[rawDocumentStringSymbol as any] as any;

const documentStringByDocument = new WeakMap<DocumentNode, string>();

function getDocumentStringFromDocument(documentNode: DocumentNode) {
  let documentString = documentStringByDocument.get(documentNode);
  if (!documentString) {
    documentString = print(documentNode);
    documentStringByDocument.set(documentNode, documentString);
  }
  return documentString;
}

export function useResponseCache({
  cache = createInMemoryCache(),
  ttl: globalTtl = Infinity,
  session = () => null,
  enabled,
  ignoredTypes = [],
  ttlPerType = {},
  ttlPerSchemaCoordinate = {},
  idFields = ['id'],
  invalidateViaMutation = true,
  buildResponseCacheKey = defaultBuildResponseCacheKey,
  getDocumentStringFromContext,
  shouldCacheResult = defaultShouldCacheResult,
  // eslint-disable-next-line dot-notation
  includeExtensionMetadata = typeof process !== 'undefined' ? process.env['NODE_ENV'] === 'development' : false,
}: UseResponseCacheParameter = {}): Plugin {
  const appliedTransform = Symbol('responseCache.appliedTransform');
  const ignoredTypesMap = new Set<string>(ignoredTypes);

  // never cache Introspections
  ttlPerSchemaCoordinate = { 'Query.__schema': 0, ...ttlPerSchemaCoordinate };

  return {
    onSchemaChange({ schema, replaceSchema }) {
      // @ts-expect-error See https://github.com/graphql/graphql-js/pull/3511 - remove this comments once merged
      if (schema.extensions?.[appliedTransform] === true) {
        return;
      }

      const patchedSchema = applyResponseCacheLogic(schema, idFields);
      patchedSchema.extensions = {
        ...patchedSchema.extensions,
        [appliedTransform]: true,
      };
      replaceSchema(patchedSchema);
    },
    onParse({ params: { source } }) {
      return function onParseEnd({ result }) {
        if (result != null && !(result instanceof Error)) {
          documentStringByDocument.set(result, source.toString());
        }
      };
    },
    async onExecute(ctx) {
      const identifier = new Map<string, CacheEntityRecord>();
      const types = new Set<string>();

      const context: Context = {
        identifier,
        types,
        currentTtl: undefined,
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
          onExecuteDone({ result, setResult }) {
            if (isAsyncIterable(result)) {
              // eslint-disable-next-line no-console
              console.warn('[useResponseCache] AsyncIterable returned from execute is currently unsupported.');
              return;
            }

            cache.invalidate(context.identifier.values());
            if (includeExtensionMetadata) {
              setResult({
                ...result,
                extensions: {
                  ...result.extensions,
                  responseCache: {
                    invalidatedEntities: Array.from(context.identifier.values()),
                  },
                },
              });
            }
          },
        };
      }
      const documentString =
        getDocumentStringFromContext?.(ctx.args.contextValue) ?? getDocumentStringFromDocument(ctx.args.document);
      const operationId = await buildResponseCacheKey({
        documentString,
        variableValues: ctx.args.variableValues,
        operationName: ctx.args.operationName,
        sessionId: session(ctx.args.contextValue),
      });

      if ((enabled?.(ctx.args.contextValue) ?? true) === true) {
        const cachedResponse = await cache.get(operationId);

        if (cachedResponse != null) {
          if (includeExtensionMetadata) {
            ctx.setResultAndStopExecution({
              ...cachedResponse,
              extensions: {
                responseCache: {
                  hit: true,
                },
              },
            });
          } else {
            ctx.setResultAndStopExecution(cachedResponse);
          }
          return;
        }
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
                const maybeTtl = ttlPerSchemaCoordinate[schemaCoordinate];
                if (maybeTtl !== undefined) {
                  context.currentTtl = calculateTtl(maybeTtl, context.currentTtl);
                }
              }
            },
          })
        );
      }

      return {
        onExecuteDone({ result, setResult }) {
          if (isAsyncIterable(result)) {
            // eslint-disable-next-line no-console
            console.warn('[useResponseCache] AsyncIterable returned from execute is currently unsupported.');
            return;
          }

          if (context.skip) {
            return;
          }

          if (!shouldCacheResult({ result })) {
            return;
          }

          // we only use the global ttl if no currentTtl has been determined.
          const finalTtl = context.currentTtl ?? globalTtl;

          if (finalTtl === 0) {
            if (includeExtensionMetadata) {
              setResult({
                ...result,
                extensions: {
                  responseCache: {
                    hit: false,
                    didCache: false,
                  },
                },
              });
            }
            return;
          }

          cache.set(operationId, result, identifier.values(), finalTtl);
          if (includeExtensionMetadata) {
            setResult({
              ...result,
              extensions: {
                responseCache: {
                  hit: false,
                  didCache: true,
                  ttl: finalTtl,
                },
              },
            });
          }
        },
      };
    },
  };
}

function isOperationDefinition(node: any): node is OperationDefinitionNode {
  return node?.kind === 'OperationDefinition';
}

function calculateTtl(typeTtl: number, currentTtl: number | undefined): number {
  if (typeof currentTtl === 'number') {
    return Math.min(currentTtl, typeTtl);
  }
  return typeTtl;
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
            const result = (fieldConfig.resolve ?? defaultFieldResolver)(src, args, context, info) as PromiseOrValue<string>;
            runWith(result, (id: string) => {
              const ctx: Context | undefined = context[contextSymbol];
              if (ctx !== undefined) {
                if (ctx.ignoredTypesMap.has(typename)) {
                  ctx.skip = true;
                }
                if (ctx.skip === true) {
                  ctx.skip = true;
                  return;
                }
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore  TODO: investigate what to do if id is something unexpected
                ctx.identifier.set(`${typename}:${id}`, { typename, id });
                ctx.types.add(typename);
                if (typename in ctx.ttlPerType) {
                  ctx.currentTtl = calculateTtl(ctx.ttlPerType[typename], ctx.currentTtl);
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
