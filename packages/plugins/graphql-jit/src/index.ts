/* eslint-disable no-console */
import { DocumentNode, ExecutionArgs, ExecutionResult } from 'graphql';
import { CompiledQuery, compileQuery, CompilerOptions, isCompiledQuery } from 'graphql-jit';
import { LRUCache } from 'lru-cache';
import {
  getDocumentString,
  makeExecute,
  makeSubscribe,
  Plugin,
  PromiseOrValue,
  TypedExecutionArgs,
} from '@envelop/core';

const DEFAULT_MAX = 1000;
const DEFAULT_TTL = 3600000;

type JSONStringifier = (result: any) => string;

type JITCacheEntry = {
  query: CompiledQuery['query'];
  subscribe?: CompiledQuery['subscribe'];
  stringify: JSONStringifier;
};

export type ExecutionResultWithSerializer = ExecutionResult & {
  stringify?: JSONStringifier;
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
    onError?: (r: ExecutionResultWithSerializer) => void;
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
          stringify: r => JSON.stringify(r),
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

            const result$ = cacheEntry.query(
              args.rootValue,
              args.contextValue,
              args.variableValues,
            ) as PromiseOrValue<ExecutionResultWithSerializer>;

            if (isPromise(result$)) {
              return result$.then(r => {
                r.stringify = cacheEntry.stringify;
                return r;
              });
            }
            result$.stringify = cacheEntry.stringify;
            return result$;
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

            const result$ = cacheEntry.subscribe
              ? (cacheEntry.subscribe(
                  args.rootValue,
                  args.contextValue,
                  args.variableValues,
                ) as PromiseOrValue<ExecutionResultWithSerializer>)
              : (cacheEntry.query(
                  args.rootValue,
                  args.contextValue,
                  args.variableValues,
                ) as PromiseOrValue<ExecutionResultWithSerializer>);
            if (isPromise(result$)) {
              return result$.then(r => {
                r.stringify = cacheEntry.stringify;
                return r;
              });
            }
            result$.stringify = cacheEntry.stringify;
            return result$;
          }),
        );
      }
    },
  };
};

function isPromise<T>(p: T | Promise<T>): p is Promise<T> {
  return (p as any)?.then != null;
}
