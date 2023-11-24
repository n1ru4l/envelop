import jsonStableStringify from 'fast-json-stable-stringify';
import {
  ASTVisitor,
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
  OnExecuteDoneHookResult,
  OnExecuteEventPayload,
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

export function useResponseCache<PluginContext extends Record<string, any> = {}>(
  providedConfig: UseResponseCacheParameter<PluginContext>,
): Plugin<PluginContext> {
  const config: InternalContext<PluginContext>['config'] = {
    ttl: Infinity,
    idFields: ['id'],
    invalidateViaMutation: true,
    buildResponseCacheKey: defaultBuildResponseCacheKey,
    getDocumentString: defaultGetDocumentString,
    shouldCacheResult: defaultShouldCacheResult,
    includeExtensionMetadata:
      typeof process !== 'undefined'
        ? // eslint-disable-next-line dot-notation
          process.env['NODE_ENV'] === 'development' || !!process.env['DEBUG']
        : false,

    ...providedConfig,
  };

  let internalContext: InternalContext<PluginContext> = buildInternalContext(
    providedConfig,
    config,
  );

  const enabled = providedConfig.enabled && memoize1(providedConfig.enabled);

  const documentMetadataOptions = {
    queries: {
      invalidateViaMutation: config.invalidateViaMutation,
      ttlPerSchemaCoordinate: internalContext.ttlPerSchemaCoordinate,
    },
    mutations: { invalidateViaMutation: config.invalidateViaMutation }, // remove ttlPerSchemaCoordinate for mutations to skip TTL calculation
  };

  return {
    onSchemaChange({ schema }) {
      if (internalContext.schema === schema) {
        return;
      }
      // If the schema changed, we need to rebuild all internal tracking of ttl, scope and id fields.
      internalContext = buildInternalContext(providedConfig, config, schema);

      const cacheControlDirective = schema.getDirective('cacheControl');
      mapSchema(schema, {
        ...(cacheControlDirective && {
          [MapperKind.COMPOSITE_TYPE]: type => {
            const cacheControlAnnotations = getDirective(schema, type, 'cacheControl');
            cacheControlAnnotations?.forEach(cacheControl => {
              const ttl = cacheControl.maxAge * 1000;
              if (ttl != null) {
                internalContext.ttlPerType[type.name] = ttl;
              }
              if (cacheControl.scope) {
                internalContext.scopePerSchemaCoordinate[`${type.name}`] = cacheControl.scope;
              }
            });
            return type;
          },
        }),
        [MapperKind.FIELD]: (fieldConfig, fieldName, typeName) => {
          const schemaCoordinates = `${typeName}.${fieldName}`;
          const resultTypeNames = unwrapTypenames(fieldConfig.type);
          internalContext.typePerSchemaCoordinateMap.set(schemaCoordinates, resultTypeNames);

          if (
            config.idFields.includes(fieldName) &&
            !internalContext.idFieldByTypeName.has(typeName)
          ) {
            internalContext.idFieldByTypeName.set(typeName, fieldName);
          }

          if (cacheControlDirective) {
            const cacheControlAnnotations = getDirective(schema, fieldConfig, 'cacheControl');
            cacheControlAnnotations?.forEach(cacheControl => {
              const ttl = cacheControl.maxAge * 1000;
              if (ttl != null) {
                internalContext.ttlPerSchemaCoordinate[schemaCoordinates] = ttl;
              }
              if (cacheControl.scope) {
                internalContext.scopePerSchemaCoordinate[schemaCoordinates] = cacheControl.scope;
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
      const executionContext: ExecutionContext<PluginContext> = {
        internalContext,
        identifier: new Map<string, CacheEntityRecord>(),
        types: new Set<string>(),
        currentTtl: undefined as number | undefined,
        skip: false,
        sessionId: config.session(onExecuteParams.args.contextValue),
        params: onExecuteParams,
      };

      if (config.invalidateViaMutation !== false) {
        const operationAST = getOperationAST(
          onExecuteParams.args.document,
          onExecuteParams.args.operationName,
        );

        if (operationAST?.operation === 'mutation') {
          return setExecutor(executionContext, {
            execute(args) {
              const [document] = getDocumentWithMetadataAndTTL(
                args.document,
                documentMetadataOptions.mutations,
                internalContext.schema,
                internalContext.idFieldByTypeName,
              );
              return onExecuteParams.executeFn({ ...args, document });
            },
            onExecuteDone({ result, setResult }) {
              if (isAsyncIterable(result)) {
                return handleAsyncIterableResult(executionContext, invalidateCache);
              }

              return invalidateCache(executionContext, result, setResult);
            },
          });
        }
      }

      const cacheKey = await config.buildResponseCacheKey({
        documentString: config.getDocumentString(onExecuteParams.args),
        variableValues: onExecuteParams.args.variableValues,
        operationName: onExecuteParams.args.operationName,
        sessionId: executionContext.sessionId,
        context: onExecuteParams.args.contextValue,
      });

      const cachedResponse = (await internalContext.cache.get(
        cacheKey,
      )) as ResponseCacheExecutionResult;

      if (cachedResponse != null) {
        return setExecutor(executionContext, {
          execute: () =>
            config.includeExtensionMetadata
              ? resultWithMetadata(cachedResponse, { hit: true })
              : cachedResponse,
        });
      }

      return setExecutor(executionContext, {
        execute(args) {
          const [document, ttl] = getDocumentWithMetadataAndTTL(
            args.document,
            documentMetadataOptions.mutations,
            internalContext.schema,
            internalContext.idFieldByTypeName,
          );
          executionContext.currentTtl = ttl;
          return onExecuteParams.executeFn({ ...args, document });
        },
        onExecuteDone({ result, setResult }) {
          if (isAsyncIterable(result)) {
            return handleAsyncIterableResult({ executionContext, cacheKey }, maybeCacheResult);
          }

          return maybeCacheResult({ executionContext, cacheKey }, result, setResult);
        },
      });
    },
  };
}

type ExecutionContext<PluginContext> = {
  internalContext: InternalContext<PluginContext>;
  identifier: Map<string, CacheEntityRecord>;
  types: Set<string>;
  currentTtl: number | undefined;
  skip: boolean;
  sessionId: Maybe<string>;
  params: OnExecuteEventPayload<PluginContext>;
};

type InternalContext<PluginContext> = {
  ignoredTypesMap: Set<string>;
  typePerSchemaCoordinateMap: Map<string, string[]>;
  ttlPerType: Record<string, number>;
  ttlPerSchemaCoordinate: Record<string, number | undefined>;
  scopePerSchemaCoordinate: Record<string, 'PRIVATE' | 'PUBLIC' | undefined>;
  idFieldByTypeName: Map<string, string>;
  schema: any;
  cache: Cache;
  config: {
    ttl: number;
    session(context: PluginContext): string | undefined | null;
    idFields: Array<string>;
    invalidateViaMutation: boolean;
    buildResponseCacheKey: BuildResponseCacheKeyFunction;
    getDocumentString: GetDocumentStringFunction;
    includeExtensionMetadata: boolean;
    shouldCacheResult: ShouldCacheResultFunction;
  };
};

function buildInternalContext<PluginContext extends Record<string, string>>(
  providedConfig: UseResponseCacheParameter<PluginContext>,
  config: InternalContext<PluginContext>['config'],
  schema?: any,
): InternalContext<PluginContext> {
  return {
    cache: providedConfig.cache ?? createInMemoryCache(),
    ignoredTypesMap: new Set<string>(providedConfig.ignoredTypes ?? []),
    typePerSchemaCoordinateMap: new Map<string, string[]>(),
    idFieldByTypeName: new Map<string, string>(),
    ttlPerType: { ...providedConfig.ttlPerType },
    ttlPerSchemaCoordinate: { 'Query.__schema': 0, ...providedConfig.ttlPerSchemaCoordinate },
    scopePerSchemaCoordinate: { ...providedConfig.scopePerSchemaCoordinate },
    schema,
    config,
  };
}

const getDocumentWithMetadataAndTTL = memoize4(function getDocumentWithMetadataAndTTL(
  document: DocumentNode,
  {
    invalidateViaMutation,
    ttlPerSchemaCoordinate,
  }: {
    invalidateViaMutation: boolean;
    ttlPerSchemaCoordinate?: Record<string, number | undefined>;
  },
  schema: any,
  idFieldByTypeName: Map<string, string>,
): [DocumentNode, number | undefined] {
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
          if (maybeTtl !== undefined) {
            ttl = calculateTtl(maybeTtl, ttl);
          }
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

function setExecutor<PluginContext>(
  executionContext: ExecutionContext<PluginContext>,
  {
    execute,
    onExecuteDone,
  }: {
    execute: typeof executionContext.params.executeFn;
    onExecuteDone?: OnExecuteHookResult<PluginContext>['onExecuteDone'];
  },
): OnExecuteHookResult<PluginContext> {
  let executed = false;
  executionContext.params.setExecuteFn(args => {
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

function processResult<PluginContext>(
  executionContext: ExecutionContext<PluginContext>,
  data: any,
) {
  if (data == null || typeof data !== 'object') {
    return;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      processResult(executionContext, item);
    }
    return;
  }

  const { identifier, sessionId, types, internalContext } = executionContext;
  const { ignoredTypesMap, typePerSchemaCoordinateMap, ttlPerType } = internalContext;
  const typename = data.__responseCacheTypeName;
  delete data.__responseCacheTypeName;
  const entityId = data.__responseCacheId;
  delete data.__responseCacheId;

  // Always process nested objects, even if we are skipping cache, to ensure the result is cleaned up
  // of metadata fields added to the query document.
  for (const fieldName in data) {
    processResult(executionContext, data[fieldName]);
  }

  if (!executionContext.skip) {
    if (
      ignoredTypesMap.has(typename) ||
      (!sessionId && isPrivate(internalContext, typename, data))
    ) {
      executionContext.skip = true;
      return;
    }

    types.add(typename);
    if (typename in ttlPerType) {
      executionContext.currentTtl = calculateTtl(ttlPerType[typename], executionContext.currentTtl);
    }
    if (entityId != null) {
      identifier.set(`${typename}:${entityId}`, { typename, id: entityId });
    }
    for (const fieldName in data) {
      const fieldData = data[fieldName];
      if (fieldData == null || (Array.isArray(fieldData) && fieldData.length === 0)) {
        const inferredTypes = typePerSchemaCoordinateMap.get(`${typename}.${fieldName}`);
        inferredTypes?.forEach(inferredType => {
          identifier.set(inferredType, { typename: inferredType });
        });
      }
    }
  }
}

function isPrivate<PluginContext>(
  { scopePerSchemaCoordinate }: InternalContext<PluginContext>,
  typeName: string,
  data: Record<string, unknown>,
): boolean {
  if (scopePerSchemaCoordinate[typeName] === 'PRIVATE') {
    return true;
  }
  return Object.keys(data).some(
    fieldName => scopePerSchemaCoordinate[`${typeName}.${fieldName}`] === 'PRIVATE',
  );
}

function invalidateCache<PluginContext>(
  executionContext: ExecutionContext<PluginContext>,
  result: ExecutionResult,
  setResult: (newResult: ExecutionResult) => void,
): void {
  const {
    internalContext: {
      cache,
      config: { includeExtensionMetadata },
    },
  } = executionContext;
  processResult(executionContext, result.data);

  cache.invalidate(executionContext.identifier.values());
  if (includeExtensionMetadata) {
    setResult(
      resultWithMetadata(result, {
        invalidatedEntities: Array.from(executionContext.identifier.values()),
      }),
    );
  }
}

function maybeCacheResult<PluginContext>(
  {
    executionContext,
    cacheKey,
  }: { executionContext: ExecutionContext<PluginContext>; cacheKey: string },
  result: ExecutionResult,
  setResult: (newResult: ExecutionResult) => void,
) {
  processResult(executionContext, result.data);
  const { currentTtl, skip, identifier, internalContext } = executionContext;
  const {
    cache,
    config: { ttl: globalTtl, shouldCacheResult, includeExtensionMetadata },
  } = internalContext;
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

function handleAsyncIterableResult<T, PluginContext extends Record<string, any> = {}>(
  executionContext: T,
  handler: (
    executionContext: T,
    result: ExecutionResult,
    setResult: (newResult: ExecutionResult) => void,
  ) => void,
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
          handler(executionContext, result, payload.setResult);
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

function calculateTtl(typeTtl: number, currentTtl: number | undefined): number {
  if (typeof currentTtl === 'number') {
    return Math.min(currentTtl, typeTtl);
  }
  return typeTtl;
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
