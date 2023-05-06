/* eslint-disable no-console */
import { DocumentNode, ExecutionArgs, ExecutionResult } from 'graphql';
import { CompiledQuery, compileQuery, CompilerOptions, isCompiledQuery } from 'graphql-jit';
import {
  getDocumentString,
  makeExecute,
  makeSubscribe,
  Plugin,
  TypedExecutionArgs,
} from '@envelop/core';
import { LRUCache } from 'lru-cache';

const DEFAULT_MAX = 1000;
const DEFAULT_TTL = 3600000;

type JITCacheEntry = {
  query: CompiledQuery['query'];
  subscribe?: CompiledQuery['subscribe'];
};

export interface JITCache {
  get(key: string): JITCacheEntry | undefined;
  set(key: string, value: JITCacheEntry): void;
}

export const useGraphQlJit = (
  compilerOptions: Partial<CompilerOptions> = {},
  pluginOptions: {
    /**
     * A helper function that helps to conditionally enable JIT based on incoming request
     */
    enableIf?: (executionArgs: ExecutionArgs) => boolean | Promise<boolean>;
    /**
     * Callback triggered in case of GraphQL Jit compilation error.
     */
    onError?: (r: ExecutionResult) => void;
    /**
     * Custom cache instance
     */
    cache?: JITCache;
  } = {},
): Plugin => {
  const jitCacheByDocumentString =
    typeof pluginOptions.cache !== 'undefined'
      ? pluginOptions.cache
      : new LRUCache<string, JITCacheEntry>({ max: DEFAULT_MAX, ttl: DEFAULT_TTL });

  const jitCacheByDocument = new WeakMap<DocumentNode, JITCacheEntry>();

  function getCacheEntry<T>(args: TypedExecutionArgs<T>): JITCacheEntry {
    let cacheEntry: JITCacheEntry | undefined;

    cacheEntry = jitCacheByDocument.get(args.document);

    const documentSource = getDocumentString(args.document);

    if (!cacheEntry && documentSource) {
      cacheEntry = jitCacheByDocumentString.get(documentSource);
    }

    if (!cacheEntry) {
      const compilationResult = compileQuery(
        args.schema,
        args.document,
        args.operationName ?? undefined,
        compilerOptions,
      );

      if (!isCompiledQuery(compilationResult)) {
        if (pluginOptions?.onError) {
          pluginOptions.onError(compilationResult);
        } else {
          console.error(compilationResult);
        }
        cacheEntry = {
          query: () => compilationResult,
        };
      } else {
        cacheEntry = compilationResult;
      }

      jitCacheByDocument.set(args.document, cacheEntry);
      if (documentSource) {
        jitCacheByDocumentString.set(documentSource, cacheEntry);
      }
    }
    return cacheEntry;
  }

  return {
    async onExecute({ args, setExecuteFn }) {
      if (
        !pluginOptions.enableIf ||
        (pluginOptions.enableIf && (await pluginOptions.enableIf(args)))
      ) {
        setExecuteFn(
          makeExecute(function jitExecutor(args) {
            const cacheEntry = getCacheEntry(args as TypedExecutionArgs<unknown>);

            return cacheEntry.query(args.rootValue, args.contextValue, args.variableValues);
          }),
        );
      }
    },
    async onSubscribe({ args, setSubscribeFn }) {
      if (
        !pluginOptions.enableIf ||
        (pluginOptions.enableIf && (await pluginOptions.enableIf(args)))
      ) {
        setSubscribeFn(
          makeSubscribe(async function jitSubscriber(args) {
            const cacheEntry = getCacheEntry(args as TypedExecutionArgs<unknown>);

            return cacheEntry.subscribe
              ? (cacheEntry.subscribe(
                args.rootValue,
                args.contextValue,
                args.variableValues,
              ) as any)
              : cacheEntry.query(args.rootValue, args.contextValue, args.variableValues);
          }),
        );
      }
    },
  };
};
