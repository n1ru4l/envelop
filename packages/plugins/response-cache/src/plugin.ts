import jsonStableStringify from 'fast-json-stable-stringify';
import {
  ASTVisitor,
  DocumentNode,
  ExecutionArgs,
  getOperationAST,
  GraphQLSchema,
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
  OnExecuteDoneHookResult,
  OnExecuteHookResult,
  Plugin,
} from '@envelop/core';
import {
  getDirective,
  MapperKind,
  mapSchema,
  memoize1,
  memoize4,
  mergeIncrementalResult,
} from '@graphql-tools/utils';
import type { Cache, CacheEntityRecord } from './cache.js';
import { getScopeFromQuery } from './get-scope.js';
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
  /** Callback to get the scope */
  getScope: () => NonNullable<CacheControlDirective['scope']>;
}) => Promise<string>;

export type GetDocumentStringFunction = (executionArgs: ExecutionArgs) => string;

export type ShouldCacheResultFunction = (params: {
  cacheKey: string;
  result: ExecutionResult;
}) => boolean;

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
  ttlPerSchemaCoordinate?: Record<string, CacheControlDirective['maxAge']>;
  scopePerSchemaCoordinate?: Record<string, CacheControlDirective['scope']>;
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
   * raises any error is ignored.
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
export const defaultShouldCacheResult: ShouldCacheResultFunction = (params): boolean => {
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

const getDocumentWithMetadataAndTTL = memoize4(function addTypeNameToDocument(
  document: DocumentNode,
  {
    invalidateViaMutation,
    ttlPerSchemaCoordinate,
  }: {
    invalidateViaMutation: boolean;
    ttlPerSchemaCoordinate?: Record<string, CacheControlDirective['maxAge']>;
  },
  schema: GraphQLSchema,
  idFieldByTypeName: Map<string, string>,
): [DocumentNode, CacheControlDirective['maxAge']] {
  const typeInfo = new TypeInfo(schema);
  let ttl: number | undefined;
  const visitor: ASTVisitor = {
    OperationDefinition: {
      enter(node): void | false {
        if (!invalidateViaMutation && node.operation === 'mutation') {
          return false;
        }
        if (node.operation === 'subscription') {
          return false;
        }
      },
    },
    ...(ttlPerSchemaCoordinate != null && {
      Field(fieldNode) {
        const parentType = typeInfo.getParentType();
        if (parentType) {
          const schemaCoordinate = `${parentType.name}.${fieldNode.name.value}`;
          const maybeTtl = ttlPerSchemaCoordinate[schemaCoordinate];
          ttl = calculateTtl(maybeTtl, ttl);
        }
      },
    }),
    SelectionSet(node, _key) {
      const parentType = typeInfo.getParentType();
      const idField = parentType && idFieldByTypeName.get(parentType.name);
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
          ...(idField
            ? [
                {
                  kind: Kind.FIELD,
                  name: { kind: Kind.NAME, value: idField },
                  alias: { kind: Kind.NAME, value: '__responseCacheId' },
                },
              ]
            : []),

          ...node.selections,
        ],
      };
    },
  };

  return [visit(document, visitWithTypeInfo(typeInfo, visitor)), ttl];
});

export type CacheControlDirective = {
  maxAge?: number;
  scope?: 'PUBLIC' | 'PRIVATE';
};

export let schema: GraphQLSchema;
let ttlPerSchemaCoordinate: Record<string, CacheControlDirective['maxAge']> = {};
let scopePerSchemaCoordinate: Record<string, CacheControlDirective['scope']> = {};

export function isPrivate(
  typeName: string,
  data?: Record<string, NonNullable<CacheControlDirective['scope']>>,
): boolean {
  if (scopePerSchemaCoordinate[typeName] === 'PRIVATE') {
    return true;
  }
  return data
    ? Object.keys(data).some(
        fieldName => scopePerSchemaCoordinate[`${typeName}.${fieldName}`] === 'PRIVATE',
      )
    : false;
}

export function useResponseCache<PluginContext extends Record<string, any> = {}>({
  cache = createInMemoryCache(),
  ttl: globalTtl = Infinity,
  session,
  enabled,
  ignoredTypes = [],
  ttlPerType = {},
  ttlPerSchemaCoordinate: localTtlPerSchemaCoordinate = {},
  scopePerSchemaCoordinate: localScopePerSchemaCoordinate = {},
  idFields = ['id'],
  invalidateViaMutation = true,
  buildResponseCacheKey = defaultBuildResponseCacheKey,
  getDocumentString = defaultGetDocumentString,
  shouldCacheResult = defaultShouldCacheResult,
  includeExtensionMetadata = typeof process !== 'undefined'
    ? // eslint-disable-next-line dot-notation
      process.env['NODE_ENV'] === 'development' || !!process.env['DEBUG']
    : false,
}: UseResponseCacheParameter<PluginContext>): Plugin<PluginContext> {
  const ignoredTypesMap = new Set<string>(ignoredTypes);
  const typePerSchemaCoordinateMap = new Map<string, string[]>();
  enabled = enabled ? memoize1(enabled) : enabled;

  // never cache Introspections
  ttlPerSchemaCoordinate = { 'Query.__schema': 0, ...localTtlPerSchemaCoordinate };
  const documentMetadataOptions = {
    queries: { invalidateViaMutation, ttlPerSchemaCoordinate },
    mutations: { invalidateViaMutation }, // remove ttlPerSchemaCoordinate for mutations to skip TTL calculation
  };
  scopePerSchemaCoordinate = { ...localScopePerSchemaCoordinate };
  const idFieldByTypeName = new Map<string, string>();

  return {
    onSchemaChange({ schema: newSchema }) {
      if (schema === newSchema) {
        return;
      }
      schema = newSchema;

      const directive = schema.getDirective('cacheControl');

      mapSchema(schema, {
        ...(directive && {
          [MapperKind.COMPOSITE_TYPE]: type => {
            const cacheControlAnnotations = getDirective(
              schema,
              type,
              'cacheControl',
            ) as unknown as CacheControlDirective[] | undefined;
            cacheControlAnnotations?.forEach(cacheControl => {
              if (cacheControl.maxAge != null) {
                ttlPerType[type.name] = cacheControl.maxAge * 1000;
              }
              if (cacheControl.scope) {
                scopePerSchemaCoordinate[type.name] = cacheControl.scope;
              }
            });
            return type;
          },
        }),
        [MapperKind.FIELD]: (fieldConfig, fieldName, typeName) => {
          const schemaCoordinates = `${typeName}.${fieldName}`;
          const resultTypeNames = unwrapTypenames(fieldConfig.type);
          typePerSchemaCoordinateMap.set(schemaCoordinates, resultTypeNames);

          if (idFields.includes(fieldName) && !idFieldByTypeName.has(typeName)) {
            idFieldByTypeName.set(typeName, fieldName);
          }

          if (directive) {
            const cacheControlAnnotations = getDirective(
              schema,
              fieldConfig,
              'cacheControl',
            ) as unknown as CacheControlDirective[] | undefined;
            cacheControlAnnotations?.forEach(cacheControl => {
              if (cacheControl.maxAge != null) {
                ttlPerSchemaCoordinate[schemaCoordinates] = cacheControl.maxAge * 1000;
              }
              if (cacheControl.scope) {
                scopePerSchemaCoordinate[schemaCoordinates] = cacheControl.scope;
              }
            });
          }
          return fieldConfig;
        },
      });
    },
    async onExecute(onExecuteParams) {
      if (enabled && !enabled(onExecuteParams.args.contextValue)) {
        return;
      }
      const identifier = new Map<string, CacheEntityRecord>();
      const types = new Set<string>();
      let currentTtl: number | undefined;
      let skip = false;

      const sessionId = session(onExecuteParams.args.contextValue);

      function setExecutor({
        execute,
        onExecuteDone,
      }: {
        execute: typeof onExecuteParams.executeFn;
        onExecuteDone?: OnExecuteHookResult<PluginContext>['onExecuteDone'];
      }): OnExecuteHookResult<PluginContext> {
        let executed = false;
        onExecuteParams.setExecuteFn(args => {
          executed = true;
          return execute(args);
        });
        return {
          onExecuteDone(params) {
            if (!executed) {
              // eslint-disable-next-line no-console
              console.warn(
                '[useResponseCache] The cached execute function was not called, another plugin might have overwritten it. Please check your plugin order.',
              );
            }
            return onExecuteDone?.(params);
          },
        };
      }

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
        const entityId = data.__responseCacheId;
        delete data.__responseCacheId;

        // Always process nested objects, even if we are skipping cache, to ensure the result is cleaned up
        // of metadata fields added to the query document.
        for (const fieldName in data) {
          processResult(data[fieldName]);
        }

        if (!skip) {
          if (ignoredTypesMap.has(typename) || (!sessionId && isPrivate(typename, data))) {
            skip = true;
            return;
          }

          types.add(typename);
          if (typename in ttlPerType) {
            const maybeTtl = ttlPerType[typename] as unknown;
            currentTtl = calculateTtl(maybeTtl, currentTtl);
          }
          if (entityId != null) {
            identifier.set(`${typename}:${entityId}`, { typename, id: entityId });
          }
          for (const fieldName in data) {
            const fieldData = data[fieldName];
            if (fieldData == null || (Array.isArray(fieldData) && fieldData.length === 0)) {
              const inferredTypes = typePerSchemaCoordinateMap.get(`${typename}.${fieldName}`);
              inferredTypes?.forEach(inferredType => {
                if (inferredType in ttlPerType) {
                  const maybeTtl = ttlPerType[inferredType] as unknown;
                  currentTtl = calculateTtl(maybeTtl, currentTtl);
                }
                identifier.set(inferredType, { typename: inferredType });
              });
            }
          }
        }
      }

      function invalidateCache(
        result: ExecutionResult,
        setResult: (newResult: ExecutionResult) => void,
      ): void {
        processResult(result.data);

        cache.invalidate(identifier.values());
        if (includeExtensionMetadata) {
          setResult(
            resultWithMetadata(result, {
              invalidatedEntities: Array.from(identifier.values()),
            }),
          );
        }
      }

      if (invalidateViaMutation !== false) {
        const operationAST = getOperationAST(
          onExecuteParams.args.document,
          onExecuteParams.args.operationName,
        );

        if (operationAST?.operation === 'mutation') {
          return setExecutor({
            execute(args) {
              const [document] = getDocumentWithMetadataAndTTL(
                args.document,
                documentMetadataOptions.mutations,
                args.schema,
                idFieldByTypeName,
              );
              return onExecuteParams.executeFn({ ...args, document });
            },
            onExecuteDone({ result, setResult }) {
              if (isAsyncIterable(result)) {
                return handleAsyncIterableResult(invalidateCache);
              }

              return invalidateCache(result, setResult);
            },
          });
        }
      }

      const cacheKey = await buildResponseCacheKey({
        documentString: getDocumentString(onExecuteParams.args),
        variableValues: onExecuteParams.args.variableValues,
        operationName: onExecuteParams.args.operationName,
        sessionId,
        context: onExecuteParams.args.contextValue,
        getScope: () => getScopeFromQuery(schema, onExecuteParams.args.document.loc.source.body),
      });

      const cachedResponse = (await cache.get(cacheKey)) as ResponseCacheExecutionResult;

      if (cachedResponse != null) {
        return setExecutor({
          execute: () =>
            includeExtensionMetadata
              ? resultWithMetadata(cachedResponse, { hit: true })
              : cachedResponse,
        });
      }

      function maybeCacheResult(
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

      return setExecutor({
        execute(args) {
          const [document, ttl] = getDocumentWithMetadataAndTTL(
            args.document,
            documentMetadataOptions.queries,
            schema,
            idFieldByTypeName,
          );
          currentTtl = ttl;
          return onExecuteParams.executeFn({ ...args, document });
        },
        onExecuteDone({ result, setResult }) {
          if (isAsyncIterable(result)) {
            return handleAsyncIterableResult(maybeCacheResult);
          }

          return maybeCacheResult(result, setResult);
        },
      });
    },
  };
}

function handleAsyncIterableResult<PluginContext extends Record<string, any> = {}>(
  handler: (result: ExecutionResult, setResult: (newResult: ExecutionResult) => void) => void,
): OnExecuteDoneHookResult<PluginContext> {
  // When the result is an AsyncIterable, it means the query is using @defer or @stream.
  // This means we have to build the final result by merging the incremental results.
  // The merged result is then used to know if we should cache it and to calculate the ttl.
  const result: ExecutionResult = {};
  return {
    onNext(payload) {
      const { data, errors, extensions } = payload.result;

      // This is the first result with the initial data payload sent to the client. We use it as the base result
      if (data) {
        result.data = data;
      }
      if (errors) {
        result.errors = errors;
      }
      if (extensions) {
        result.extensions = extensions;
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
          handler(result, payload.setResult);
        }
      }
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

function calculateTtl(typeTtl: unknown, currentTtl: number | undefined): number | undefined {
  if (typeof typeTtl === 'number' && !Number.isNaN(typeTtl)) {
    if (typeof currentTtl === 'number') {
      return Math.min(currentTtl, typeTtl);
    }
    return typeTtl;
  }
  return currentTtl;
}

function unwrapTypenames(type: any): string[] {
  if (type.ofType) {
    return unwrapTypenames(type.ofType);
  }
  if (type._types) {
    return type._types.map((t: any) => unwrapTypenames(t)).flat();
  }
  return [type.name];
}

export const cacheControlDirective = /* GraphQL */ `
  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }

  directive @cacheControl(maxAge: Int, scope: CacheControlScope) on FIELD_DEFINITION | OBJECT
`;
