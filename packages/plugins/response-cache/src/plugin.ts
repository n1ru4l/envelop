import jsonStableStringify from 'fast-json-stable-stringify';
import {
  BREAK,
  DocumentNode,
  ExecutionArgs,
  getOperationAST,
  Kind,
  print,
  TypeInfo,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import {
  ExecutionResult,
  getDocumentString,
  isAsyncIterable,
  Maybe,
  ObjMap,
  Plugin,
} from '@envelop/core';
import {
  getDirective,
  MapperKind,
  mapSchema,
  memoize2,
  mergeIncrementalResult,
} from '@graphql-tools/utils';
import type { Cache, CacheEntityRecord } from './cache.js';
import { hashSHA256 } from './hash-sha256.js';
import { createInMemoryCache } from './in-memory-cache.js';

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
  sessionId: Maybe<string>;
  /** GraphQL Context */
  context: ExecutionArgs['contextValue'];
}) => Promise<string>;

export type GetDocumentStringFunction = (executionArgs: ExecutionArgs) => string;

export type ShouldCacheResultFunction = (params: {
  cacheKey: string;
  result: ExecutionResult;
}) => Boolean;

export type UseResponseCacheParameter<PluginContext extends Record<string, any> = {}> = {
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
  scopePerSchemaCoordinate?: Record<string, 'PRIVATE' | 'PUBLIC' | undefined>;
  /**
   * Allows to cache responses based on the resolved session id.
   * Return a unique value for each session.
   * Return `null` or `undefined` to mark the session as public/global.
   * Creates a global session by default.
   * @param context GraphQL Context
   *
   * **Global Example:**
   * ```ts
   * useResponseCache({
   *   session: () => null,
   * });
   * ```
   *
   * **User Specific with global fallback example:**
   * ```ts
   * useResponseCache({
   *   session: (context) => context.user?.id ?? null,
   * });
   * ```
   */
  session(context: PluginContext): string | undefined | null;
  /**
   * Specify whether the cache should be used based on the context.
   * By default any request uses the cache.
   */
  enabled?(context: PluginContext): boolean;
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
   * Wheter the subscription execution result should be used for invalidating resources.
   */
  invalidateViaSubscription?: boolean;
  /**
   * Customize the behavior how the response cache key is computed from the document, variable values and sessionId.
   * Defaults to `defaultBuildResponseCacheKey`
   */
  buildResponseCacheKey?: BuildResponseCacheKeyFunction;
  /**
   * Function used for reading the document string that is used for building the response cache key from the execution arguments.
   * By default, the useResponseCache plugin hooks into onParse and caches the original operation string in a WeakMap.
   * If you are hard overriding parse you need to set this function, otherwise responses will not be cached or served from the cache.
   * Defaults to `defaultGetDocumentString`
   *
   */
  getDocumentString?: GetDocumentStringFunction;
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
export const defaultBuildResponseCacheKey = (params: {
  documentString: string;
  variableValues: ExecutionArgs['variableValues'];
  operationName?: Maybe<string>;
  sessionId: Maybe<string>;
}): Promise<string> =>
  hashSHA256(
    [
      params.documentString,
      params.operationName ?? '',
      jsonStableStringify(params.variableValues ?? {}),
      params.sessionId ?? '',
    ].join('|'),
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

export function defaultGetDocumentString(executionArgs: ExecutionArgs): string {
  return getDocumentString(executionArgs.document, print);
}

export type ResponseCacheExtensions =
  | {
      hit: true;
    }
  | {
      hit: false;
      didCache: false;
    }
  | {
      hit: false;
      didCache: true;
      ttl: number;
    }
  | {
      invalidatedEntities: CacheEntityRecord[];
    };

export type ResponseCacheExecutionResult = ExecutionResult<
  ObjMap<unknown>,
  { responseCache?: ResponseCacheExtensions }
>;

const originalDocumentMap = new WeakMap<DocumentNode, DocumentNode>();
const addTypeNameToDocument = memoize2(function addTypeNameToDocument(
  document: DocumentNode,
  addTypeNameToDocumentOpts: { invalidateViaMutation: boolean; invalidateViaSubscription: boolean },
): DocumentNode {
  const newDocument = visit(document, {
    SelectionSet(node, _key, parent) {
      if (parent && 'kind' in parent && parent.kind === Kind.OPERATION_DEFINITION) {
        if (parent.operation === 'mutation' && !addTypeNameToDocumentOpts.invalidateViaMutation) {
          return BREAK;
        }
        if (parent.operation === 'subscription') {
          return addTypeNameToDocumentOpts.invalidateViaSubscription ? node : BREAK;
        }
      }
      return {
        ...node,
        selections: [
          {
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: '__typename',
            },
            alias: {
              kind: Kind.NAME,
              value: '__responseCacheTypeName',
            },
          },
          ...node.selections,
        ],
      };
    },
  });
  originalDocumentMap.set(newDocument, document);
  return newDocument;
});

export function useResponseCache<PluginContext extends Record<string, any> = {}>({
  cache = createInMemoryCache(),
  ttl: globalTtl = Infinity,
  session,
  enabled,
  ignoredTypes = [],
  ttlPerType = {},
  ttlPerSchemaCoordinate = {},
  scopePerSchemaCoordinate = {},
  idFields = ['id'],
  invalidateViaMutation = true,
  invalidateViaSubscription = true,
  buildResponseCacheKey = defaultBuildResponseCacheKey,
  getDocumentString = defaultGetDocumentString,
  shouldCacheResult = defaultShouldCacheResult,
  includeExtensionMetadata = typeof process !== 'undefined'
    ? // eslint-disable-next-line dot-notation
      process.env['NODE_ENV'] === 'development' || !!process.env['DEBUG']
    : false,
}: UseResponseCacheParameter<PluginContext>): Plugin<PluginContext> {
  const ignoredTypesMap = new Set<string>(ignoredTypes);
  const processedSchemas = new WeakSet();

  // never cache Introspections
  ttlPerSchemaCoordinate = { 'Query.__schema': 0, ...ttlPerSchemaCoordinate };
  const addTypeNameToDocumentOpts = { invalidateViaMutation, invalidateViaSubscription };
  return {
    onParse() {
      return ({ result, replaceParseResult }) => {
        if (!originalDocumentMap.has(result) && result.kind === Kind.DOCUMENT) {
          const newDocument = addTypeNameToDocument(result, addTypeNameToDocumentOpts);
          replaceParseResult(newDocument);
        }
      };
    },
    onSchemaChange({ schema }) {
      if (processedSchemas.has(schema)) {
        return;
      }
      // Check if the schema has @cacheControl directive
      const cacheControlDirective = schema.getDirective('cacheControl');
      if (cacheControlDirective) {
        mapSchema(schema, {
          [MapperKind.COMPOSITE_TYPE]: type => {
            const cacheControlAnnotations = getDirective(schema, type, 'cacheControl');
            cacheControlAnnotations?.forEach(cacheControl => {
              const ttl = cacheControl.maxAge * 1000;
              if (ttl != null) {
                ttlPerType[type.name] = ttl;
              }
              if (cacheControl.scope) {
                scopePerSchemaCoordinate[`${type.name}`] = cacheControl.scope;
              }
            });
            return type;
          },
          [MapperKind.FIELD]: (fieldConfig, fieldName, typeName) => {
            const cacheControlAnnotations = getDirective(schema, fieldConfig, 'cacheControl');
            cacheControlAnnotations?.forEach(cacheControl => {
              const ttl = cacheControl.maxAge * 1000;
              if (ttl != null) {
                ttlPerSchemaCoordinate[`${typeName}.${fieldName}`] = ttl;
              }
              if (cacheControl.scope) {
                scopePerSchemaCoordinate[`${typeName}.${fieldName}`] = cacheControl.scope;
              }
            });
            return fieldConfig;
          },
        });
      }
      processedSchemas.add(schema);
    },
    async onExecute(onExecuteParams) {
      const identifier = new Map<string, CacheEntityRecord>();
      const types = new Set<string>();

      const sessionId = session(onExecuteParams.args.contextValue);

      let currentTtl: number | undefined;
      let skip = false;

      function processResult(data: any) {
        if (data == null || typeof data !== 'object') {
          return;
        }
        if (Array.isArray(data)) {
          for (const item of data) {
            processResult(item);
          }
          return;
        }
        const typename = data.__responseCacheTypeName;
        delete data.__responseCacheTypeName;
        if (!skip) {
          if (
            ignoredTypesMap.has(typename) ||
            (scopePerSchemaCoordinate[typename] === 'PRIVATE' && !sessionId)
          ) {
            skip = true;
            return;
          }
          types.add(typename);
          if (typename in ttlPerType) {
            currentTtl = calculateTtl(ttlPerType[typename], currentTtl);
          }
          for (const fieldName in data) {
            if (scopePerSchemaCoordinate[`${typename}.${fieldName}`] === 'PRIVATE' && !sessionId) {
              skip = true;
            }
            if (!skip) {
              if (idFields.includes(fieldName)) {
                const id = data[fieldName];
                identifier.set(`${typename}:${id}`, { typename, id });
              }
            }
            processResult(data[fieldName]);
          }
        }
      }

      if (invalidateViaMutation !== false) {
        const operationAST = getOperationAST(
          onExecuteParams.args.document,
          onExecuteParams.args.operationName,
        );
        if (operationAST?.operation === 'mutation') {
          return {
            onExecuteDone({ result, setResult }) {
              if (isAsyncIterable(result)) {
                // eslint-disable-next-line no-console
                console.warn(
                  '[useResponseCache] AsyncIterable returned from execute is currently unsupported.',
                );
                return;
              }

              processResult(result.data);

              cache.invalidate(identifier.values());
              if (includeExtensionMetadata) {
                setResult(
                  resultWithMetadata(result, {
                    invalidatedEntities: Array.from(identifier.values()),
                  }),
                );
              }
            },
          };
        }
      }

      const cacheKey = await buildResponseCacheKey({
        documentString: getDocumentString(onExecuteParams.args),
        variableValues: onExecuteParams.args.variableValues,
        operationName: onExecuteParams.args.operationName,
        sessionId,
        context: onExecuteParams.args.contextValue,
      });

      if ((enabled?.(onExecuteParams.args.contextValue) ?? true) === true) {
        const cachedResponse = (await cache.get(cacheKey)) as ResponseCacheExecutionResult;

        if (cachedResponse != null) {
          if (includeExtensionMetadata) {
            onExecuteParams.setResultAndStopExecution(
              resultWithMetadata(cachedResponse, { hit: true }),
            );
          } else {
            onExecuteParams.setResultAndStopExecution(cachedResponse);
          }
          return;
        }
      }

      if (ttlPerSchemaCoordinate) {
        const typeInfo = new TypeInfo(onExecuteParams.args.schema);
        visit(
          onExecuteParams.args.document,
          visitWithTypeInfo(typeInfo, {
            Field(fieldNode) {
              const parentType = typeInfo.getParentType();
              if (parentType) {
                const schemaCoordinate = `${parentType.name}.${fieldNode.name.value}`;
                const maybeTtl = ttlPerSchemaCoordinate[schemaCoordinate];
                if (maybeTtl !== undefined) {
                  currentTtl = calculateTtl(maybeTtl, currentTtl);
                }
              }
            },
          }),
        );
      }

      async function maybeCacheResult(
        result: ExecutionResult,
        setResult: (newResult: ExecutionResult) => void,
      ) {
        processResult(result.data);
        // we only use the global ttl if no currentTtl has been determined.
        const finalTtl = currentTtl ?? globalTtl;

        if (skip || !shouldCacheResult({ cacheKey, result }) || finalTtl === 0) {
          if (includeExtensionMetadata) {
            setResult(resultWithMetadata(result, { hit: false, didCache: false }));
          }
          return;
        }

        cache.set(cacheKey, result, identifier.values(), finalTtl);
        if (includeExtensionMetadata) {
          setResult(resultWithMetadata(result, { hit: false, didCache: true, ttl: finalTtl }));
        }
      }

      return {
        onExecuteDone(payload) {
          if (!isAsyncIterable(payload.result)) {
            maybeCacheResult(payload.result, payload.setResult);
            return;
          }

          // When the result is an AsyncIterable, it means the query is using @defer or @stream.
          // This means we have to build the final result by merging the incremental results.
          // The merged result is then used to know if we should cache it and to calculate the ttl.
          let result: ExecutionResult = {};
          return {
            onNext(payload) {
              const { data, errors, extensions } = payload.result;

              if (data) {
                // This is the first result with the initial data payload sent to the client. We use it as the base result
                if (data) {
                  result = { data };
                }
                if (errors) {
                  result.errors = errors;
                }
                if (extensions) {
                  result.extensions = extensions;
                }
              }

              if ('hasNext' in payload.result) {
                const { incremental, hasNext } = payload.result;

                if (incremental) {
                  for (const patch of incremental) {
                    mergeIncrementalResult({ executionResult: result, incrementalResult: patch });
                  }
                }

                if (!hasNext) {
                  // The query is complete, we can process the final result
                  maybeCacheResult(result, payload.setResult);
                }
              }
            },
          };
        },
      };
    },
  };
}

export function resultWithMetadata(
  result: ExecutionResult,
  metadata: ResponseCacheExtensions,
): ResponseCacheExecutionResult {
  return {
    ...result,
    extensions: {
      ...result.extensions,
      responseCache: {
        ...(result as ResponseCacheExecutionResult).extensions?.responseCache,
        ...metadata,
      },
    },
  };
}

function calculateTtl(typeTtl: number, currentTtl: number | undefined): number {
  if (typeof currentTtl === 'number') {
    return Math.min(currentTtl, typeTtl);
  }
  return typeTtl;
}

export const cacheControlDirective = /* GraphQL */ `
  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }

  directive @cacheControl(maxAge: Int, scope: CacheControlScope) on FIELD_DEFINITION | OBJECT
`;
